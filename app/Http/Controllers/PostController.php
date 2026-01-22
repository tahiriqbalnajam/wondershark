<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Brand;
use App\Models\SystemSetting;
use App\Models\User;
use App\Jobs\GeneratePostPrompts;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Inertia\Inertia;

class PostController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        
        $posts = Post::with(['brand', 'user', 'citations'])
            ->when($user->hasRole('agency'), function ($query) use ($user) {
                return $query->whereHas('brand', function ($brandQuery) use ($user) {
                    $brandQuery->where('agency_id', $user->id);
                });
            })
            ->when($user->hasRole('brand'), function ($query) use ($user) {
                return $query->whereHas('brand', function ($brandQuery) use ($user) {
                    $brandQuery->where('user_id', $user->id);
                });
            })
            ->when($request->has('brand_id'), function ($query) use ($request) {
                return $query->where('brand_id', $request->brand_id);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('posts/index', [
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
                    ],
                    'user' => [
                        'id' => $post->user->id,
                        'name' => $post->user->name,
                    ],
                    'citations_count' => $post->citations->count(),
                    'mentioned_in_ai' => $post->citations->where('is_mentioned', true)->count(),
                    'citation_urls' => $post->citations->pluck('citation_url')->filter()->unique()->values()->toArray(),
                ];
            }),
        ]);
    }

    /**
     * Display posts for a specific brand.
     */
    public function brandIndex(Request $request, Brand $brand)
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated user (agency or brand owner)
        $hasAccess = $user->hasRole('admin') || 
                     $brand->agency_id === $user->id || 
                     $brand->user_id === $user->id;
        
        if (!$hasAccess) {
            abort(403, 'You do not have permission to access this brand.');
        }

        // Store selected brand in session
        session(['selected_brand_id' => $brand->id]);

        $posts = Post::with(['brand', 'user', 'citations'])
            ->where('brand_id', $brand->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('posts/index', [
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
                    ],
                    'user' => [
                        'id' => $post->user->id,
                        'name' => $post->user->name,
                    ],
                    'citations_count' => $post->citations->count(),
                    'mentioned_in_ai' => $post->citations->where('is_mentioned', true)->count(),
                    'citation_urls' => $post->citations->pluck('citation_url')->filter()->unique()->values()->toArray(),
                ];
            }),
            'brand' => $brand,
        ]);
    }

    /**
     * Show the form for creating a new post for a specific brand.
     */
    public function brandCreate(Brand $brand)
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated user (agency or brand owner)
        $hasAccess = $user->hasRole('admin') || 
                     $brand->agency_id === $user->id || 
                     $brand->user_id === $user->id;
        
        if (!$hasAccess) {
            abort(403, 'You do not have permission to access this brand.');
        }

        // Store selected brand in session
        session(['selected_brand_id' => $brand->id]);

        // Check if user or brand can create posts
        $canCreatePosts = $user->can_create_posts && $brand->can_create_posts;
        $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');

        // Get all brands for the user (agency or brand owner)
        if ($user->hasRole('admin')) {
            $allBrands = Brand::orderBy('name')->get();
        } elseif ($user->hasRole('agency')) {
            $allBrands = Brand::where('agency_id', $user->id)->orderBy('name')->get();
        } else {
            // Brand user - get their own brand(s)
            $allBrands = Brand::where('user_id', $user->id)->orderBy('name')->get();
        }
        
        $allBrands = $allBrands->map(fn($b) => [
            'id' => $b->id,
            'name' => $b->name,
            'can_create_posts' => $b->can_create_posts,
            'post_creation_note' => $b->post_creation_note,
            'monthly_posts' => $b->monthly_posts,
        ]);

        return Inertia::render('posts/create', [
            'brands' => $allBrands,
            'selectedBrandId' => $brand->id,
            'canCreatePosts' => $canCreatePosts,
            'adminEmail' => $adminEmail,
            'userCanCreatePosts' => $user->can_create_posts,
            'userPostCreationNote' => $user->post_creation_note,
            'brand' => $brand,
        ]);
    }

    /**
     * Store a newly created post for a specific brand.
     */
    public function brandStore(Request $request, Brand $brand)
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated user (agency or brand owner)
        $hasAccess = $user->hasRole('admin') || 
                     $brand->agency_id === $user->id || 
                     $brand->user_id === $user->id;
        
        if (!$hasAccess) {
            abort(403, 'You do not have permission to access this brand.');
        }

        $request->validate([
            'title' => 'nullable|string|max:255',
            'url' => 'required|url|max:2000',
            'description' => 'nullable|string|max:1000',
            'status' => 'required|in:published,draft,archived',
            'posted_at' => 'nullable|date',
            'post_type' => 'required|in:blog,forum',
        ]);

        // Skip permission checks for admin users
        if (!$user->hasRole('admin')) {
            // Check if user can create posts
            if (!$user->can_create_posts) {
                $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');
                return back()->withErrors([
                    'permission' => "You don't have permission to create posts. Please contact the administrator at {$adminEmail}. " . 
                                   ($user->post_creation_note ? "Note: {$user->post_creation_note}" : '')
                ]);
            }

            // Check if brand can create posts
            if (!$brand->can_create_posts) {
                $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');
                return back()->withErrors([
                    'permission' => "The brand '{$brand->name}' doesn't have permission to create posts. Please contact the administrator at {$adminEmail}. " . 
                                   ($brand->post_creation_note ? "Note: {$brand->post_creation_note}" : '')
                ]);
            }

            // Check brand post limit
            $currentMonth = Carbon::now()->startOfMonth();
            $postsThisMonth = Post::where('brand_id', $brand->id)
                ->where('created_at', '>=', $currentMonth)
                ->count();

            if ($brand->monthly_posts && $postsThisMonth >= $brand->monthly_posts) {
                return back()->withErrors([
                    'limit' => "Brand '{$brand->name}' has reached its monthly post limit of {$brand->monthly_posts} posts. Current count: {$postsThisMonth}."
                ]);
            }
        }

        $post = Post::create([
            'brand_id' => $brand->id,
            'user_id' => $user->id,
            'title' => $request->title,
            'url' => $request->url,
            'description' => $request->description,
            'status' => $request->status,
            'posted_at' => $request->posted_at ?: now(),
            'post_type' => $request->post_type,
        ]);

        // Automatically generate prompts for the post in background
        $sessionId = session()->getId() ?: 'auto-' . uniqid();
        
        GeneratePostPrompts::dispatch(
            $post, 
            $sessionId, 
            $request->description ?? ''
        );

        return redirect()->route('brands.posts.index', $brand)->with('success', 'Post created successfully. Prompts are being generated in the background.');
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $user = Auth::user();
        
        // Get brands the user has access to
        if ($user->hasRole('admin')) {
            // Admin can access all brands
            $brands = Brand::orderBy('name')
                ->get(['id', 'name', 'can_create_posts', 'post_creation_note', 'monthly_posts']);
            $canCreatePosts = true; // Admin can always create posts
        } elseif ($user->hasRole('agency')) {
            // Agency users can only access their own brands
            $brands = Brand::where('agency_id', $user->id)
                ->orderBy('name')
                ->get(['id', 'name', 'can_create_posts', 'post_creation_note', 'monthly_posts']);
            
            // Check if user or any of their brands can create posts
            $canCreatePosts = $user->can_create_posts && $brands->where('can_create_posts', true)->count() > 0;
        } else {
            // Brand users can only access their own brand(s)
            $brands = Brand::where('user_id', $user->id)
                ->orderBy('name')
                ->get(['id', 'name', 'can_create_posts', 'post_creation_note', 'monthly_posts']);
            
            // Check if user or any of their brands can create posts
            $canCreatePosts = $user->can_create_posts && $brands->where('can_create_posts', true)->count() > 0;
        }
        
        $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');

        return Inertia::render('posts/create', [
            'brands' => $brands,
            'canCreatePosts' => $canCreatePosts,
            'adminEmail' => $adminEmail,
            'userCanCreatePosts' => $user->can_create_posts,
            'userPostCreationNote' => $user->post_creation_note,
        ]);
    }

    /**
     * Store a newly created resource in storage.
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
            'post_type' => 'required|in:blog,forum',
        ]);

        $user = Auth::user();
        
        // Verify user has access to the brand
        if ($user->hasRole('admin')) {
            // Admin can access any brand
            $brand = Brand::findOrFail($request->brand_id);
        } elseif ($user->hasRole('agency')) {
            // Agency users can only access their own brands
            $brand = Brand::where('id', $request->brand_id)
                ->where('agency_id', $user->id)
                ->firstOrFail();
        } else {
            // Brand users can only access their own brand(s)
            $brand = Brand::where('id', $request->brand_id)
                ->where('user_id', $user->id)
                ->firstOrFail();
        }

        // Skip permission checks for admin users
        if (!$user->hasRole('admin')) {
            // Check if user can create posts
            if (!$user->can_create_posts) {
                $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');
                return back()->withErrors([
                    'permission' => "You don't have permission to create posts. Please contact the administrator at {$adminEmail}. " . 
                                   ($user->post_creation_note ? "Note: {$user->post_creation_note}" : '')
                ]);
            }

            // Check if brand can create posts
            if (!$brand->can_create_posts) {
                $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');
                return back()->withErrors([
                    'permission' => "The brand '{$brand->name}' doesn't have permission to create posts. Please contact the administrator at {$adminEmail}. " . 
                                   ($brand->post_creation_note ? "Note: {$brand->post_creation_note}" : '')
                ]);
            }

            // Check brand post limit
            $currentMonth = Carbon::now()->startOfMonth();
            $postsThisMonth = Post::where('brand_id', $brand->id)
                ->where('created_at', '>=', $currentMonth)
                ->count();

            if ($brand->monthly_posts && $postsThisMonth >= $brand->monthly_posts) {
                return back()->withErrors([
                    'limit' => "Brand '{$brand->name}' has reached its monthly post limit of {$brand->monthly_posts} posts. Current count: {$postsThisMonth}."
                ]);
            }
        }

        $post = Post::create([
            'brand_id' => $request->brand_id,
            'user_id' => $user->id,
            'title' => $request->title,
            'url' => $request->url,
            'description' => $request->description,
            'status' => $request->status,
            'posted_at' => $request->posted_at ?: now(),
            'post_type' => $request->post_type,
        ]);
        
        GeneratePostPrompts::dispatch(
            $post, 
            $sessionId, 
            $request->description ?? ''
        );

        return back()->with([
            'success' => 'Post created successfully. Prompts are being generated in the background.',
            'post' => [
                'id' => $post->id,
                'title' => $post->title,
                'url' => $post->url,
                'description' => $post->description,
                'status' => $post->status,
                'posted_at' => $post->posted_at,
            ]
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(Post $post)
    {
        $user = Auth::user();
        
        // Check access: Allow if user is admin, owns the agency, or owns the brand directly
        $hasAccess = $user->hasRole('admin') || 
                     $post->brand->agency_id === $user->id || 
                     $post->brand->user_id === $user->id;
        
        if (!$hasAccess) {
            abort(403, 'You do not have permission to view this post.');
        }

        return Inertia::render('posts/show', [
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
                ],
                'citations' => $post->citations->map(function ($citation) {
                    return [
                        'id' => $citation->id,
                        'ai_model' => $citation->ai_model,
                        'citation_text' => $citation->citation_text,
                        'citation_url' => $citation->citation_url,
                        'position' => $citation->position,
                        'is_mentioned' => $citation->is_mentioned,
                        'checked_at' => $citation->checked_at,
                        'created_at' => $citation->created_at,
                    ];
                }),
                'user' => [
                    'id' => $post->user->id,
                    'name' => $post->user->name,
                ],
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Post $post)
    {
        $user = Auth::user();
        
        // Check access: Allow if user is admin, owns the agency, or owns the brand directly
        $hasAccess = $user->hasRole('admin') || 
                     $post->brand->agency_id === $user->id || 
                     $post->brand->user_id === $user->id;
        
        if (!$hasAccess) {
            abort(403, 'You do not have permission to edit this post.');
        }

        // Get brands the user has access to
        if ($user->hasRole('admin')) {
            $brands = Brand::orderBy('name')->get(['id', 'name']);
        } elseif ($user->hasRole('agency')) {
            $brands = Brand::where('agency_id', $user->id)
                ->orderBy('name')
                ->get(['id', 'name']);
        } else {
            // Brand users can only access their own brand(s)
            $brands = Brand::where('user_id', $user->id)
                ->orderBy('name')
                ->get(['id', 'name']);
        }

        return Inertia::render('posts/edit', [
            'post' => $post,
            'brands' => $brands,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Post $post)
    {
        $user = Auth::user();
        
        // Check access: Allow if user is admin, owns the agency, or owns the brand directly
        $hasAccess = $user->hasRole('admin') || 
                     $post->brand->agency_id === $user->id || 
                     $post->brand->user_id === $user->id;
        
        if (!$hasAccess) {
            abort(403, 'You do not have permission to update this post.');
        }

        $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'title' => 'nullable|string|max:255',
            'url' => 'required|url|max:2000',
            'description' => 'nullable|string|max:1000',
            'status' => 'required|in:published,draft,archived',
            'posted_at' => 'nullable|date',
        ]);

        $originalUrl = $post->url;
        $originalDescription = $post->description;
        
        $post->update([
            'brand_id' => $request->brand_id,
            'title' => $request->title,
            'url' => $request->url,
            'description' => $request->description,
            'status' => $request->status,
            'posted_at' => $request->posted_at,
        ]);

        // Check if URL or description changed significantly
        $urlChanged = $originalUrl !== $request->url;
        $descriptionChanged = $originalDescription !== $request->description;
        
        if ($urlChanged || $descriptionChanged) {
            $sessionId = session()->getId() ?: 'auto-' . uniqid();
            
            // Generate new prompts in background, replacing existing if URL changed
            GeneratePostPrompts::dispatch(
                $post, 
                $sessionId, 
                $request->description ?? '',
                $urlChanged // Replace existing prompts if URL changed
            );
            
            $message = $urlChanged 
                ? 'Post updated successfully. New prompts are being generated due to URL change.'
                : 'Post updated successfully. Prompts are being regenerated due to description change.';
        } else {
            $message = 'Post updated successfully.';
        }

        return redirect()->route('posts.index')->with('success', $message);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Post $post)
    {
        $user = Auth::user();
        
        // Check access: Allow if user is admin, owns the agency, or owns the brand directly
        $hasAccess = $user->hasRole('admin') || 
                     $post->brand->agency_id === $user->id || 
                     $post->brand->user_id === $user->id;
        
        if (!$hasAccess) {
            abort(403, 'You do not have permission to delete this post.');
        }

        $post->delete();

        return redirect()->route('posts.index')->with('success', 'Post deleted successfully.');
    }

    /**
     * Store a new citation for the specified post.
     */
    public function storeCitation(Request $request, Post $post)
    {
        $user = Auth::user();
        
        // Check access: Allow if user is admin, owns the agency, or owns the brand directly
        $hasAccess = $user->hasRole('admin') || 
                     $post->brand->agency_id === $user->id || 
                     $post->brand->user_id === $user->id;
        
        if (!$hasAccess) {
            abort(403, 'You do not have permission to add citations to this post.');
        }

        $request->validate([
            'ai_model' => 'required|in:openai,gemini,perplexity',
            'citation_text' => 'nullable|string|max:2000',
            'citation_url' => 'nullable|url|max:2000',
            'position' => 'nullable|integer|min:1',
            'is_mentioned' => 'boolean',
        ]);

        $post->citations()->create([
            'ai_model' => $request->ai_model,
            'citation_text' => $request->citation_text,
            'citation_url' => $request->citation_url,
            'position' => $request->position,
            'is_mentioned' => $request->boolean('is_mentioned'),
            'checked_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Citation added successfully.');
    }

    /**
     * Display the prompts management page for a post.
     */
    public function showPrompts(Post $post)
    {
        $post->load(['brand', 'user', 'prompts']);
        
        return Inertia::render('posts/prompts', [
            'post' => [
                'id' => $post->id,
                'title' => $post->title,
                'url' => $post->url,
                'description' => $post->description,
                'status' => $post->status,
                'posted_at' => $post->posted_at,
                'brand' => [
                    'id' => $post->brand->id,
                    'name' => $post->brand->name,
                ],
                'user' => [
                    'id' => $post->user->id,
                    'name' => $post->user->name,
                ],
                'prompts_count' => $post->prompts->count(),
            ],
        ]);
    }
}
