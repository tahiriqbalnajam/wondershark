<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Brand;
use App\Jobs\GeneratePostPrompts;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PostController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();
        
        $posts = Post::with(['brand', 'user', 'citations'])
            ->when($user->hasRole('agency'), function ($query) use ($user) {
                return $query->whereHas('brand', function ($brandQuery) use ($user) {
                    $brandQuery->where('agency_id', $user->id);
                });
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
                ];
            }),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $user = Auth::user();
        
        $brands = Brand::where('agency_id', $user->id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('posts/create', [
            'brands' => $brands,
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
        ]);

        $user = Auth::user();
        
        // Verify user has access to the brand
        $brand = Brand::where('id', $request->brand_id)
            ->where('agency_id', $user->id)
            ->firstOrFail();

        $post = Post::create([
            'brand_id' => $request->brand_id,
            'user_id' => $user->id,
            'title' => $request->title,
            'url' => $request->url,
            'description' => $request->description,
            'status' => $request->status,
            'posted_at' => $request->posted_at ?: now(),
        ]);

        // Automatically generate prompts for the post in background
        $sessionId = session()->getId() ?: 'auto-' . uniqid();
        
        GeneratePostPrompts::dispatch(
            $post, 
            $sessionId, 
            $request->description ?? ''
        );

        return redirect()->route('posts.index')->with('success', 'Post created successfully. Prompts are being generated in the background.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Post $post)
    {
        $user = Auth::user();
        
        // Check access
        if ($post->brand->agency_id !== $user->id) {
            abort(403);
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
        
        // Check access
        if ($post->brand->agency_id !== $user->id) {
            abort(403);
        }

        $brands = Brand::where('agency_id', $user->id)
            ->orderBy('name')
            ->get(['id', 'name']);

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
        
        // Check access
        if ($post->brand->agency_id !== $user->id) {
            abort(403);
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
        
        // Check access
        if ($post->brand->agency_id !== $user->id) {
            abort(403);
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
        
        // Check access
        if ($post->brand->agency_id !== $user->id) {
            abort(403);
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
