<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Brand;
use App\Models\User;
use App\Models\AiModel;
use App\Models\SystemSetting;
use App\Jobs\GeneratePostPrompts;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Inertia\Inertia;

class PostController extends Controller
{
    /**
     * Display a listing of posts for admin.
     */
    public function index(Request $request)
    {
        $query = Post::with(['brand.agency', 'user', 'citations']);

        // Filter by date range
        if ($request->date_from) {
            $query->where('created_at', '>=', Carbon::parse($request->date_from)->startOfDay());
        }
        if ($request->date_to) {
            $query->where('created_at', '<=', Carbon::parse($request->date_to)->endOfDay());
        }

        // Filter by agency
        if ($request->agency_id) {
            $query->whereHas('brand', function ($brandQuery) use ($request) {
                $brandQuery->where('agency_id', $request->agency_id);
            });
        }

        // Filter by brand
        if ($request->brand_id) {
            $query->where('brand_id', $request->brand_id);
        }

        // Filter by AI model (posts that have citations from specific AI models)
        if ($request->ai_model) {
            $query->whereHas('citations', function ($citationQuery) use ($request) {
                $citationQuery->where('ai_model', $request->ai_model);
            });
        }

        $posts = $query->orderBy('created_at', 'desc')->paginate(20);

        // Get filter options
        $agencies = User::role('agency')->orderBy('name')->get(['id', 'name']);
        $brands = Brand::with('agency')->orderBy('name')->get(['id', 'name', 'agency_id']);
        $aiModels = AiModel::where('is_enabled', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('admin/posts/index', [
            'posts' => $posts->through(function ($post) {
                return [
                    'id' => $post->id,
                    'title' => $post->title,
                    'url' => $post->url,
                    'description' => $post->description,
                    'status' => $post->status,
                    'posted_at' => $post->posted_at,
                    'created_at' => $post->created_at,
                    'brand' => [
                        'id' => $post->brand->id,
                        'name' => $post->brand->name,
                        'agency' => $post->brand->agency ? [
                            'id' => $post->brand->agency->id,
                            'name' => $post->brand->agency->name,
                        ] : null,
                    ],
                    'user' => [
                        'id' => $post->user->id,
                        'name' => $post->user->name,
                    ],
                    'citations_count' => $post->citations->count(),
                    'mentioned_in_ai' => $post->citations->where('is_mentioned', true)->count(),
                ];
            }),
            'filters' => [
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'agency_id' => $request->agency_id,
                'brand_id' => $request->brand_id,
                'ai_model' => $request->ai_model,
            ],
            'agencies' => $agencies,
            'brands' => $brands,
            'aiModels' => $aiModels,
        ]);
    }

    /**
     * Show the form for creating a new post.
     */
    public function create(Request $request)
    {
        // Get all agencies and brands for admin
        $agencies = User::role('agency')->orderBy('name')->get(['id', 'name']);
        $brands = Brand::with('agency')->orderBy('name')->get(['id', 'name', 'can_create_posts', 'post_creation_note', 'monthly_posts', 'agency_id']);

        $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');

        $data = [
            'agencies' => $agencies,
            'brands' => $brands,
            'adminEmail' => $adminEmail,
        ];

        // If post_id is provided, load the post data
        if ($request->has('post_id')) {
            $post = Post::with('brand')->findOrFail($request->post_id);
            $data['post'] = [
                'id' => $post->id,
                'title' => $post->title,
                'url' => $post->url,
                'description' => $post->description,
                'status' => $post->status,
                'posted_at' => $post->posted_at,
                'brand_id' => $post->brand_id,
            ];
        }

        return Inertia::render('admin/posts/create', $data);
    }

    /**
     * Store a newly created post.
     */
    public function store(Request $request)
    {
        $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'title' => 'nullable|string|max:255',
            'url' => 'required|url|max:2000',
            'description' => 'nullable|string|max:1000',
            'status' => 'required|in:published,draft,archived',
            'posted_at' => 'nullable|date',
        ]);

        $brand = Brand::findOrFail($request->brand_id);

        // Admin has no restrictions - skip all permission and limit checks

