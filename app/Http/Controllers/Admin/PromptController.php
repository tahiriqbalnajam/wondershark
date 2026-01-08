<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandPrompt;
use App\Models\PostPrompt;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PromptController extends Controller
{
    public function index(Request $request)
    {
        $prompts = collect();

        // Only build brand prompts query if not filtering for posts only
        if (! $request->type || $request->type !== 'post') {
            // Get brand prompts with relationships
            $brandPromptsQuery = BrandPrompt::with(['brand.agency'])
                ->select('id', 'brand_id', 'prompt', 'country_code', 'is_active', 'status', 'created_at')
                ->selectRaw("'brand' as type");

            // Apply filters
            if ($request->agency_id) {
                $brandPromptsQuery->whereHas('brand', function ($query) use ($request) {
                    $query->where('agency_id', $request->agency_id);
                });
            }

            if ($request->brand_id) {
                $brandPromptsQuery->where('brand_id', $request->brand_id);
            }

            $prompts = $prompts->merge($brandPromptsQuery->get());
        }

        // Only build post prompts query if not filtering for brands only
        if (! $request->type || $request->type !== 'brand') {
            // Get post prompts with relationships
            $postPromptsQuery = PostPrompt::with(['brand.agency'])
                ->select('id', 'brand_id', 'prompt', 'country_code', 'is_active', 'created_at')
                ->selectRaw("'post' as type")
                ->selectRaw('NULL as status');

            // Apply filters
            if ($request->agency_id) {
                $postPromptsQuery->whereHas('brand', function ($query) use ($request) {
                    $query->where('agency_id', $request->agency_id);
                });
            }

            if ($request->brand_id) {
                $postPromptsQuery->where('brand_id', $request->brand_id);
            }

            $prompts = $prompts->merge($postPromptsQuery->get());
        }

        // Sort by created_at descending
        $prompts = $prompts->sortByDesc('created_at')->values();

        // Paginate manually
        $page = $request->get('page', 1);
        $perPage = 20;
        $total = $prompts->count();
        $prompts = $prompts->slice(($page - 1) * $perPage, $perPage)->values();

        // Get filter options
        $agencies = User::role('agency')->orderBy('name')->get(['id', 'name']);
        $brands = Brand::with('agency')->orderBy('name')->get(['id', 'name', 'agency_id']);

        return Inertia::render('admin/prompts/index', [
            'prompts' => [
                'data' => $prompts->map(function ($prompt) {
                    return [
                        'id' => $prompt->id,
                        'prompt' => $prompt->prompt,
                        'type' => $prompt->type,
                        'country_code' => $prompt->country_code ?? '',
                        'is_active' => $prompt->is_active,
                        'status' => $prompt->status ?? null,
                        'created_at' => $prompt->created_at,
                        'brand' => [
                            'id' => $prompt->brand->id,
                            'name' => $prompt->brand->name,
                            'agency' => $prompt->brand->agency ? [
                                'id' => $prompt->brand->agency->id,
                                'name' => $prompt->brand->agency->name,
                            ] : null,
                        ],
                    ];
                }),
                'current_page' => $page,
                'last_page' => ceil($total / $perPage),
                'per_page' => $perPage,
                'total' => $total,
            ],
            'filters' => [
                'agency_id' => $request->agency_id,
                'brand_id' => $request->brand_id,
                'type' => $request->type,
            ],
            'agencies' => $agencies,
            'brands' => $brands,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'prompt' => 'nullable|string',
            'type' => 'required|in:brand,post',
            'country_code' => 'required|string|size:2',
            'generate_with_ai' => 'boolean',
        ]);

        // If AI generation is requested, generate the prompt using AI
        if ($validated['generate_with_ai'] ?? false) {
            // TODO: Implement AI prompt generation logic
            // For now, we'll create a placeholder prompt
            $validated['prompt'] = $validated['prompt']
                ?? 'AI-generated prompt for '.Brand::find($validated['brand_id'])->name;
        }

        // Ensure prompt is provided
        if (empty($validated['prompt'])) {
            return redirect()->back()->withErrors(['prompt' => 'Prompt text is required.']);
        }

        // Create the appropriate prompt type
        if ($validated['type'] === 'brand') {
            BrandPrompt::create([
                'brand_id' => $validated['brand_id'],
                'prompt' => $validated['prompt'],
                'country_code' => $validated['country_code'],
                'is_active' => true,
            ]);
        } else {
            PostPrompt::create([
                'brand_id' => $validated['brand_id'],
                'prompt' => $validated['prompt'],
                'country_code' => $validated['country_code'],
                'is_active' => true,
            ]);
        }

        return redirect()->back()->with('success', 'Prompt created successfully.');
    }

    public function destroy($id)
    {
        // Try to find in brand prompts first
        $prompt = BrandPrompt::find($id);

        if (! $prompt) {
            // Try post prompts
            $prompt = PostPrompt::find($id);
        }

        if ($prompt) {
            $prompt->delete();

            return redirect()->back()->with('success', 'Prompt deleted successfully.');
        }

        return redirect()->back()->with('error', 'Prompt not found.');
    }
}
