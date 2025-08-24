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
    public function create()
    {
        // Get all agencies and brands for admin
        $agencies = User::role('agency')->orderBy('name')->get(['id', 'name']);
        $brands = Brand::with('agency')->orderBy('name')->get(['id', 'name', 'can_create_posts', 'post_creation_note', 'monthly_posts', 'agency_id']);

        $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');

        return Inertia::render('admin/posts/create', [
            'agencies' => $agencies,
            'brands' => $brands,
            'adminEmail' => $adminEmail,
        ]);
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

        // Check if brand can create posts (same logic as agency)
        if (!$brand->can_create_posts) {
            $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');
            return back()->withErrors([
                'permission' => "The brand '{$brand->name}' doesn't have permission to create posts. " . 
                               ($brand->post_creation_note ? "Note: {$brand->post_creation_note}" : '')
            ]);
        }

        // Check brand post limit (same logic as agency)
        $currentMonth = Carbon::now()->startOfMonth();
        $postsThisMonth = Post::where('brand_id', $brand->id)
            ->where('created_at', '>=', $currentMonth)
            ->count();

        if ($brand->monthly_posts && $postsThisMonth >= $brand->monthly_posts) {
            return back()->withErrors([
                'limit' => "Brand '{$brand->name}' has reached its monthly post limit of {$brand->monthly_posts} posts. Current count: {$postsThisMonth}."
            ]);
        }

        $post = Post::create([
            'brand_id' => $request->brand_id,
            'user_id' => Auth::id(), // Admin user creating the post
            'title' => $request->title,
            'url' => $request->url,
            'description' => $request->description,
            'status' => $request->status,
            'posted_at' => $request->posted_at ?: now(),
        ]);

        // Automatically generate prompts for the post in background (same logic as agency)
        $sessionId = session()->getId() ?: 'admin-auto-' . uniqid();
        
        GeneratePostPrompts::dispatch(
            $post, 
            $sessionId, 
            $request->description ?? ''
        );

        return redirect()->route('admin.posts.index')->with('success', 'Post created successfully! Prompts are being generated in the background.');
    }

    /**
     * Display the specified post.
     */
    public function show(Post $post)
    {
        $post->load(['brand.agency', 'user', 'citations', 'prompts']);

        return Inertia::render('admin/posts/show', [
            'post' => [
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
                'citations' => $post->citations->map(function ($citation) {
                    return [
                        'id' => $citation->id,
                        'ai_model' => $citation->ai_model,
                        'is_mentioned' => $citation->is_mentioned,
                        'citation_text' => $citation->citation_text,
                        'created_at' => $citation->created_at,
                    ];
                }),
                'prompts' => $post->prompts->map(function ($prompt) {
                    return [
                        'id' => $prompt->id,
                        'ai_model' => $prompt->ai_model,
                        'prompt_text' => $prompt->prompt_text,
                        'response' => $prompt->response,
                        'status' => $prompt->status,
                        'created_at' => $prompt->created_at,
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
        $brands = Brand::with('agency')->orderBy('name')->get(['id', 'name', 'can_create_posts', 'post_creation_note', 'monthly_posts', 'agency_id']);

        $post->load(['brand.agency']);

        return Inertia::render('admin/posts/edit', [
            'post' => [
                'id' => $post->id,
                'title' => $post->title,
                'url' => $post->url,
                'description' => $post->description,
                'status' => $post->status,
                'posted_at' => $post->posted_at,
                'brand_id' => $post->brand_id,
                'brand' => [
                    'id' => $post->brand->id,
                    'name' => $post->brand->name,
                    'agency' => $post->brand->agency ? [
                        'id' => $post->brand->agency->id,
                        'name' => $post->brand->agency->name,
                    ] : null,
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

        $post->update([
            'brand_id' => $request->brand_id,
            'title' => $request->title,
            'url' => $request->url,
            'description' => $request->description,
            'status' => $request->status,
            'posted_at' => $request->posted_at,
        ]);

        return redirect()->route('admin.posts.index')->with('success', 'Post updated successfully!');
    }

    /**
     * Remove the specified post.
     */
    public function destroy(Post $post)
    {
        $post->delete();

        return redirect()->route('admin.posts.index')->with('success', 'Post deleted successfully!');
    }
}
