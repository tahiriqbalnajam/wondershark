<?php

namespace App\Http\Controllers\Brand;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessBrandPromptAnalysis;
use App\Models\Brand;
use App\Models\BrandPrompt;
use App\Services\AiModelDistributionService;
use App\Services\AIPromptService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class BrandPromptController extends Controller
{
    public function index(Brand $brand)
    {
        // Check if user has access to this brand
        if (! Auth::user()->canAccessBrand($brand)) {
            abort(403);
        }

        $prompts = $brand->prompts()
            ->orderBy('order')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($prompt) {
                return [
                    'id' => $prompt->id,
                    'prompt' => $prompt->prompt,
                    'position' => $prompt->position ?? 0,
                    'sentiment' => $prompt->sentiment ?? 'neutral',
                    'visibility' => $prompt->visibility ?? 'public',
                    'country_code' => $prompt->country_code ?? 'US',
                    'is_active' => $prompt->is_active,
                    'status' => $prompt->status ?? 'suggested', // Add status field
                    'session_id' => $prompt->session_id,
                    'created_at' => $prompt->created_at,
                    'days_ago' => $prompt->created_at->diffInDays(now()),
                ];
            });

        return Inertia::render('brands/prompts/index', [
            'brand' => [
                'id' => $brand->id,
                'name' => $brand->name,
                'website' => $brand->website,
                'description' => $brand->description,
                'country' => $brand->country,
            ],
            'prompts' => $prompts,
        ]);
    }

    public function store(Request $request, Brand $brand)
    {
        // Check if user has access to this brand
        if (! Auth::user()->canAccessBrand($brand)) {
            abort(403);
        }

        $request->validate([
            'prompt' => 'required|string|max:2000',
            'is_active' => 'sometimes|boolean',
            'country_code' => 'sometimes|string|size:2',
        ]);

        // Check if trying to add an active prompt and already have 10 active
        $isActive = $request->is_active ?? true;
        if ($isActive) {
            $activeCount = BrandPrompt::where('brand_id', $brand->id)
                ->where('is_active', true)
                ->count();

            if ($activeCount >= 25) {
                return redirect()->back()->withErrors(['error' => 'You’ve reached the limit of 25 tracked prompts. Please remove one before adding a new one.']);
            }
        }

        BrandPrompt::create([
            'brand_id' => $brand->id,
            'prompt' => $request->prompt,
            'is_active' => $isActive,
            'status' => $isActive ? 'active' : 'suggested',
            'country_code' => $request->country_code ?? 'US',
        ]);

        $message = 'Prompt added successfully.';

        // Trigger immediate analysis and recalculation ONLY if the prompt is active
        if ($isActive) {
            try {
                \Illuminate\Support\Facades\Artisan::call('brand:analyze-prompts', [
                    '--brand' => [$brand->id],
                    '--force' => true,
                ]);
                
                \Illuminate\Support\Facades\Artisan::call('brand:recalculate-visibility', [
                    '--brand' => $brand->id,
                    '--regenerate' => true,
                ]);

                $message .= ' System is re-analyzing prompts and recalculating visibility.';
            } catch (\Exception $e) {
                Log::error('Failed to trigger immediate analysis', [
                    'brand_id' => $brand->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return redirect()->back()->with('success', $message);
    }

    public function update(Request $request, Brand $brand, BrandPrompt $prompt)
    {
        // Check if user has access to this brand
        if (! Auth::user()->canAccessBrand($brand)) {
            abort(403);
        }

        // Check if prompt belongs to this brand
        if ($prompt->brand_id !== $brand->id) {
            abort(404);
        }

        $request->validate([
            'position' => 'sometimes|integer|min:0',
            'sentiment' => 'sometimes|in:positive,neutral,negative',
            'visibility' => 'sometimes|in:public,private,draft',
            'is_active' => 'sometimes|boolean',
        ]);

        $data = $request->only(['position', 'sentiment', 'visibility', 'is_active']);
        $wasActive = $prompt->is_active;
        $becomingActive = false;

        // If trying to activate a prompt, check if brand already has 25 active prompts
        if (isset($data['is_active']) && $data['is_active'] === true && ! $prompt->is_active) {
            $activeCount = BrandPrompt::where('brand_id', $brand->id)
                ->where('is_active', true)
                ->count();

            if ($activeCount >= 25) {
                return redirect()->back()->withErrors(['error' => 'You’ve reached the limit of 25 tracked prompts. Please remove one before adding a new one.']);
            }

            $data['status'] = 'active';
            $becomingActive = true;
        } elseif (isset($data['is_active']) && $data['is_active'] === false) {
            $data['status'] = 'inactive';
        }

        $prompt->update($data);

        $message = 'Prompt updated successfully.';

        // Trigger analysis if it was active, is becoming active, or stays active
        // Basically if it involves an active prompt in any way
        if ($wasActive || $becomingActive || (isset($data['is_active']) && $data['is_active'])) {
            try {
                \Illuminate\Support\Facades\Artisan::call('brand:analyze-prompts', [
                    '--brand' => [$brand->id],
                    '--force' => true,
                ]);
                
                \Illuminate\Support\Facades\Artisan::call('brand:recalculate-visibility', [
                    '--brand' => $brand->id,
                    '--regenerate' => true,
                ]);

                $message .= ' System is re-analyzing prompts and recalculating visibility.';
            } catch (\Exception $e) {
                Log::error('Failed to trigger immediate analysis', [
                    'brand_id' => $brand->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return redirect()->back()->with('success', $message);
    }

    public function destroy(Brand $brand, BrandPrompt $prompt)
    {
        // Check if user has access to this brand
        if (! Auth::user()->canAccessBrand($brand)) {
            abort(403);
        }

        // Check if prompt belongs to this brand
        if ($prompt->brand_id !== $brand->id) {
            abort(404);
        }

        $wasActive = $prompt->is_active;
        $prompt->delete();

        $message = 'Prompt deleted successfully.';

        // Trigger immediate analysis and recalculation ONLY if the deleted prompt was active
        if ($wasActive) {
            try {
                \Illuminate\Support\Facades\Artisan::call('brand:analyze-prompts', [
                    '--brand' => [$brand->id],
                    '--force' => true,
                ]);
                
                \Illuminate\Support\Facades\Artisan::call('brand:recalculate-visibility', [
                    '--brand' => $brand->id,
                    '--regenerate' => true,
                ]);
                
                $message .= ' System is re-analyzing prompts and recalculating visibility.';
            } catch (\Exception $e) {
                Log::error('Failed to trigger immediate analysis', [
                    'brand_id' => $brand->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return redirect()->back()->with('success', $message);
    }

    public function bulkUpdate(Request $request, Brand $brand)
    {
        // Check if user has access to this brand
        if (! Auth::user()->canAccessBrand($brand)) {
            abort(403);
        }

        $request->validate([
            'prompt_ids' => 'required|array',
            'prompt_ids.*' => 'exists:brand_prompts,id',
            'action' => 'required|in:activate,deactivate,delete,set_visibility,set_sentiment',
            'value' => 'sometimes|string',
        ]);

        // For activate action, check total active prompts won't exceed 10
        if ($request->action === 'activate') {
            $currentActiveCount = BrandPrompt::where('brand_id', $brand->id)
                ->where('is_active', true)
                ->count();

            // Count how many we're trying to activate that aren't already active
            $newActivations = BrandPrompt::whereIn('id', $request->prompt_ids)
                ->where('brand_id', $brand->id)
                ->where('is_active', false)
                ->count();

            if ($currentActiveCount + $newActivations > 25) {
                return redirect()->back()->withErrors(['error' => 'You can only have a maximum of 25 active prompts. Currently have '.$currentActiveCount.' active.']);
            }
        }

        $prompts = BrandPrompt::whereIn('id', $request->prompt_ids)
            ->where('brand_id', $brand->id)
            ->get();
            
        $shouldTriggerAnalysis = false;

        foreach ($prompts as $prompt) {
            // Check if this operation affects an active prompt
            if ($prompt->is_active) {
                // If we are deleting or deactivating an active prompt, or modifying it
                $shouldTriggerAnalysis = true;
            }
            
            switch ($request->action) {
                case 'activate':
                    $prompt->update(['is_active' => true, 'status' => 'active']);
                    // Activating a prompt should trigger analysis
                    $shouldTriggerAnalysis = true;
                    break;
                case 'deactivate':
                    $prompt->update(['is_active' => false, 'status' => 'inactive']);
                    break;
                case 'delete':
                    $prompt->delete();
                    break;
                case 'set_visibility':
                    if (in_array($request->value, ['public', 'private', 'draft'])) {
                        $prompt->update(['visibility' => $request->value]);
                    }
                    break;
                case 'set_sentiment':
                    if (in_array($request->value, ['positive', 'neutral', 'negative'])) {
                        $prompt->update(['sentiment' => $request->value]);
                    }
                    break;
            }
        }

        $message = 'Prompts updated successfully.';

        // Trigger immediate analysis and recalculation if needed
        if ($shouldTriggerAnalysis) {
            try {
                \Illuminate\Support\Facades\Artisan::call('brand:analyze-prompts', [
                    '--brand' => [$brand->id],
                    '--force' => true,
                ]);
                
                \Illuminate\Support\Facades\Artisan::call('brand:recalculate-visibility', [
                    '--brand' => $brand->id,
                    '--regenerate' => true,
                ]);
                
                $message .= ' System is re-analyzing prompts and recalculating visibility.';
            } catch (\Exception $e) {
                Log::error('Failed to trigger immediate analysis', [
                    'brand_id' => $brand->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return redirect()->back()->with('success', $message);
    }

    public function generateAI(Request $request, Brand $brand)
    {
        Log::info('generateAI called', [
            'brand_id' => $brand->id,
            'user_id' => Auth::id(),
            'method' => $request->method(),
            'path' => $request->path(),
        ]);

        // Check if user has access to this brand
        if (! Auth::user()->canAccessBrand($brand)) {
            Log::warning('Unauthorized access attempt', [
                'brand_id' => $brand->id,
                'brand_agency_id' => $brand->agency_id,
                'user_id' => Auth::id(),
            ]);
            abort(403);
        }

        // Check if brand has required information
        if (! $brand->website) {
            Log::warning('Brand missing website', ['brand_id' => $brand->id]);

            return redirect()->back()->with('error', 'Brand must have a website to generate AI prompts.');
        }

        Log::info('Brand has website', ['website' => $brand->website]);

        $aiService = app(AIPromptService::class);
        $availableProviders = array_keys($aiService->getAvailableProviders());

        Log::info('Available providers', ['providers' => $availableProviders]);

        // If no providers available, return error
        if (empty($availableProviders)) {
            Log::warning('No AI providers available');

            return redirect()->back()->with('error', 'No AI providers are configured. Please check your settings.');
        }

        $request->validate([
            'ai_provider' => 'sometimes|string|in:'.implode(',', $availableProviders),
            'count' => 'sometimes|integer|min:1|max:20',
        ]);

        Log::info('Validation passed');

        try {
            Log::info('Entered try block');

            $sessionId = session()->getId();
            Log::info('Got session ID', ['session_id' => $sessionId]);

            // Get the first available provider name (the first value in the array)
            $defaultProvider = ! empty($availableProviders) ? $availableProviders[0] : null;
            Log::info('Default provider', ['provider' => $defaultProvider]);

            if (! $defaultProvider) {
                Log::warning('No default provider found');

                return redirect()->back()->with('error', 'No AI providers are available. Please enable at least one AI model.');
            }

            $aiProvider = $request->input('ai_provider', $defaultProvider);
            $count = $request->input('count', 10);

            Log::info('Starting AI prompt generation', [
                'brand_id' => $brand->id,
                'website' => $brand->website,
                'ai_provider' => $aiProvider,
                'available_providers' => $availableProviders,
                'count' => $count,
            ]);

            // Generate prompts using AI
            $generatedPrompts = $aiService->generatePromptsForWebsite(
                $brand->website,
                $sessionId,
                $aiProvider,
                $brand->description ?? ''
            );

            // Get distribution service
            $distributionService = app(AiModelDistributionService::class);

            // Distribute AI models across prompts
            // Strategy options: 'weighted', 'round_robin', 'random', 'performance_based'
            $modelDistribution = $distributionService->distributeModelsForPrompts(
                min($count, count($generatedPrompts)),
                AiModelDistributionService::STRATEGY_WEIGHTED, // Change this to use different strategy
                $sessionId
            );

            // Create BrandPrompt records and dispatch analysis jobs
            $brandPrompts = [];
            foreach ($generatedPrompts as $index => $genPrompt) {
                $brandPrompt = BrandPrompt::create([
                    'brand_id' => $brand->id,
                    'prompt' => $genPrompt->prompt,
                    'is_active' => false, // Suggested prompts start as inactive
                    'session_id' => $sessionId,
                    'order' => $index + 1,
                ]);

                // Get assigned AI model for this prompt
                $assignedModel = $modelDistribution[$index] ?? $aiProvider;

                // Dispatch analysis job with specific AI model
                ProcessBrandPromptAnalysis::dispatch($brandPrompt, $sessionId, false, $assignedModel);

                $brandPrompts[] = $brandPrompt;

                if (count($brandPrompts) >= $count) {
                    break;
                }
            }

            // Get distribution stats for logging
            $distributionStats = $distributionService->getDistributionStats($sessionId);

            Log::info('Generated AI prompts for brand', [
                'brand_id' => $brand->id,
                'count' => count($brandPrompts),
                'ai_provider_used_for_generation' => $aiProvider,
                'analysis_distribution' => $distributionStats,
            ]);

            // Note: AI generated prompts are inactive by default, so we generally don't trigger analysis unless requested?
            // The original logic triggered it for all generated prompts, but they are inactive.
            // If the user wants to keep logic consistent, inactive prompts are skipped by `brand:analyze-prompts` anyway.
            // However, the `ProcessBrandPromptAnalysis` dispatched above handles the *initial* analysis for these prompts regardless of active status?
            // Actually, `ProcessBrandPromptAnalysis` job might check for active status or just run.
            // If `brand:analyze-prompts` command filters for `is_active=true` (which it does based on previous read), then running the command here won't do anything for these new inactive prompts.
            // But `ProcessBrandPromptAnalysis::dispatch` is already called for each prompt above.
            
            // So we don't need to run the console command here because the prompts are inactive.
            // And recalculating visibility is not needed for inactive prompts.
            
            return redirect()->back()->with('success', count($brandPrompts).' AI prompts generated successfully.');

        } catch (\Exception $e) {
            Log::error('Failed to generate AI prompts for brand', [
                'brand_id' => $brand->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->back()->with('error', 'Failed to generate prompts: '.$e->getMessage());
        }
    }
}
