<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiModel;
use App\Models\Brand;
use App\Models\Post;
use App\Models\PostPrompt;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PostPromptAnalyticsController extends Controller
{
    /**
     * Display a listing of posts with prompt analysis summary.
     */
    public function index(Request $request)
    {
        $query = Post::with(['brand.agency', 'prompts'])
            ->whereHas('brand', function ($q) {
                $q->where('status', 'active');
            });

        // Filter by post status
        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by brand
        if ($request->brand_id && $request->brand_id !== 'all') {
            $query->where('brand_id', $request->brand_id);
        }

        // Filter by search term (post title)
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('url', 'like', "%{$search}%");
            });
        }

        // Filter: only posts with failed prompt analyses
        if ($request->boolean('has_failed')) {
            $query->whereHas('prompts', function ($q) {
                $q->whereNotNull('analysis_failed_at');
            });
        }

        $posts = $query->orderBy('created_at', 'desc')->paginate(25);

        // Get filter options - only active brands and their agencies
        $brands = Brand::where('status', 'active')
            ->with('agency')
            ->orderBy('name')
            ->get(['id', 'name', 'agency_id']);

        $activeAgencyIds = $brands->pluck('agency_id')->filter()->unique()->values();
        $agencies = User::role('agency')
            ->whereIn('id', $activeAgencyIds)
            ->orderBy('name')
            ->get(['id', 'name']);

        $aiModels = AiModel::where('is_enabled', true)
            ->get(['id', 'name', 'display_name']);

        return Inertia::render('admin/post-prompts/index', [
            'posts' => $posts->through(function ($post) {
                $prompts = $post->prompts;

                $totalPrompts = $prompts->count();
                $analyzedCount = $prompts->whereNotNull('analysis_completed_at')->count();
                $failedCount = $prompts->whereNotNull('analysis_failed_at')->count();
                $neverAnalyzedCount = $prompts
                    ->whereNull('analysis_completed_at')
                    ->whereNull('analysis_failed_at')
                    ->count();

                $lastAnalyzedAt = $prompts
                    ->whereNotNull('analysis_completed_at')
                    ->max('analysis_completed_at');

                $lastFailedAt = $prompts
                    ->whereNotNull('analysis_failed_at')
                    ->max('analysis_failed_at');

                return [
                    'id' => $post->id,
                    'title' => $post->title,
                    'url' => $post->url,
                    'status' => $post->status,
                    'created_at' => $post->created_at,
                    'brand' => [
                        'id' => $post->brand->id,
                        'name' => $post->brand->name,
                        'agency' => $post->brand->agency ? [
                            'id' => $post->brand->agency->id,
                            'name' => $post->brand->agency->name,
                        ] : null,
                    ],
                    'prompts' => $prompts->map(function ($prompt) {
                        return [
                            'id' => $prompt->id,
                            'prompt' => $prompt->prompt,
                            'source' => $prompt->source,
                            'ai_provider' => $prompt->ai_provider,
                            'ai_model_id' => $prompt->ai_model_id,
                            'order' => $prompt->order,
                            'status' => $prompt->status,
                            'visibility' => $prompt->visibility,
                            'position' => $prompt->position,
                            'sentiment' => $prompt->sentiment,
                            'volume' => $prompt->volume,
                            'analysis_completed_at' => $prompt->analysis_completed_at,
                            'analysis_failed_at' => $prompt->analysis_failed_at,
                            'analysis_error' => $prompt->analysis_error,
                        ];
                    })->values(),
                    'prompts_summary' => [
                        'total' => $totalPrompts,
                        'analyzed' => $analyzedCount,
                        'failed' => $failedCount,
                        'never_analyzed' => $neverAnalyzedCount,
                    ],
                    'last_analyzed_at' => $lastAnalyzedAt,
                    'last_failed_at' => $lastFailedAt,
                ];
            }),
            'filters' => [
                'search' => $request->input('search'),
                'status' => $request->input('status') ?: 'all',
                'agency_id' => $request->input('agency_id') ?: 'all',
                'brand_id' => $request->input('brand_id') ?: 'all',
                'has_failed' => $request->boolean('has_failed'),
            ],
            'agencies' => $agencies,
            'brands' => $brands,
            'aiModels' => $aiModels,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /**
     * Show prompt analysis details for a single post.
     */
    public function show(Post $post)
    {
        // Only allow viewing posts from active brands
        if (! $post->brand || $post->brand->status !== 'active') {
            abort(404);
        }

        $post->load(['brand.agency', 'prompts.aiModel']);

        $prompts = $post->prompts->map(function ($prompt) {
            return [
                'id' => $prompt->id,
                'prompt' => $prompt->prompt,
                'source' => $prompt->source,
                'ai_provider' => $prompt->ai_provider,
                'ai_model' => $prompt->aiModel ? [
                    'id' => $prompt->aiModel->id,
                    'name' => $prompt->aiModel->name,
                ] : null,
                'order' => $prompt->order,
                'is_selected' => $prompt->is_selected,
                'is_active' => $prompt->is_active,
                'status' => $prompt->status,
                'visibility' => $prompt->visibility,
                'position' => $prompt->position,
                'sentiment' => $prompt->sentiment,
                'volume' => $prompt->volume,
                'analysis_completed_at' => $prompt->analysis_completed_at,
                'analysis_failed_at' => $prompt->analysis_failed_at,
                'analysis_error' => $prompt->analysis_error,
                'created_at' => $prompt->created_at,
            ];
        });

        $totalPrompts = $prompts->count();
        $analyzedCount = $prompts->whereNotNull('analysis_completed_at')->count();
        $failedCount = $prompts->whereNotNull('analysis_failed_at')->count();
        $neverAnalyzedCount = $prompts
            ->whereNull('analysis_completed_at')
            ->whereNull('analysis_failed_at')
            ->count();

        $aiModels = AiModel::where('is_enabled', true)
            ->get(['id', 'name', 'display_name']);

        return Inertia::render('admin/post-prompts/show', [
            'post' => [
                'id' => $post->id,
                'title' => $post->title,
                'url' => $post->url,
                'description' => $post->description,
                'status' => $post->status,
                'created_at' => $post->created_at,
                'brand' => [
                    'id' => $post->brand->id,
                    'name' => $post->brand->name,
                    'agency' => $post->brand->agency ? [
                        'id' => $post->brand->agency->id,
                        'name' => $post->brand->agency->name,
                    ] : null,
                ],
            ],
            'prompts' => $prompts,
            'summary' => [
                'total' => $totalPrompts,
                'analyzed' => $analyzedCount,
                'failed' => $failedCount,
                'never_analyzed' => $neverAnalyzedCount,
            ],
            'aiModels' => $aiModels,
        ]);
    }

    /**
     * Update the AI model for a specific post prompt.
     */
    public function updateAiModel(Request $request, PostPrompt $postPrompt)
    {
        $request->validate([
            'ai_model_id' => 'required|integer|exists:ai_models,id',
        ]);

        $aiModel = AiModel::find($request->ai_model_id);

        if (! $aiModel || ! $aiModel->is_enabled) {
            return redirect()->back()->with('error', 'Selected AI model is not enabled.');
        }

        $postPrompt->update([
            'ai_provider' => $aiModel->name,
            'ai_model_id' => $aiModel->id,
        ]);

        return redirect()->back()->with('success', 'AI model updated successfully.');
    }
}
