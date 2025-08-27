<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\BrandPrompt;
use App\Models\BrandSubreddit;
use App\Models\User;
use App\Models\AiModel;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class BrandController extends Controller
{
    /**
     * Display a listing of brands for the authenticated agency.
     */
    public function index(): Response
    {
        /** @var User $user */
        $user = Auth::user();
        
        $brands = Brand::where('agency_id', $user->id)
            ->with(['posts'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($brand) {
                return [
                    'id' => $brand->id,
                    'name' => $brand->name,
                    'website' => $brand->website,
                    'description' => $brand->description,
                    'country' => $brand->country,
                    'monthly_posts' => $brand->monthly_posts,
                    'status' => $brand->status,
                    'created_at' => $brand->created_at,
                    'current_month_posts' => $brand->getCurrentMonthPostsCount(),
                    'total_posts' => $brand->posts->count(),
                ];
            });

        return Inertia::render('brands/index', [
            'brands' => $brands,
        ]);
    }

    /**
     * Show the form for creating a new brand.
     */
    public function create(): Response
    {
        // Get enabled AI models for automatic prompt generation
        $aiModels = AiModel::enabled()->ordered()->get();
        
        return Inertia::render('brands/create', [
            'sessionId' => session()->getId(),
            'aiModels' => $aiModels,
        ]);
    }

    /**
     * Store a newly created brand in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validationRules = [
            'name' => 'required|string|max:255',
            'website' => 'nullable|url|max:255',
            'description' => 'nullable|string|max:1000',
            'country' => 'nullable|string|max:100',
            'prompts' => 'array|max:25',
            'prompts.*' => 'required|string|max:500',
            'subreddits' => 'array|max:20',
            'subreddits.*' => 'required|string|max:100',
            'monthly_posts' => 'required|integer|min:1|max:1000',
            'create_account' => 'boolean',
        ];

        // Add account validation rules only if creating an account
        if ($request->boolean('create_account')) {
            $validationRules['brand_email'] = 'required|email|unique:users,email';
            $validationRules['brand_password'] = 'required|string|min:8';
        }

        $request->validate($validationRules);

        DB::transaction(function () use ($request) {
            /** @var User $agency */
            $agency = Auth::user();

            $brandUserId = null;

            // Create brand user account only if requested
            if ($request->boolean('create_account')) {
                $brandUser = User::create([
                    'name' => $request->name . ' User',
                    'email' => $request->brand_email,
                    'password' => Hash::make($request->brand_password),
                    'email_verified_at' => now(),
                ]);
                $brandUser->assignRole('brand');
                $brandUserId = $brandUser->id;
            }

            // Create brand
            $brand = Brand::create([
                'agency_id' => $agency->id,
                'user_id' => $brandUserId,
                'name' => $request->name,
                'website' => $request->website,
                'description' => $request->description,
                'country' => $request->country,
                'monthly_posts' => $request->monthly_posts,
                'status' => 'active',
            ]);

            // Create prompts if provided
            if ($request->has('prompts') && !empty($request->prompts)) {
                foreach ($request->prompts as $index => $prompt) {
                    BrandPrompt::create([
                        'brand_id' => $brand->id,
                        'prompt' => $prompt,
                        'order' => $index + 1,
                        'is_active' => true,
                    ]);
                }
            }

            // Create subreddits if provided
            if ($request->has('subreddits') && !empty($request->subreddits)) {
                foreach ($request->subreddits as $subreddit) {
                    BrandSubreddit::create([
                        'brand_id' => $brand->id,
                        'subreddit_name' => $subreddit,
                        'status' => 'approved',
                    ]);
                }
            }
        });

        return redirect()->route('brands.index')->with('success', 'Brand created successfully!');
    }

    /**
     * Display the specified brand.
     */
    public function show(Brand $brand): Response
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency
        if ($brand->agency_id !== $user->id) {
            abort(403);
        }

        $brand->load(['prompts', 'subreddits', 'user']);

        return Inertia::render('brands/show', [
            'brand' => $brand,
        ]);
    }

    /**
     * Show the form for editing the specified brand.
     */
    public function edit(Brand $brand): Response
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency
        if ($brand->agency_id !== $user->id) {
            abort(403);
        }

        $brand->load(['prompts', 'subreddits']);

        return Inertia::render('brands/edit', [
            'brand' => $brand,
        ]);
    }

    /**
     * Update the specified brand in storage.
     */
    public function update(Request $request, Brand $brand): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency
        if ($brand->agency_id !== $user->id) {
            abort(403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'website' => 'nullable|url|max:255',
            'description' => 'nullable|string|max:1000',
            'country' => 'nullable|string|max:100',
            'monthly_posts' => 'required|integer|min:1|max:1000',
            'prompts' => 'array|max:25',
            'prompts.*' => 'required|string|max:500',
            'subreddits' => 'array|max:20',
            'subreddits.*' => 'required|string|max:100',
        ]);

        DB::transaction(function () use ($request, $brand) {
            // Update brand
            $brand->update([
                'name' => $request->name,
                'website' => $request->website,
                'description' => $request->description,
                'country' => $request->country,
                'monthly_posts' => $request->monthly_posts,
            ]);

            // Delete existing prompts and create new ones
            $brand->prompts()->delete();
            foreach ($request->prompts as $index => $promptText) {
                BrandPrompt::create([
                    'brand_id' => $brand->id,
                    'prompt' => $promptText,
                    'order' => $index + 1,
                    'is_active' => true,
                ]);
            }

            // Delete existing subreddits and create new ones
            $brand->subreddits()->delete();
            foreach ($request->subreddits as $subredditName) {
                BrandSubreddit::create([
                    'brand_id' => $brand->id,
                    'subreddit_name' => $subredditName,
                    'status' => 'approved',
                ]);
            }
        });

        return redirect()->route('brands.show', $brand)->with('success', 'Brand updated successfully!');
    }

    /**
     * Update the brand status.
     */
    public function updateStatus(Request $request, Brand $brand): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency
        if ($brand->agency_id !== $user->id) {
            abort(403);
        }

        $request->validate([
            'status' => 'required|in:active,inactive,pending',
        ]);

        $brand->update([
            'status' => $request->status,
        ]);

        return back()->with('success', 'Brand status updated successfully!');
    }

    /**
     * Remove the specified brand from storage.
     */
    public function destroy(Brand $brand): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency
        if ($brand->agency_id !== $user->id) {
            abort(403);
        }

        // Delete the brand user account if exists
        if ($brand->user) {
            $brand->user->delete();
        }

        $brand->delete();

        return redirect()->route('brands.index')->with('success', 'Brand deleted successfully!');
    }

    /**
     * Get prompts with ratio-based selection for display
     */
    public function getPromptsWithRatio(Request $request)
    {
        $request->validate([
            'website' => 'required|url',
            'limit' => 'integer|min:1|max:100',
            'offset' => 'integer|min:0',
        ]);

        try {
            $aiService = app(\App\Services\AIPromptService::class);
            $limit = $request->get('limit', 25);
            $offset = $request->get('offset', 0);
            
            // Get prompts with ratio-based selection from active AI models only
            $selectedPrompts = $aiService->getPromptsWithRatio($request->website, $limit, $offset);
            
            // Get total count for pagination
            $totalCount = $aiService->getTotalPromptsCount($request->website);
            
            $formattedPrompts = array_map(function ($prompt) {
                return [
                    'id' => $prompt['id'],
                    'prompt' => $prompt['prompt'],
                    'source' => $prompt['source'],
                    'ai_provider' => $prompt['ai_provider'],
                    'is_selected' => false,
                    'order' => $prompt['order'],
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
            Log::error('Failed to get prompts with ratio', [
                'error' => $e->getMessage(),
                'website' => $request->website,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get prompts. Please try again.',
            ], 500);
        }
    }

    /**
     * Generate AI prompts for a brand from all enabled AI models.
     */
    public function generateMultiModelPrompts(Request $request)
    {
        $request->validate([
            'website' => 'required|url',
            'description' => 'required|string|max:1000',
        ]);

        try {
            $sessionId = session()->getId();
            $aiService = app(\App\Services\AIPromptService::class);
            
            // Check if we already have prompts for this website
            $existingPrompts = $aiService->getPromptsForWebsite($request->website);
            
            if (count($existingPrompts) > 0) {
                // Return existing prompts but mark them as for current session
                foreach ($existingPrompts as $prompt) {
                    $prompt->update(['session_id' => $sessionId]);
                }
                
                return response()->json([
                    'success' => true,
                    'prompts' => $existingPrompts->map(function ($prompt) {
                        return [
                            'id' => $prompt->id,
                            'prompt' => $prompt->prompt,
                            'source' => 'ai_generated_cached',
                            'ai_provider' => $prompt->ai_provider,
                            'is_selected' => true,
                            'order' => $prompt->order,
                        ];
                    })->toArray(),
                    'cached' => true,
                ]);
            }
            
            // Generate new prompts from all enabled AI models
            $generatedPrompts = $aiService->generatePromptsFromMultipleModels(
                $request->website,
                $sessionId,
                $request->description
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
                    'source' => 'ai_generated',
                    'ai_provider' => $prompt->ai_provider,
                    'is_selected' => true,
                    'order' => $prompt->order,
                ];
            }

            return response()->json([
                'success' => true,
                'prompts' => $formattedPrompts,
                'cached' => false,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to generate multi-model prompts', [
                'error' => $e->getMessage(),
                'website' => $request->website,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate prompts. Please try again.',
            ], 500);
        }
    }

    /**
     * Generate AI prompts for a brand based on website.
     */
    public function generatePrompts(Request $request)
    {
        $aiService = app(\App\Services\AIPromptService::class);
        $availableProviders = array_keys($aiService->getAvailableProviders());
        
        $request->validate([
            'website' => 'required|url',
            'description' => 'required|string|max:1000',
            'ai_provider' => 'required|string|in:' . implode(',', $availableProviders),
        ]);

        try {
            $sessionId = session()->getId();
            
            // Check if we already have prompts for this website
            $existingPrompts = $aiService->getPromptsForWebsite($request->website);
            
            if (count($existingPrompts) > 0) {
                // Return existing prompts but mark them as for current session
                foreach ($existingPrompts as $prompt) {
                    $prompt->update(['session_id' => $sessionId]);
                }
                
                return response()->json([
                    'success' => true,
                    'prompts' => $existingPrompts->map(function ($prompt) {
                        return [
                            'id' => $prompt->id,
                            'prompt' => $prompt->prompt,
                            'source' => 'ai_generated_cached',
                            'ai_provider' => $prompt->ai_provider,
                            'is_selected' => true,
                            'order' => $prompt->order,
                        ];
                    })->toArray(),
                    'cached' => true,
                ]);
            }
            
            // Generate new prompts
            $generatedPrompts = $aiService->generatePromptsForWebsite(
                $request->website,
                $sessionId,
                $request->ai_provider,
                $request->description
            );

            return response()->json([
                'success' => true,
                'prompts' => array_map(function ($prompt) {
                    return [
                        'id' => $prompt->id,
                        'prompt' => $prompt->prompt,
                        'source' => $prompt->source,
                        'ai_provider' => $prompt->ai_provider,
                        'is_selected' => $prompt->is_selected,
                        'order' => $prompt->order,
                    ];
                }, $generatedPrompts),
                'cached' => false,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to generate prompts: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get existing prompts for a website.
     */
    public function getExistingPrompts(Request $request)
    {
        $request->validate([
            'website' => 'required|url',
        ]);

        try {
            $aiService = app(\App\Services\AIPromptService::class);
            $existingPrompts = $aiService->getPromptsForWebsite($request->website);
            
            return response()->json([
                'success' => true,
                'prompts' => $existingPrompts->map(function ($prompt) {
                    return [
                        'id' => $prompt->id,
                        'prompt' => $prompt->prompt,
                        'source' => 'ai_generated_cached',
                        'ai_provider' => $prompt->ai_provider,
                        'is_selected' => true,
                        'order' => $prompt->order,
                    ];
                })->toArray(),
                'has_existing' => count($existingPrompts) > 0,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to get existing prompts: ' . $e->getMessage(),
            ], 500);
        }
    }
}
