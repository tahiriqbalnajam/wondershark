<?php

namespace App\Jobs;

use App\Models\Post;
use App\Services\PostPromptService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class GenerateAdditionalPostPromptsJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public int $tries = 3;

    public function __construct(
        public Post $post,
        public int $target,
        public string $sessionId,
    ) {}

    public function handle(PostPromptService $postPromptService): void
    {
        try {
            $post = $this->post->load(['brand', 'prompts']);

            $brand = $post->brand;
            $brandUser = $brand ? \App\Models\User::find($brand->user_id ?? $brand->agency_id) : null;
            if ($brandUser && ! $brandUser->canProcessAnalysis()) {
                Log::info('Skipping additional prompt generation — trial expired, no active subscription', [
                    'post_id' => $post->id,
                    'user_id' => $brandUser->id,
                ]);

                return;
            }

            $currentCount = $post->prompts->count();

            // Check if post title already exists as a prompt via DB query (more reliable than collection check)
            $titlePromptExists = false;
            if (! empty($post->title)) {
                $existingTitlePrompt = \App\Models\PostPrompt::forPost($post->id)
                    ->whereRaw('LOWER(prompt) = ?', [strtolower(trim($post->title))])
                    ->first();
                $titlePromptExists = $existingTitlePrompt !== null;
            }

            $needsTitle = ! empty($post->title) && ! $titlePromptExists;
            $aiNeeded = max(0, $this->target - $currentCount - ($needsTitle ? 1 : 0));

            if ($aiNeeded <= 0 && ! $needsTitle) {
                Log::info("Post #{$post->id} already has {$currentCount} prompts. Skipping.", [
                    'post_id' => $post->id,
                ]);

                return;
            }

            $totalToCreate = $aiNeeded + ($needsTitle ? 1 : 0);
            Log::info("Post #{$post->id} has {$currentCount} prompts, generating {$totalToCreate} more...", [
                'post_id' => $post->id,
                'current_count' => $currentCount,
                'target' => $this->target,
                'ai_needed' => $aiNeeded,
                'needs_title' => $needsTitle,
            ]);

            $description = $post->description ?? '';
            $aiModels = $postPromptService->getEnabledAiModels();

            if ($aiModels->isEmpty()) {
                Log::warning('No enabled AI models found', ['post_id' => $post->id]);

                return;
            }

            $newPrompts = [];

            if ($aiNeeded > 0) {
                $modelList = $aiModels->values();
                $modelCount = $modelList->count();
                $generatedByModel = collect();

                for ($i = 0; $i < $aiNeeded; $i++) {
                    $model = $modelList[$i % $modelCount];
                    try {
                        $batch = $postPromptService->generatePromptsForPost(
                            $post,
                            $this->sessionId,
                            $model->name,
                            $description,
                            1
                        );
                        if (! empty($batch)) {
                            $generatedByModel->push([
                                'model' => $model,
                                'prompt' => $batch[0],
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::warning('Round-robin prompt generation failed', [
                            'post_id' => $post->id,
                            'model' => $model->name,
                            'round' => $i + 1,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                $grouped = $generatedByModel->groupBy('model.id')->map->values();
                $interleaved = [];
                $maxGroupSize = $grouped->map->count()->max() ?? 0;

                for ($round = 0; $round < $maxGroupSize; $round++) {
                    foreach ($grouped as $items) {
                        if (isset($items[$round])) {
                            $interleaved[] = $items[$round]['prompt'];
                        }
                    }
                }

                foreach ($interleaved as $idx => $prompt) {
                    $prompt->update(['order' => $idx + 1]);
                }

                $newPrompts = $interleaved;

                foreach ($modelList as $model) {
                    $count = $generatedByModel->where('model.id', $model->id)->count();
                    if ($count > 0) {
                        Log::info("  -> {$model->display_name}: {$count} prompts", [
                            'post_id' => $post->id,
                            'model' => $model->name,
                            'count' => $count,
                        ]);
                    }
                }
            }

            if ($needsTitle) {
                $countryCode = $post->brand->country_code ?? null;
                if ($countryCode && strlen($countryCode) > 2) {
                    $countryCode = substr($countryCode, 0, 2);
                }

                $firstModel = $aiModels->first();

                $titlePrompt = \App\Models\PostPrompt::create([
                    'brand_id' => $post->brand_id,
                    'post_id' => $post->id,
                    'session_id' => $this->sessionId,
                    'prompt' => trim($post->title),
                    'source' => 'ai_generated',
                    'ai_provider' => $firstModel?->name ?? 'system',
                    'ai_model_id' => $firstModel?->id ?? null,
                    'order' => 0,
                    'is_selected' => true,
                    'is_active' => true,
                    'country_code' => $countryCode,
                    'position' => 0,
                    'sentiment' => 0,
                    'visibility' => 0,
                    'volume' => 'low',
                    'location' => $post->brand->country_code ?? null,
                    'status' => 'suggested',
                ]);

                $newPrompts[] = $titlePrompt;
                Log::info("  -> Created title prompt for post #{$post->id}", [
                    'post_id' => $post->id,
                    'model' => $firstModel?->display_name ?? 'system',
                ]);

                // Analyze title prompt stats immediately (mirrors what generatePromptsForPost does for AI prompts)
                try {
                    $stats = $postPromptService->analyzePromptStatsWithAI($titlePrompt, $post, $firstModel?->name ?? 'openai');
                    $titlePrompt->update([
                        'visibility' => $stats['visibility'],
                        'position' => $stats['position'],
                        'sentiment' => $stats['sentiment'],
                        'volume' => $stats['volume'],
                        'analysis_completed_at' => now(),
                        'analysis_failed_at' => null,
                        'analysis_error' => null,
                    ]);

                    if (! empty($stats['referrers'])) {
                        $postPromptService->saveReferrersAsCitations($post, $titlePrompt, $stats['referrers'], $firstModel?->name ?? 'openai');
                    }

                    Log::info('Title prompt stats analyzed and saved', [
                        'prompt_id' => $titlePrompt->id,
                        'stats' => $stats,
                    ]);
                } catch (\Exception $e) {
                    Log::warning('Failed to analyze title prompt stats during generation', [
                        'prompt_id' => $titlePrompt->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            Log::info("Generated " . count($newPrompts) . " new prompts for post #{$post->id}", [
                'post_id' => $post->id,
                'prompts_generated' => count($newPrompts),
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to generate additional prompts for post #{$this->post->id}", [
                'post_id' => $this->post->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('GenerateAdditionalPostPromptsJob failed permanently', [
            'post_id' => $this->post->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
