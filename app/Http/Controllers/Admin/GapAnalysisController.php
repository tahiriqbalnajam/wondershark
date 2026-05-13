<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandPrompt;
use App\Models\User;
use App\Models\WebsiteUrl;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GapAnalysisController extends Controller
{
    public function index(Request $request)
    {
        $agencies = User::role('agency')->orderBy('name')->get(['id', 'name']);
        $brands = Brand::with('agency')->orderBy('name')->get(['id', 'name', 'agency_id']);

        $results = collect();
        $selectedBrand = null;

        if ($request->filled('brand_id')) {
            $selectedBrand = Brand::find($request->brand_id);

            if ($selectedBrand) {
                // Get all enabled website URLs and extract their domains
                $websiteUrlDomains = WebsiteUrl::enabled()->ordered()->get()
                    ->map(fn ($wu) => $this->extractDomain($wu->url))
                    ->filter()
                    ->unique()
                    ->values()
                    ->toArray();

                // Get analyzed prompts for this brand
                $prompts = BrandPrompt::where('brand_id', $selectedBrand->id)
                    ->whereNotNull('analysis_completed_at')
                    ->with(['aiModel', 'promptResources', 'mentions.competitor'])
                    ->orderBy('analysis_completed_at', 'desc')
                    ->get();

                $results = $prompts->map(function ($prompt) use ($websiteUrlDomains) {
                    // Filter resources that match website_urls domains
                    $matchingResources = $prompt->promptResources
                        ->filter(function ($resource) use ($websiteUrlDomains) {
                            $resourceDomain = strtolower($resource->domain ?? '');
                            if (! $resourceDomain) {
                                return false;
                            }
                            foreach ($websiteUrlDomains as $wuDomain) {
                                if ($resourceDomain === $wuDomain || str_ends_with($resourceDomain, '.' . $wuDomain)) {
                                    return true;
                                }
                            }
                            return false;
                        })
                        ->values()
                        ->map(fn ($r) => [
                            'url' => $r->url,
                            'type' => $r->type,
                            'title' => $r->title,
                            'domain' => $r->domain,
                        ]);

                    // Skip prompts with no matching resources
                    if ($matchingResources->isEmpty()) {
                        return null;
                    }

                    // Check if brand is mentioned
                    $brandMentioned = $prompt->mentions
                        ->where('entity_type', 'brand')
                        ->isNotEmpty();

                    // Get competitor mentions with competitor details
                    $competitorMentions = $prompt->mentions
                        ->where('entity_type', 'competitor')
                        ->map(function ($mention) {
                            return [
                                'competitor_id' => $mention->competitor_id,
                                'entity_name' => $mention->entity_name,
                                'entity_domain' => $mention->entity_domain,
                                'sentiment' => $mention->sentiment,
                            ];
                        })
                        ->unique('competitor_id')
                        ->values();

                    return [
                        'id' => $prompt->id,
                        'prompt' => $prompt->prompt,
                        'ai_model' => $prompt->aiModel ? [
                            'id' => $prompt->aiModel->id,
                            'display_name' => $prompt->aiModel->display_name,
                        ] : null,
                        'resources' => $matchingResources,
                        'brand_mentioned' => $brandMentioned,
                        'competitor_mentions' => $competitorMentions,
                    ];
                })->filter()->values();
            }
        }

        return Inertia::render('admin/gap-analysis/index', [
            'agencies' => $agencies,
            'brands' => $brands,
            'results' => $results,
            'selectedBrand' => $selectedBrand ? [
                'id' => $selectedBrand->id,
                'name' => $selectedBrand->name,
            ] : null,
            'filters' => $request->only(['agency_id', 'brand_id']),
        ]);
    }

    protected function extractDomain(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $url = strtolower($url);
        $url = preg_replace('#^https?://#', '', $url);
        $url = preg_replace('#^www\.#', '', $url);
        $parts = explode('/', $url);

        return $parts[0] ?? null;
    }
}