        $post = Post::create([
            'brand_id' => $request->brand_id,
            'user_id' => Auth::id(), // Admin user creating the post
            'title' => $request->title,
            'url' => $request->url,
            'description' => $request->description,
            'status' => $request->status,
            'posted_at' => $request->posted_at ?: now(),
        ]);

        // Redirect to the same create page with the post_id parameter
        // Prompts will be generated via API call from frontend
        return redirect()->route('admin.posts.create', ['post_id' => $post->id])
            ->with('success', 'Post created successfully!');
    }

    /**
     * Display the specified post.
     */
    public function show(Post $post)
    {
        $post->load(['brand.user', 'brand.agency', 'citations', 'prompts']);

        return Inertia::render('admin/posts/show', [
            'post' => [
                'id' => $post->id,
                'title' => $post->title,
                'url' => $post->url,
                'description' => $post->description,
                'content' => $post->description, // Use description as content for compatibility
                'status' => $post->status,
                'created_at' => $post->created_at,
                'updated_at' => $post->updated_at,
                'brand' => [
                    'id' => $post->brand->id,
                    'name' => $post->brand->name,
                    'user' => $post->brand->user ? [
                        'id' => $post->brand->user->id,
                        'name' => $post->brand->user->name,
                    ] : [
                        'id' => $post->brand->agency->id,
                        'name' => $post->brand->agency->name,
                    ],
                ],
                'ai_model' => [
                    'id' => 1, // Default AI model since this field doesn't exist
                    'name' => 'Default',
                ],
                'post_citations' => $post->citations->map(function ($citation) {
                    return [
                        'id' => $citation->id,
                        'citation_text' => $citation->citation_text,
                        'source_url' => $citation->source_url,
                        'is_verified' => $citation->is_verified,
                    ];
                }),
                'post_prompts' => $post->prompts->map(function ($prompt) {
                    return [
                        'id' => $prompt->id,
                        'prompt_text' => $prompt->prompt,
                        'ai_model' => [
                            'id' => 1,
                            'name' => $prompt->ai_provider ?? 'Default',
                        ],
                    ];
                }),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified post.
     */
    public function edit(Post $post)
    {
        $agencies = User::role('agency')->orderBy('name')->get(['id', 'name']);
        $brands = Brand::orderBy('name')->get(['id', 'name', 'can_create_posts', 'post_creation_note', 'monthly_posts', 'agency_id']);

        $post->load(['brand.user', 'brand.agency']);

        return Inertia::render('admin/posts/edit', [
            'post' => [
                'id' => $post->id,
                'title' => $post->title,
                'url' => $post->url,
                'description' => $post->description,
                'status' => $post->status,
                'brand_id' => $post->brand_id,
                'brand' => [
                    'id' => $post->brand->id,
                    'name' => $post->brand->name,
                    'agency_id' => $post->brand->agency_id,
                    'user' => $post->brand->user ? [
                        'id' => $post->brand->user->id,
                        'name' => $post->brand->user->name,
                    ] : [
                        'id' => $post->brand->agency->id,
                        'name' => $post->brand->agency->name,
                    ],
                ],
            ],
            'agencies' => $agencies,
            'brands' => $brands,
        ]);
    }

    /**
     * Update the specified post.
     */
    public function update(Request $request, Post $post)
    {
        $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'title' => 'nullable|string|max:255',
            'url' => 'required|url|max:2000',
            'description' => 'nullable|string|max:1000',
            'status' => 'required|in:published,draft,archived',
            'posted_at' => 'nullable|date',
        ]);

        // Check if the brand can create posts (for admin override)
        $brand = Brand::findOrFail($request->brand_id);

        $post->update([
            'brand_id' => $request->brand_id,
            'title' => $request->title,
            'url' => $request->url,
            'description' => $request->description,
            'status' => $request->status,
            'posted_at' => $request->posted_at,
        ]);

        return redirect()->route('admin.posts.create', ['post_id' => $post->id])
            ->with('success', 'Post updated successfully!');
    }

    /**
     * Remove the specified post.
     */
    public function destroy(Post $post)
    {
        $post->delete();

        return redirect()->route('admin.posts.index')->with('success', 'Post deleted successfully!');
    }

    /**
     * Get prompts for a post (API endpoint).
     * If no prompts exist, generate them automatically.
     */
    public function getPrompts(Post $post)
    {
        // Check if prompts already exist for this post
        $existingPrompts = $post->prompts()->get();

        if ($existingPrompts->isEmpty()) {
            // No prompts exist, generate them
            try {
                $postPromptService = app(\App\Services\PostPromptService::class);
                $sessionId = session()->getId() ?: 'admin-' . uniqid();
                $description = $post->description ?? '';

                // Generate prompts from all enabled AI models
                $generatedPrompts = $postPromptService->generatePromptsFromMultipleModelsForPost(
                    $post,
                    $sessionId,
                    $description
                );

                // Map the generated prompts for response
                $prompts = collect($generatedPrompts)->map(function ($prompt) {
                    return [
                        'id' => $prompt->id,
                        'prompt_text' => $prompt->prompt,
                        'visibility' => $prompt->visibility ?? null,
                        'sentiment' => $prompt->sentiment ?? null,
                        'position' => $prompt->position ?? null,
                        'location' => $prompt->location ?? null,
                        'volume' => $prompt->volume ?? null,
                        'status' => $prompt->status ?? 'suggested',
                        'created_at' => $prompt->created_at,
                    ];
                });
            } catch (\Exception $e) {
                // If generation fails, return empty array
                return response()->json([
                    'prompts' => [],
                    'error' => 'Failed to generate prompts: ' . $e->getMessage()
                ]);
            }
        } else {
            // Prompts exist, return them
            $prompts = $existingPrompts->map(function ($prompt) {
                return [
                    'id' => $prompt->id,
                    'prompt_text' => $prompt->prompt,
                    'visibility' => $prompt->visibility ?? null,
                    'sentiment' => $prompt->sentiment ?? null,
                    'position' => $prompt->position ?? null,
                    'location' => $prompt->location ?? null,
                    'volume' => $prompt->volume ?? null,
                    'status' => $prompt->status ?? 'suggested',
                    'created_at' => $prompt->created_at,
                ];
            });
        }

        return response()->json([
            'prompts' => $prompts
        ]);
    }

    /**
     * Generate prompts for a post synchronously (API endpoint).
     */
    public function generatePrompts(Request $request, Post $post)
    {
        try {
            $postPromptService = app(\App\Services\PostPromptService::class);
            $sessionId = session()->getId() ?: 'admin-' . uniqid();
            $description = $request->input('description') ?? $post->description ?? '';

            // Generate prompts from all enabled AI models
            // Description is optional - the service will work with or without it
            $prompts = $postPromptService->generatePromptsFromMultipleModelsForPost(
                $post,
                $sessionId,
                $description
            );

            // Return the generated prompts
            return response()->json([
                'success' => true,
                'prompts' => collect($prompts)->map(function ($prompt) {
                    return [
                        'id' => $prompt->id,
                        'prompt_text' => $prompt->prompt,
                        'visibility' => $prompt->visibility ?? null,
                        'sentiment' => $prompt->sentiment ?? null,
                        'position' => $prompt->position ?? null,
                        'location' => $prompt->location ?? null,
                        'volume' => $prompt->volume ?? null,
                        'status' => $prompt->status ?? 'suggested',
                        'created_at' => $prompt->created_at,
                    ];
                }),
                'message' => 'Prompts generated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate prompts: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update prompts status (API endpoint).
     */
    public function bulkUpdatePrompts(Request $request, Post $post)
    {
        $request->validate([
            'prompt_ids' => 'required|array',
            'prompt_ids.*' => 'exists:brand_prompts,id',
            'action' => 'required|in:activate,reject,delete',
        ]);

        try {
            $prompts = \App\Models\PostPrompt::whereIn('id', $request->prompt_ids)
                ->where('post_id', $post->id)
                ->get();

            foreach ($prompts as $prompt) {
                switch ($request->action) {
                    case 'activate':
                        $prompt->update(['status' => 'active']);
                        break;
                    case 'reject':
                        $prompt->update(['status' => 'inactive']);
                        break;
                    case 'delete':
                        $prompt->delete();
                        break;
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Prompts updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update prompts: ' . $e->getMessage()
            ], 500);
        }
    }
}
