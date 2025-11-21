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
        
        return Inertia::render('brands/create/index', [
            'currentStep' => 1,
            'existingData' => [
                'brand' => null,
                'competitors' => [],
                'prompts' => [],
            ],
            'aiModels' => $aiModels,
            'sessionId' => session()->getId(),
        ]);
    }

    /**
     * Store a newly created brand in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        // Normalize website URL if provided
        if ($request->filled('website')) {
            $website = trim($request->website);
            // Add https:// if no protocol is present
            if (!preg_match('/^https?:\/\//', $website)) {
                $website = 'https://' . $website;
            }
            $request->merge(['website' => $website]);
        }

        $validationRules = [
            'name' => 'required|string|max:255',
            'website' => 'nullable|url|max:255',
            'description' => 'nullable|string|max:1000',
            'country' => 'nullable|string|max:100',
            'prompts' => 'array|max:25',
            'prompts.*' => 'required|string|max:500',
            'subreddits' => 'array|max:20',
            'subreddits.*' => 'required|string|max:100',
            'competitors' => 'array|max:50',
            'competitors.*.name' => 'required|string|max:255',
            'competitors.*.domain' => 'required|url|max:255',
            'competitors.*.source' => 'nullable|string|in:ai,manual',
            'monthly_posts' => 'required|integer|min:1|max:1000',
            'create_account' => 'boolean',
        ];

        // Add account validation rules only if creating an account
        if ($request->boolean('create_account')) {
            $validationRules['brand_email'] = 'required|email|unique:users,email';
            $validationRules['brand_password'] = 'required|string|min:8';
        }

        $request->validate($validationRules);

        $brand = DB::transaction(function () use ($request) {
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

            // Create competitors if provided
            if ($request->has('competitors') && !empty($request->competitors)) {
                foreach ($request->competitors as $index => $competitorData) {
                    \App\Models\Competitor::create([
                        'brand_id' => $brand->id,
                        'name' => $competitorData['name'],
                        'domain' => $competitorData['domain'],
                        'source' => $competitorData['source'] ?? 'manual',
                        'status' => 'accepted',
                        'mentions' => 0,
                        'rank' => $index + 1, // Assign rank based on position (1, 2, 3, etc.)
                        'sentiment' => 0.6, // Default sentiment score for new competitors
                        'visibility' => 0.7, // Default visibility score for new competitors
                    ]);
                }
            }

            return $brand;
        });

        // Store the newly created brand in session
        session(['selected_brand_id' => $brand->id]);

        return redirect()->route('brands.dashboard', $brand)->with('success', 'Brand created successfully!');
    }

    /**
     * Store step 1 - Create draft brand with basic info
     */
    public function storeStep1(Request $request)
    {
        // Normalize website URL if provided
        if ($request->filled('website')) {
            $website = trim($request->website);
            if (!preg_match('/^https?:\/\//', $website)) {
                $website = 'https://' . $website;
            }
            $request->merge(['website' => $website]);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'website' => 'nullable|url|max:255',
            'description' => 'nullable|string|max:1000',
            'country' => 'nullable|string|max:100',
        ]);

        /** @var User $agency */
        $agency = Auth::user();

        $brand = Brand::create([
            'agency_id' => $agency->id,
            'name' => $request->name,
            'website' => $request->website,
            'description' => $request->description,
            'country' => $request->country,
            'monthly_posts' => 10, // Default value
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'brand_id' => $brand->id,
            'redirect_url' => route('brands.create.step', ['brand' => $brand->id, 'step' => 2]),
            'message' => 'Brand draft created successfully'
        ]);
    }

    /**
     * Show a specific step in the brand creation process
     */
    public function showCreateStep(Brand $brand, int $step)
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency
        if ($brand->agency_id !== $user->id) {
            abort(403);
        }

        // Ensure brand is in pending status (being created)
        if ($brand->status !== 'pending') {
            return redirect()->route('brands.dashboard', $brand)
                ->with('info', 'This brand has already been created.');
        }

        // Get enabled AI models for prompt generation
        $aiModels = AiModel::enabled()->ordered()->get();

        // Load existing data based on step
        $existingData = [
            'brand' => [
                'id' => $brand->id,
                'name' => $brand->name,
                'website' => $brand->website,
                'description' => $brand->description,
                'country' => $brand->country,
                'monthly_posts' => $brand->monthly_posts,
            ],
            'competitors' => [],
            'prompts' => [],
        ];

        // Load competitors if step >= 2
        if ($step >= 2) {
            $existingData['competitors'] = $brand->competitors()
                ->select('id', 'name', 'domain', 'source', 'status', 'mentions')
                ->get()
                ->toArray();
        }

        // Load prompts if step >= 3
        if ($step >= 3) {
            $existingData['prompts'] = $brand->prompts()
                ->select('id', 'prompt', 'ai_model_id', 'is_active', 'status', 'order', 'visibility', 'sentiment', 'position', 'created_at')
                ->with('aiModel:id,name')
                ->orderBy('order')
                ->get()
                ->map(function ($prompt) {
                    return [
                        'id' => $prompt->id,
                        'prompt' => $prompt->prompt,
                        'source' => $prompt->aiModel->name ?? 'ai',
                        'ai_provider' => $prompt->aiModel->name ?? 'openai',
                        'is_selected' => $prompt->is_active,
                        'status' => $prompt->status ?? 'suggested', // Include status: suggested, active, inactive
                        'order' => $prompt->order,
                        'visibility' => $prompt->visibility ?? 50,
                        'sentiment' => $prompt->sentiment ?? 'neutral',
                        'position' => $prompt->position ?? 0,
                        'created_at' => $prompt->created_at?->toISOString(),
                    ];
                })
                ->toArray();
        }

        return Inertia::render('brands/create/index', [
            'currentStep' => $step,
            'existingData' => $existingData,
            'aiModels' => $aiModels,
            'sessionId' => session()->getId(),
        ]);
    }

    /**
     * Update step 2 - Add competitors
     */
    public function updateStep2(Request $request, Brand $brand)
    {
        $request->validate([
            'competitors' => 'array|max:50',
            'competitors.*.name' => 'required|string|max:255',
            'competitors.*.domain' => 'required|url|max:255',
            'competitors.*.source' => 'nullable|string|in:ai,manual',
        ]);

        // Delete existing competitors for this draft brand
        $brand->competitors()->delete();

        // Create new competitors
        if ($request->has('competitors') && !empty($request->competitors)) {
            foreach ($request->competitors as $index => $competitorData) {
                \App\Models\Competitor::create([
                    'brand_id' => $brand->id,
                    'name' => $competitorData['name'],
                    'domain' => $competitorData['domain'],
                    'source' => $competitorData['source'] ?? 'manual',
                    'status' => 'accepted',
                    'mentions' => 0,
                    'rank' => $index + 1,
                    'sentiment' => 0.6,
                    'visibility' => 0.7,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'redirect_url' => route('brands.create.step', ['brand' => $brand->id, 'step' => 3]),
            'message' => 'Competitors updated successfully'
        ]);
    }

    /**
     * Update step 3 - Navigation only (prompts saved via saveBulkPrompts API)
     */
    public function updateStep3(Request $request, Brand $brand)
    {
        // Prompts are now managed via saveBulkPrompts and updatePromptStatus APIs
        // This method only handles navigation to the next step
        
        return response()->json([
            'success' => true,
            'redirect_url' => route('brands.create.step', ['brand' => $brand->id, 'step' => 4]),
            'message' => 'Moving to next step'
        ]);
    }

    /**
     * Update step 4 - Set monthly posts
     */
    public function updateStep4(Request $request, Brand $brand)
    {
        $request->validate([
            'monthly_posts' => 'required|integer|min:1|max:1000',
        ]);

        $brand->update([
            'monthly_posts' => $request->monthly_posts,
        ]);

        return response()->json([
            'success' => true,
            'redirect_url' => route('brands.create.step', ['brand' => $brand->id, 'step' => 5]),
            'message' => 'Monthly posts updated successfully'
        ]);
    }

    /**
     * Update step 5 - Finalize brand (account setup and activation)
     */
    public function updateStep5(Request $request, Brand $brand)
    {
        $validationRules = [
            'create_account' => 'boolean',
        ];

        // Add account validation rules only if creating an account
        if ($request->boolean('create_account')) {
            $validationRules['brand_email'] = 'required|email|unique:users,email';
            $validationRules['brand_password'] = 'required|string|min:8';
        }

        $request->validate($validationRules);

        DB::transaction(function () use ($request, $brand) {
            // Create brand user account only if requested
            if ($request->boolean('create_account')) {
                $brandUser = User::create([
                    'name' => $brand->name . ' User',
                    'email' => $request->brand_email,
                    'password' => Hash::make($request->brand_password),
                    'email_verified_at' => now(),
                ]);
                $brandUser->assignRole('brand');
                
                $brand->update(['user_id' => $brandUser->id]);
            }

            // Activate the brand
            $brand->update(['status' => 'active']);
        });

        // Store the brand in session
        session(['selected_brand_id' => $brand->id]);

        return response()->json([
            'success' => true,
            'brand_id' => $brand->id,
            'redirect_url' => route('brands.dashboard', $brand),
            'message' => 'Brand created successfully!'
        ]);
    }

    /**
     * Save AI-generated competitors in bulk with 'suggested' status
     */
    public function saveBulkCompetitors(Request $request, Brand $brand)
    {
        $request->validate([
            'competitors' => 'required|array',
            'competitors.*.name' => 'required|string|max:255',
            'competitors.*.domain' => 'required|url|max:255',
            'competitors.*.source' => 'nullable|string|in:ai,manual',
            'competitors.*.mentions' => 'nullable|integer',
        ]);

        $savedCompetitors = [];
        
        foreach ($request->competitors as $index => $competitorData) {
            // Check if competitor already exists for this brand
            $existing = \App\Models\Competitor::where('brand_id', $brand->id)
                ->where('domain', $competitorData['domain'])
                ->first();
            
            if (!$existing) {
                $competitor = \App\Models\Competitor::create([
                    'brand_id' => $brand->id,
                    'name' => $competitorData['name'],
                    'domain' => $competitorData['domain'],
                    'source' => $competitorData['source'] ?? 'ai',
                    'status' => 'suggested', // Save as suggested initially
                    'mentions' => $competitorData['mentions'] ?? 0,
                    'rank' => $index + 1,
                    'sentiment' => 0.6,
                    'visibility' => 0.7,
                ]);
                
                $savedCompetitors[] = [
                    'id' => $competitor->id,
                    'name' => $competitor->name,
                    'domain' => $competitor->domain,
                    'source' => $competitor->source,
                    'status' => $competitor->status,
                    'mentions' => $competitor->mentions,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'competitors' => $savedCompetitors,
            'message' => 'Competitors saved successfully'
        ]);
    }

    /**
     * Update individual competitor status
     */
    public function updateCompetitorStatus(Request $request, Brand $brand, $competitorId)
    {
        $request->validate([
            'status' => 'required|in:suggested,accepted,rejected',
        ]);

        $competitor = \App\Models\Competitor::where('brand_id', $brand->id)
            ->where('id', $competitorId)
            ->firstOrFail();

        $competitor->update(['status' => $request->status]);

        return response()->json([
            'success' => true,
            'competitor' => [
                'id' => $competitor->id,
                'status' => $competitor->status,
            ],
            'message' => 'Competitor status updated'
        ]);
    }

    /**
     * Save AI-generated prompts in bulk with is_active=0 (suggested)
     */
    public function saveBulkPrompts(Request $request, Brand $brand)
    {
        $request->validate([
            'prompts' => 'required|array|max:100',
            'prompts.*.prompt' => 'required|string|max:500',
            'prompts.*.source' => 'nullable|string',
            'prompts.*.is_active' => 'nullable|boolean',
            'prompts.*.order' => 'nullable|integer',
            'prompts.*.visibility' => 'nullable',
            'prompts.*.sentiment' => 'nullable',
            'prompts.*.position' => 'nullable',
        ]);

        $savedPrompts = [];
        
        foreach ($request->prompts as $index => $promptData) {
            $promptText = is_array($promptData) ? $promptData['prompt'] : $promptData;
            
            // Check if prompt already exists for this brand
            $existing = \App\Models\BrandPrompt::where('brand_id', $brand->id)
                ->where('prompt', $promptText)
                ->first();
            
            if (!$existing) {
                // Find AI model by name if source is provided
                $aiModelId = null;
                if (is_array($promptData) && isset($promptData['source'])) {
                    $aiModel = \App\Models\AiModel::where('name', $promptData['source'])->first();
                    $aiModelId = $aiModel?->id;
                }
                
                $prompt = \App\Models\BrandPrompt::create([
                    'brand_id' => $brand->id,
                    'prompt' => $promptText,
                    'order' => is_array($promptData) ? ($promptData['order'] ?? $index + 1) : $index + 1,
                    'is_active' => is_array($promptData) ? ($promptData['is_active'] ?? false) : false,
                    'status' => 'suggested', // New prompts are always suggested initially
                    'ai_model_id' => $aiModelId,
                    'visibility' => is_array($promptData) ? ($promptData['visibility'] ?? null) : null,
                    'sentiment' => is_array($promptData) ? ($promptData['sentiment'] ?? null) : null,
                    'position' => is_array($promptData) ? ($promptData['position'] ?? null) : null,
                ]);
                
                $savedPrompts[] = [
                    'id' => $prompt->id,
                    'prompt' => $prompt->prompt,
                    'is_active' => $prompt->is_active,
                    'order' => $prompt->order,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'prompts' => $savedPrompts,
            'message' => 'Prompts saved successfully'
        ]);
    }

    /**
     * Update individual prompt status (activate/deactivate/reject)
     */
    public function updatePromptStatus(Request $request, Brand $brand, $promptId)
    {
        $request->validate([
            'is_active' => 'sometimes|boolean',
            'status' => 'sometimes|in:suggested,active,inactive',
        ]);

        $prompt = \App\Models\BrandPrompt::where('brand_id', $brand->id)
            ->where('id', $promptId)
            ->firstOrFail();

        $updateData = [];
        
        // Handle status update
        if ($request->has('status')) {
            $updateData['status'] = $request->status;
            // Sync is_active with status
            $updateData['is_active'] = $request->status === 'active';
        } elseif ($request->has('is_active')) {
            // Legacy support: if only is_active is sent
            $updateData['is_active'] = $request->is_active;
            $updateData['status'] = $request->is_active ? 'active' : 'suggested';
        }
        
        $prompt->update($updateData);

        return response()->json([
            'success' => true,
            'prompt' => [
                'id' => $prompt->id,
                'is_active' => $prompt->is_active,
                'status' => $prompt->status,
            ],
            'message' => 'Prompt status updated'
        ]);
    }

    /**
     * Display the specified brand.
     */
    public function show(Brand $brand): Response
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency or user is admin
        if ($brand->agency_id !== $user->id && !$user->hasRole('admin')) {
            abort(403);
        }

        // Store selected brand in session
        session(['selected_brand_id' => $brand->id]);

        $brand->load([
            'prompts.promptResources',
            'prompts.aiModel',
            'subreddits', 
            'user', 
            'competitors' => function($query) {
                // Only show accepted competitors
                $query->where('status', 'accepted')
                      // Prioritize competitors added during brand creation (ai/manual) over seeded ones
                      ->orderByRaw("CASE WHEN source IN ('ai', 'manual') THEN 0 ELSE 1 END")
                      ->orderBy('rank')
                      ->take(10);
            }
        ]);

        // Get competitive stats with trends
        $competitiveAnalysisService = app(\App\Services\CompetitiveAnalysisService::class);
        $competitiveStats = $competitiveAnalysisService->getLatestStatsWithTrends($brand);

        // If no stats exist, create placeholder entries for brand and accepted competitors
        if (empty($competitiveStats)) {
            $competitiveStats = [];
            
            // Add brand placeholder
            $competitiveStats[] = [
                'id' => 0,
                'entity_type' => 'brand',
                'entity_name' => $brand->name,
                'entity_url' => $brand->website ?? $brand->domain ?? '',
                'visibility' => 0,
                'sentiment' => 0,
                'position' => 0,
                'analyzed_at' => null,
                'trends' => [
                    'visibility_trend' => 'new',
                    'sentiment_trend' => 'new',
                    'position_trend' => 'new',
                    'visibility_change' => 0,
                    'sentiment_change' => 0,
                    'position_change' => 0,
                ],
                'visibility_percentage' => 'N/A',
                'position_formatted' => 'N/A',
                'sentiment_level' => 'N/A',
            ];

            // Add accepted competitors as placeholders
            foreach ($brand->competitors as $competitor) {
                $competitiveStats[] = [
                    'id' => 0,
                    'entity_type' => 'competitor',
                    'entity_name' => $competitor->name,
                    'entity_url' => $competitor->domain,
                    'visibility' => 0,
                    'sentiment' => 0,
                    'position' => 0,
                    'analyzed_at' => null,
                    'trends' => [
                        'visibility_trend' => 'new',
                        'sentiment_trend' => 'new',
                        'position_trend' => 'new',
                        'visibility_change' => 0,
                        'sentiment_change' => 0,
                        'position_change' => 0,
                    ],
                    'visibility_percentage' => 'N/A',
                    'position_formatted' => 'N/A',
                    'sentiment_level' => 'N/A',
                ];
            }
        }

        return Inertia::render('brands/show', [
            'brand' => $brand,
            'competitiveStats' => $competitiveStats,
        ]);
    }

    /**
     * Display the brand-specific dashboard.
     */
    public function dashboard(Brand $brand): Response
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency or user is admin
        if ($brand->agency_id !== $user->id && !$user->hasRole('admin')) {
            abort(403);
        }

        // Store selected brand in session
        session(['selected_brand_id' => $brand->id]);

        // You can add brand-specific dashboard data here
        // For now, just render the dashboard with brand context
        return Inertia::render('dashboard', [
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
        
        // Ensure the brand belongs to the authenticated agency or user is admin
        if ($brand->agency_id !== $user->id && !$user->hasRole('admin')) {
            abort(403);
        }

        $brand->load(['prompts', 'subreddits']);

        // Get all AI models with their status
        $aiModels = AiModel::all()->map(function ($model) {
            return [
                'id' => $model->id,
                'name' => $model->name,
                'display_name' => $model->display_name,
                'is_enabled' => $model->is_enabled,
                'provider' => $model->provider,
            ];
        });

        return Inertia::render('brands/edit', [
            'brand' => $brand,
            'aiModels' => $aiModels,
        ]);
    }

    /**
     * Update the specified brand in storage.
     */
    public function update(Request $request, Brand $brand): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency or user is admin
        if ($brand->agency_id !== $user->id && !$user->hasRole('admin')) {
            abort(403);
        }

        // Normalize website URL if provided
        if ($request->filled('website')) {
            $website = trim($request->website);
            // Add https:// if no protocol is present
            if (!preg_match('/^https?:\/\//', $website)) {
                $website = 'https://' . $website;
            }
            $request->merge(['website' => $website]);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'website' => 'nullable|url|max:255',
            'description' => 'nullable|string|max:1000',
            'country' => 'nullable|string|max:100',
            'monthly_posts' => 'required|integer|min:1|max:1000',
            'status' => 'nullable|in:active,inactive,pending',
            'prompts' => 'array|max:25',
            'prompts.*' => 'required|string|max:500',
            'subreddits' => 'array|max:20',
            'subreddits.*' => 'required|string|max:100',
        ]);

        DB::transaction(function () use ($request, $brand) {
            // Update brand basic info and status
            $brand->update([
                'name' => $request->name,
                'website' => $request->website,
                'description' => $request->description,
                'country' => $request->country,
                'monthly_posts' => $request->monthly_posts,
                'status' => $request->status ?? $brand->status,
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

        return redirect()->route('brands.edit', $brand)->with('success', 'Brand updated successfully!');
    }

    /**
     * Update the brand status.
     */
    public function updateStatus(Request $request, Brand $brand): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency or user is admin
        if ($brand->agency_id !== $user->id && !$user->hasRole('admin')) {
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
        
        // Ensure the brand belongs to the authenticated agency or user is admin
        if ($brand->agency_id !== $user->id && !$user->hasRole('admin')) {
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
        // Normalize website URL if provided
        if ($request->filled('website')) {
            $website = trim($request->website);
            // Add https:// if no protocol is present
            if (!preg_match('/^https?:\/\//', $website)) {
                $website = 'https://' . $website;
            }
            $request->merge(['website' => $website]);
        }

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
        Log::info('generateMultiModelPrompts called', [
            'method' => $request->method(),
            'url' => $request->url(),
            'user_id' => Auth::id(),
            'data' => $request->all()
        ]);

        // Normalize website URL if provided
        if ($request->filled('website')) {
            $website = trim($request->website);
            // Add https:// if no protocol is present
            if (!preg_match('/^https?:\/\//', $website)) {
                $website = 'https://' . $website;
            }
            $request->merge(['website' => $website]);
        }

        $request->validate([
            'website' => 'required|url',
            'description' => 'nullable|string|max:1000',
        ]);

        try {
            $aiService = app(\App\Services\AIPromptService::class);
            
            // Get enabled AI models
            $enabledModels = \App\Models\AiModel::where('is_enabled', true)->get();
            
            if ($enabledModels->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No AI models are enabled. Please enable at least one AI model in admin settings.',
                ]);
            }

            $allPrompts = [];
            $order = 1;
            $tempSessionId = 'temp_' . uniqid(); // Temporary session to avoid conflicts
            
            // Generate prompts from each enabled model
            foreach ($enabledModels as $aiModel) {
                try {
                    // Generate prompts (they'll be stored in GeneratedPrompt temporarily)
                    $generatedPrompts = $aiService->generatePromptsForWebsite(
                        $request->website,
                        $tempSessionId,
                        $aiModel->name,
                        $request->description ?? '',
                        $aiModel->prompts_per_brand
                    );
                    
                    if (!empty($generatedPrompts)) {
                        foreach ($generatedPrompts as $generated) {
                            $allPrompts[] = [
                                'id' => 'temp_' . uniqid(), // Temporary ID until saved to brand_prompts
                                'prompt' => $generated->prompt,
                                'source' => $aiModel->name,
                                'ai_provider' => $aiModel->display_name,
                                'is_selected' => false,
                                'order' => $order++,
                                'created_at' => now()->toISOString(),
                                // Add mock stats
                                'visibility' => $this->generateMockVisibility(),
                                'sentiment' => $this->generateMockSentiment(),
                                'position' => $this->generateMockPosition(),
                                'mentions' => $this->generateMockMentions(),
                                'volume' => $this->generateMockVolume(),
                                'location' => 'USA',
                            ];
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to generate prompts from AI model', [
                        'model' => $aiModel->name,
                        'error' => $e->getMessage(),
                    ]);
                    // Continue with other models even if one fails
                }
            }
            
            // Clean up temporary GeneratedPrompt records
            \App\Models\GeneratedPrompt::where('session_id', $tempSessionId)->delete();

            if (empty($allPrompts)) {
                $modelInfo = $enabledModels->map(function($model) {
                    return [
                        'name' => $model->name,
                        'display_name' => $model->display_name,
                        'has_api_key' => !empty($model->api_config['api_key'] ?? null),
                    ];
                });

                Log::warning('No AI prompts generated during brand creation', [
                    'website' => $request->website,
                    'enabled_models_count' => $enabledModels->count(),
                    'models' => $modelInfo
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'No prompts were generated from AI models. Please ensure at least one AI model is properly configured with a valid API key.',
                    'debug_info' => [
                        'enabled_models' => $modelInfo->toArray()
                    ]
                ]);
            }

            return response()->json([
                'success' => true,
                'prompts' => $allPrompts,
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
        
        // Normalize website URL if provided
        if ($request->filled('website')) {
            $website = trim($request->website);
            // Add https:// if no protocol is present
            if (!preg_match('/^https?:\/\//', $website)) {
                $website = 'https://' . $website;
            }
            $request->merge(['website' => $website]);
        }
        
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
                $request->description ?? ''
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
        // Normalize website URL if provided
        if ($request->filled('website')) {
            $website = trim($request->website);
            // Add https:// if no protocol is present
            if (!preg_match('/^https?:\/\//', $website)) {
                $website = 'https://' . $website;
            }
            $request->merge(['website' => $website]);
        }
        
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

    /**
     * Get prompts that contain competitor URLs in their resources
     */
    public function getPromptsWithCompetitorUrls(Brand $brand, Request $request)
    {
        $request->validate([
            'competitor_domain' => 'required|string'
        ]);

        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency or user is admin
        if ($brand->agency_id !== $user->id && !$user->hasRole('admin')) {
            abort(403);
        }

        $competitorDomain = $request->competitor_domain;
        
        // Get prompts that have resources containing the competitor domain using the new resources table
        $prompts = BrandPrompt::where('brand_id', $brand->id)
            ->whereNotNull('analysis_completed_at')
            ->whereHas('promptResources', function ($query) use ($competitorDomain) {
                $query->where('domain', 'like', "%{$competitorDomain}%")
                      ->orWhere('url', 'like', "%{$competitorDomain}%");
            })
            ->with(['promptResources' => function ($query) use ($competitorDomain) {
                $query->where('domain', 'like', "%{$competitorDomain}%")
                      ->orWhere('url', 'like', "%{$competitorDomain}%");
            }])
            ->orderBy('analysis_completed_at', 'desc')
            ->get()
            ->map(function ($prompt) use ($competitorDomain) {
                // Get all competitor resources for this prompt
                $competitorResources = $prompt->promptResources->map(function ($resource) {
                    return [
                        'url' => $resource->url,
                        'type' => $resource->type,
                        'title' => $resource->title,
                        'description' => $resource->description,
                        'domain' => $resource->domain,
                        'is_competitor_url' => $resource->is_competitor_url
                    ];
                })->toArray();
                
                return [
                    'id' => $prompt->id,
                    'prompt' => $prompt->prompt,
                    'ai_response' => $prompt->ai_response,
                    'sentiment' => $prompt->sentiment,
                    'position' => $prompt->position,
                    'visibility' => $prompt->visibility,
                    'competitor_mentions' => $prompt->competitor_mentions,
                    'competitor_resources' => $competitorResources,
                    'analysis_completed_at' => $prompt->analysis_completed_at,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'prompts' => $prompts,
            'competitor_domain' => $competitorDomain,
            'total_count' => $prompts->count()
        ]);
    }

    /**
     * Trigger analysis for all prompts of a brand
     */
    public function triggerPromptAnalysis(Brand $brand, Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency or user is admin
        if ($brand->agency_id !== $user->id && !$user->hasRole('admin')) {
            abort(403);
        }

        $forceRegenerate = $request->boolean('force', false);
        $sessionId = $request->get('session_id', \Illuminate\Support\Str::uuid()->toString());

        // Get only ACTIVE prompts for this brand (is_active = true)
        $prompts = BrandPrompt::where('brand_id', $brand->id)
            ->where('is_active', true)
            ->get();

        if ($prompts->isEmpty()) {
            return response()->json([
                'success' => false,
                'error' => 'No active prompts found for this brand'
            ], 404);
        }

        $jobsQueued = 0;
        foreach ($prompts as $prompt) {
            // Skip if already analyzed and not forcing regeneration
            if (!$forceRegenerate && 
                $prompt->analysis_completed_at && 
                $prompt->ai_response) {
                continue;
            }

            \App\Jobs\ProcessBrandPromptAnalysis::dispatch($prompt, $sessionId, $forceRegenerate)
                ->onQueue('default');
            
            $jobsQueued++;
        }

        return response()->json([
            'success' => true,
            'message' => "Queued {$jobsQueued} analysis jobs",
            'session_id' => $sessionId,
            'total_prompts' => $prompts->count(),
            'jobs_queued' => $jobsQueued
        ]);
    }

    /**
     * Generate mock visibility percentage (10-90%)
     */
    private function generateMockVisibility(): string
    {
        return rand(10, 90) . '%';
    }

    /**
     * Generate mock sentiment score (50-95)
     */
    private function generateMockSentiment(): int
    {
        return rand(50, 95);
    }

    /**
     * Generate mock position (1.0-10.0)
     */
    private function generateMockPosition(): string
    {
        return number_format(rand(10, 100) / 10, 1);
    }

    /**
     * Generate mock mentions count (0-100)
     */
    private function generateMockMentions(): int
    {
        return rand(0, 100);
    }

    /**
     * Generate mock volume count (100-10000)
     */
    private function generateMockVolume(): int
    {
        return rand(100, 10000);
    }
}

