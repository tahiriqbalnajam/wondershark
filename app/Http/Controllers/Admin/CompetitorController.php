<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiModel;
use App\Models\Brand;
use App\Models\Competitor;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CompetitorController extends Controller
{
    public function index(Request $request)
    {
        $query = Competitor::with(['brand.agency']);

        // Apply filters
        if ($request->agency_id) {
            $query->whereHas('brand', function ($brandQuery) use ($request) {
                $brandQuery->where('agency_id', $request->agency_id);
            });
        }

        if ($request->brand_id) {
            $query->where('brand_id', $request->brand_id);
        }

        $competitors = $query->orderBy('created_at', 'desc')->paginate(20);

        // Get filter options
        $agencies = User::role('agency')->orderBy('name')->get(['id', 'name']);
        $brands = Brand::with('agency')->orderBy('name')->get(['id', 'name', 'agency_id', 'website']);

        return Inertia::render('admin/competitors/index', [
            'competitors' => $competitors->through(function ($competitor) {
                return [
                    'id' => $competitor->id,
                    'name' => $competitor->name,
                    'domain' => $competitor->domain,
                    'description' => $competitor->description,
                    'status' => $competitor->status ?? 'active',
                    'created_at' => $competitor->created_at,
                    'brand' => [
                        'id' => $competitor->brand->id,
                        'name' => $competitor->brand->name,
                        'agency' => $competitor->brand->agency ? [
                            'id' => $competitor->brand->agency->id,
                            'name' => $competitor->brand->agency->name,
                        ] : null,
                    ],
                ];
            }),
            'filters' => [
                'agency_id' => $request->agency_id,
                'brand_id' => $request->brand_id,
            ],
            'agencies' => $agencies,
            'brands' => $brands,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'name' => 'required|string|max:255',
            'trackedName' => 'required|string|max:255',
            'domain' => 'required|url|max:255',
        ]);

        $validated['status'] = 'accepted';
        $validated['source'] = 'manual';
        $validated['mentions'] = 0;

        Competitor::create($validated);

        return redirect()->back()->with('success', 'Competitor added successfully.');
    }

    public function update(Request $request, Competitor $competitor)
    {
        $validated = $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'name' => 'required|string|max:255',
            'trackedName' => 'required|string|max:255',
            'domain' => 'required|url|max:255',
        ]);

        $competitor->update($validated);

        return redirect()->back()->with('success', 'Competitor updated successfully.');
    }

    public function destroy(Competitor $competitor)
    {
        $competitor->delete();

        return redirect()->back()->with('success', 'Competitor deleted successfully.');
    }

    /**
     * Fetch competitors from AI for a specific brand
     */
    public function fetchFromAI(Request $request)
    {
        $validated = $request->validate([
            'brand_id' => 'required|exists:brands,id',
        ]);

        $brand = Brand::findOrFail($validated['brand_id']);

        if (! $brand->website) {
            return response()->json([
                'success' => false,
                'error' => 'Brand must have a website to fetch competitors.',
            ], 400);
        }

        try {
            // Get the first enabled AI model with a valid API key
            $aiModel = AiModel::where('is_enabled', true)
                ->get()
                ->filter(function ($model) {
                    $config = $model->api_config;

                    return ! empty($config['api_key']);
                })
                ->first();

            if (! $aiModel) {
                return response()->json([
                    'success' => false,
                    'error' => 'No AI model with valid API key found. Please configure an API key for at least one AI model.',
                ], 400);
            }

            // Get existing competitor domains to avoid duplicates
            $existingDomains = $brand->competitors()->pluck('domain')->toArray();

            // Prepare the prompt with existing competitors context
            $prompt = $this->getCompetitorPrompt($brand, $existingDomains);

            Log::info('Admin fetching competitors for brand', [
                'brand_id' => $brand->id,
                'brand_name' => $brand->name,
                'ai_model' => $aiModel->name,
            ]);

            // Make API call based on the model type
            $apiKey = $aiModel->api_config['api_key'];

            if ($aiModel->name === 'perplexity') {
                $response = Http::timeout(60)
                    ->withToken($apiKey)
                    ->post('https://api.perplexity.ai/chat/completions', [
                        'model' => $aiModel->api_config['model'] ?? 'sonar-pro',
                        'messages' => [
                            ['role' => 'system', 'content' => 'You are a helpful assistant that responds only with valid JSON arrays. Do not include any explanatory text or markdown formatting.'],
                            ['role' => 'user', 'content' => $prompt],
                        ],
                    ]);
            } elseif ($aiModel->name === 'anthropic') {
                $response = Http::timeout(60)
                    ->withHeaders([
                        'x-api-key' => $apiKey,
                        'anthropic-version' => '2023-06-01',
                        'content-type' => 'application/json',
                    ])
                    ->post('https://api.anthropic.com/v1/messages', [
                        'model' => $aiModel->api_config['model'] ?? 'claude-3-5-sonnet-20240620',
                        'max_tokens' => 2000,
                        'messages' => [
                            ['role' => 'user', 'content' => $prompt],
                        ],
                    ]);
            } elseif ($aiModel->name === 'openai') {
                $response = Http::timeout(60)
                    ->withToken($apiKey)
                    ->post('https://api.openai.com/v1/chat/completions', [
                        'model' => $aiModel->api_config['model'] ?? 'gpt-4',
                        'messages' => [
                            ['role' => 'system', 'content' => 'You are a helpful assistant that responds only with valid JSON arrays. Do not include any explanatory text or markdown formatting.'],
                            ['role' => 'user', 'content' => $prompt],
                        ],
                    ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Unsupported AI model type',
                ], 400);
            }

            if (! $response->successful()) {
                Log::error('AI API request failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Failed to get response from AI: '.$response->body(),
                ], 500);
            }

            $responseData = $response->json();

            // Extract content based on AI model response format
            if ($aiModel->name === 'perplexity' || $aiModel->name === 'openai') {
                $content = $responseData['choices'][0]['message']['content'] ?? '';
            } elseif ($aiModel->name === 'anthropic') {
                $content = $responseData['content'][0]['text'] ?? '';
            } else {
                $content = '';
            }

            // Clean the content - remove markdown code blocks if present
            $content = preg_replace('/^```json\s*/m', '', $content);
            $content = preg_replace('/\s*```$/m', '', $content);
            $content = trim($content);

            $competitors = json_decode($content, true);

            if (! is_array($competitors)) {
                Log::error('Failed to parse competitors JSON', ['content' => $content]);

                return response()->json([
                    'success' => false,
                    'error' => 'Failed to parse AI response as JSON',
                ], 500);
            }

            // Filter out existing competitors and save new ones
            $newCompetitors = [];
            foreach ($competitors as $competitorData) {
                if (! isset($competitorData['name']) || ! isset($competitorData['domain'])) {
                    continue;
                }

                // Skip if domain already exists
                if (in_array($competitorData['domain'], $existingDomains)) {
                    continue;
                }

                $newCompetitors[] = $competitorData;
            }

            return response()->json([
                'success' => true,
                'competitors' => $newCompetitors,
                'ai_model_used' => $aiModel->display_name,
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching competitors for admin', [
                'error' => $e->getMessage(),
                'brand_id' => $brand->id,
            ]);

            return response()->json([
                'success' => false,
                'error' => 'An error occurred while fetching competitors: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get competitor prompt for a brand
     */
    private function getCompetitorPrompt(Brand $brand, array $existingDomains = []): string
    {
        $brandUrl = $brand->website;
        $description = $brand->description ?? '';

        $excludeText = '';
        if (! empty($existingDomains)) {
            $excludeList = implode('", "', $existingDomains);
            $excludeText = "\n\nIMPORTANT: Exclude these existing competitors: \"{$excludeList}\"";
        }

        return <<<PROMPT
        I need you to identify the top 5-7 direct competitors for the brand: {$brand->name}

        Website: {$brandUrl}
        Description: {$description}{$excludeText}

        Please analyze this brand and identify its main competitors in the same industry/niche. Focus on:
        1. Direct competitors offering similar products/services
        2. Companies targeting the same customer base  
        3. Brands with similar market positioning

        For each competitor, provide:
        - Company name
        - Website domain (full URL with https://)
        - Estimated mentions/relevance score (10-50)

        Return the results as a JSON array with objects containing 'name', 'domain', and 'mentions' fields:

        [
        {"name": "Company Name", "domain": "https://example.com", "mentions": 25},
        {"name": "Another Company", "domain": "https://another.com", "mentions": 30}
        ]

        Respond with ONLY the JSON array, nothing else.
        PROMPT;
    }
}
