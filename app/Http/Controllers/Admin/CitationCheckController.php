<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\CitationCheckService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CitationCheckController extends Controller
{
    protected CitationCheckService $citationService;

    public function __construct(CitationCheckService $citationService)
    {
        $this->citationService = $citationService;
    }

    public function index(Request $request)
    {
        $query = Post::with(['brand', 'user', 'citations'])
            ->orderBy('created_at', 'desc');

        // Filter by brand if provided
        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        // Filter by status if provided
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Search by title or URL
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('url', 'like', "%{$search}%");
            });
        }

        $posts = $query->paginate(15);

        // Get available brands for filter
        $brands = \App\Models\Brand::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('admin/citation-check/index', [
            'posts' => $posts,
            'brands' => $brands,
            'filters' => $request->only(['brand_id', 'status', 'search'])
        ]);
    }

    public function runCheck(Request $request)
    {
        $request->validate([
            'post_ids' => 'required|array',
            'post_ids.*' => 'exists:posts,id'
        ]);

        try {
            if (count($request->post_ids) === 1) {
                // Single post check
                $post = Post::find($request->post_ids[0]);
                $result = $this->citationService->runCitationCheck($post);
            } else {
                // Batch check
                $result = $this->citationService->getBatchCitationResults($request->post_ids);
            }

            return response()->json([
                'success' => true,
                'message' => 'Citation check completed successfully',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Citation check failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show(Post $post)
    {
        $post->load(['brand', 'citations', 'user', 'prompts']);
        
        // Get combined prompts from post prompts (not brand prompts)
        $prompts = $post->prompts()
            ->where('is_selected', true)
            ->pluck('prompt')
            ->toArray();
        $combinedPrompts = implode(', ', $prompts);

        return Inertia::render('admin/citation-check/show', [
            'post' => $post,
            'combinedPrompts' => $combinedPrompts
        ]);
    }

    public function recheck(Post $post)
    {
        try {
            $result = $this->citationService->runCitationCheck($post);

            return response()->json([
                'success' => true,
                'message' => 'Citation recheck completed successfully',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Citation recheck failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function bulkCheck(Request $request)
    {
        $request->validate([
            'brand_id' => 'sometimes|exists:brands,id',
            'status' => 'sometimes|string',
            'limit' => 'sometimes|integer|min:1|max:100'
        ]);

        try {
            $query = Post::query();

            if ($request->filled('brand_id')) {
                $query->where('brand_id', $request->brand_id);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $posts = $query->limit($request->limit ?? 50)->get();
            $postIds = $posts->pluck('id')->toArray();

            $results = $this->citationService->getBatchCitationResults($postIds);

            return response()->json([
                'success' => true,
                'message' => 'Bulk citation check completed successfully',
                'processed_count' => count($results),
                'data' => $results
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Bulk citation check failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
