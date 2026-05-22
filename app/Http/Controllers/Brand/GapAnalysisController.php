<?php

namespace App\Http\Controllers\Brand;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandPrompt;
use App\Models\WebsiteUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class GapAnalysisController extends Controller
{
    public function index(Request $request, Brand $brand)
    {
        $user = Auth::user();

        if (! $user->canAccessBrand($brand)) {
            abort(403);
        }

        // Get all enabled website URLs and extract their domains
        $websiteUrlDomains = WebsiteUrl::enabled()->ordered()->get()
            ->map(fn ($wu) => $this->extractDomain($wu->url))
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        // Get analyzed prompts for this brand
        $prompts = BrandPrompt::where('brand_id', $brand->id)
            ->whereNotNull('analysis_completed_at')
            ->with(['aiModel', 'promptResources', 'mentions.competitor'])
            ->orderBy('analysis_completed_at', 'desc')
            ->get();

        $results = $prompts->map(function ($prompt) use ($websiteUrlDomains) {
            // Build all resources, flagging which ones match website_urls domains
            $allResources = $prompt->promptResources
                ->map(function ($resource) use ($websiteUrlDomains) {
                    $resourceDomain = strtolower($resource->domain ?? '');
                    $matches = false;
                    if ($resourceDomain) {
                        foreach ($websiteUrlDomains as $wuDomain) {
                            if ($resourceDomain === $wuDomain || str_ends_with($resourceDomain, '.' . $wuDomain)) {
                                $matches = true;
                                break;
                            }
                        }
                    }
                    return [
                        'url' => $resource->url,
                        'type' => $resource->type,
                        'title' => $resource->title,
                        'domain' => $resource->domain,
                        'is_matching' => $matches,
                    ];
                })
                ->values();

            // Skip prompts with no matching resources
            if ($allResources->where('is_matching', true)->isEmpty()) {
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

            // Skip prompts with no competitor mentions
            if ($competitorMentions->isEmpty()) {
                return null;
            }

            // Filter out unreachable resources before sending to frontend
            $validResources = $allResources->filter(fn ($r) => url_exists($r['url']))->values();

            // Skip prompts with no valid matching resources
            if ($validResources->where('is_matching', true)->isEmpty()) {
                return null;
            }

            return [
                'id' => $prompt->id,
                'prompt' => $prompt->prompt,
                'ai_model' => $prompt->aiModel ? [
                    'id' => $prompt->aiModel->id,
                    'display_name' => $prompt->aiModel->display_name,
                    'name' => $prompt->aiModel->name,
                ] : null,
                'resources' => $validResources,
                'brand_mentioned' => $brandMentioned,
                'competitor_mentions' => $competitorMentions,
            ];
        })->filter()->values();

        return Inertia::render('brands/gap-analysis/index', [
            'brand' => [
                'id' => $brand->id,
                'name' => $brand->name,
                'campaign_indicator' => $brand->campaign_indicator,
            ],
            'results' => $results,
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
