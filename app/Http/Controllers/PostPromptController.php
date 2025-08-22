<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostPrompt;
use App\Services\PostPromptService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PostPromptController extends Controller
{
    protected PostPromptService $postPromptService;

    public function __construct(PostPromptService $postPromptService)
    {
        $this->postPromptService = $postPromptService;
    }

    /**
     * Show the prompt management interface for a post
     */
    public function index(Post $post)
    {
        $user = Auth::user();
        
        // Check if user owns this post or has access through their agency
        if ($post->user_id !== $user->id && $post->brand->agency_id !== $user->id) {
            abort(403, 'You do not have permission to manage prompts for this post.');
        }

        // Get all prompts for this post
        $prompts = PostPrompt::where('post_id', $post->id)
            ->orderBy('is_selected', 'desc')
            ->orderBy('ai_provider')
            ->orderBy('order')
            ->get()
            ->map(function ($prompt) {
                return [
                    'id' => $prompt->id,
                    'prompt' => $prompt->prompt,
                    'source' => $prompt->source,
                    'ai_provider' => $prompt->ai_provider,
                    'is_selected' => $prompt->is_selected,
                    'order' => $prompt->order,
                    'created_at' => $prompt->created_at->format('Y-m-d H:i:s'),
                ];
            });

        // Get counts
        $stats = [
            'total_prompts' => $prompts->count(),
            'selected_prompts' => $prompts->where('is_selected', true)->count(),
            'ai_generated' => $prompts->where('source', 'ai_generated')->count(),
            'user_added' => $prompts->where('source', 'user_added')->count(),
        ];

        // Group prompts by AI provider for better organization
        $promptsByProvider = $prompts->groupBy('ai_provider');

        return Inertia::render('posts/prompts/index', [
            'post' => [
                'id' => $post->id,
                'title' => $post->title,
                'url' => $post->url,
                'description' => $post->description,
                'brand' => [
                    'id' => $post->brand->id,
                    'name' => $post->brand->name,
                ],
            ],
            'prompts' => $prompts,
            'promptsByProvider' => $promptsByProvider,
            'stats' => $stats,
            'availableProviders' => $this->postPromptService->getAvailableProviders(),
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /**
     * Generate prompts for a post
     */
    public function generatePrompts(Request $request, Post $post)
    {
        $request->validate([
            'description' => 'nullable|string|max:1000',
        ]);

        try {
            $sessionId = session()->getId();
            
            // Check if we already have prompts for this post
            $existingPrompts = $this->postPromptService->getPromptsForPost($post);
            
            if (count($existingPrompts) > 0) {
                return response()->json([
                    'success' => true,
                    'prompts' => $existingPrompts->map(function ($prompt) {
                        return [
                            'id' => $prompt->id,
                            'prompt' => $prompt->prompt,
                            'source' => $prompt->source,
                            'ai_provider' => $prompt->ai_provider,
                            'is_selected' => $prompt->is_selected,
                            'order' => $prompt->order,
                        ];
                    })->toArray(),
                    'cached' => true,
                ]);
            }
            
            // Generate new prompts from all enabled AI models
            $generatedPrompts = $this->postPromptService->generatePromptsFromMultipleModelsForPost(
                $post,
                $sessionId,
                $request->description ?? ''
            );

            if (empty($generatedPrompts)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No prompts were generated. Please check AI model configurations.',
                ]);
            }

            $formattedPrompts = [];
            foreach ($generatedPrompts as $prompt) {
                $formattedPrompts[] = [
                    'id' => $prompt->id,
                    'prompt' => $prompt->prompt,
                    'source' => $prompt->source,
                    'ai_provider' => $prompt->ai_provider,
                    'is_selected' => $prompt->is_selected,
                    'order' => $prompt->order,
                ];
            }

            return response()->json([
                'success' => true,
                'prompts' => $formattedPrompts,
                'cached' => false,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to generate prompts for post', [
                'error' => $e->getMessage(),
                'post_id' => $post->id,
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to generate prompts: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get prompts with ratio-based selection for frontend display
     */
    public function getPromptsWithRatio(Request $request, Post $post)
    {
        $request->validate([
            'limit' => 'integer|min:1|max:100',
            'offset' => 'integer|min:0',
        ]);

        try {
            $limit = $request->get('limit', 25);
            $offset = $request->get('offset', 0);
            
            // Get prompts with ratio-based selection from active AI models only
            $selectedPrompts = $this->postPromptService->getPromptsWithRatioForPost($post, $limit, $offset);
            
            // Get total count for pagination
            $totalCount = $this->postPromptService->getTotalPromptsCountForPost($post);
            
            $formattedPrompts = array_map(function ($prompt) {
                return [
                    'id' => $prompt['id'] ?? $prompt->id,
                    'prompt' => $prompt['prompt'] ?? $prompt->prompt,
                    'source' => $prompt['source'] ?? $prompt->source,
                    'ai_provider' => $prompt['ai_provider'] ?? $prompt->ai_provider,
                    'is_selected' => false,
                    'order' => $prompt['order'] ?? $prompt->order,
                ];
            }, $selectedPrompts);

            $hasMore = ($totalCount > ($offset + $limit));

            return response()->json([
                'success' => true,
                'prompts' => $formattedPrompts,
                'has_more' => $hasMore,
                'total_count' => $totalCount,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get prompts with ratio for post', [
                'error' => $e->getMessage(),
                'post_id' => $post->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get prompts. Please try again.',
            ], 500);
        }
    }

    /**
     * Update prompt selection
     */
    public function updateSelection(Request $request, PostPrompt $postPrompt)
    {
        $request->validate([
            'is_selected' => 'required|boolean',
        ]);

        try {
            $postPrompt->update(['is_selected' => $request->is_selected]);

            $status = $request->is_selected ? 'approved' : 'rejected';
            return redirect()->back()->with('success', "Prompt {$status} successfully");

        } catch (\Exception $e) {
            Log::error('Failed to update prompt selection', [
                'error' => $e->getMessage(),
                'prompt_id' => $postPrompt->id,
            ]);

            return redirect()->back()->with('error', 'Failed to update prompt selection. Please try again.');
        }
    }

    /**
     * Add custom prompt for a post
     */
    public function addCustomPrompt(Request $request, Post $post)
    {
        $request->validate([
            'prompt' => 'required|string|max:1000',
        ]);

        try {
            $sessionId = session()->getId();
            
            $prompt = $this->postPromptService->addCustomPromptForPost(
                $post,
                $sessionId,
                $request->prompt
            );

            return redirect()->back()->with('success', 'Custom prompt added successfully');

        } catch (\Exception $e) {
            Log::error('Failed to add custom prompt for post', [
                'error' => $e->getMessage(),
                'post_id' => $post->id,
            ]);

            return redirect()->back()->with('error', 'Failed to add custom prompt. Please try again.');
        }
    }

    /**
     * Delete a prompt
     */
    public function destroy(PostPrompt $postPrompt)
    {
        try {
            $postId = $postPrompt->post_id;
            $postPrompt->delete();

            return redirect()->back()->with('success', 'Prompt deleted successfully');

        } catch (\Exception $e) {
            Log::error('Failed to delete prompt', [
                'error' => $e->getMessage(),
                'prompt_id' => $postPrompt->id,
            ]);

            return redirect()->back()->with('error', 'Failed to delete prompt. Please try again.');
        }
    }
}
