<?php

namespace App\Http\Controllers\Brand;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandPrompt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class BrandPromptController extends Controller
{
    public function index(Brand $brand)
    {
        // Check if user has access to this brand
        if ($brand->agency_id !== Auth::user()->id) {
            abort(403);
        }

        $prompts = $brand->prompts()
            ->orderBy('position')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($prompt) {
                return [
                    'id' => $prompt->id,
                    'prompt' => $prompt->prompt,
                    'position' => $prompt->position,
                    'sentiment' => $prompt->sentiment,
                    'visibility' => $prompt->visibility,
                    'country_code' => $prompt->country_code,
                    'is_active' => $prompt->is_active,
                    'created_at' => $prompt->created_at,
                    'days_ago' => $prompt->created_at->diffInDays(now()),
                ];
            });

        return Inertia::render('brands/prompts/index', [
            'brand' => [
                'id' => $brand->id,
                'name' => $brand->name,
                'website' => $brand->website,
                'description' => $brand->description,
            ],
            'prompts' => $prompts,
        ]);
    }

    public function update(Request $request, Brand $brand, BrandPrompt $prompt)
    {
        // Check if user has access to this brand
        if ($brand->agency_id !== Auth::user()->id) {
            abort(403);
        }

        // Check if prompt belongs to this brand
        if ($prompt->brand_id !== $brand->id) {
            abort(404);
        }

        $request->validate([
            'position' => 'sometimes|integer|min:0',
            'sentiment' => 'sometimes|in:positive,neutral,negative',
            'visibility' => 'sometimes|in:public,private,draft',
            'is_active' => 'sometimes|boolean',
        ]);

        $prompt->update($request->only(['position', 'sentiment', 'visibility', 'is_active']));

        return redirect()->back()->with('success', 'Prompt updated successfully');
    }

    public function destroy(Brand $brand, BrandPrompt $prompt)
    {
        // Check if user has access to this brand
        if ($brand->agency_id !== Auth::user()->id) {
            abort(403);
        }

        // Check if prompt belongs to this brand
        if ($prompt->brand_id !== $brand->id) {
            abort(404);
        }

        $prompt->delete();

        return redirect()->back()->with('success', 'Prompt deleted successfully');
    }

    public function bulkUpdate(Request $request, Brand $brand)
    {
        // Check if user has access to this brand
        if ($brand->agency_id !== Auth::user()->id) {
            abort(403);
        }

        $request->validate([
            'prompt_ids' => 'required|array',
            'prompt_ids.*' => 'exists:brand_prompts,id',
            'action' => 'required|in:activate,deactivate,delete,set_visibility,set_sentiment',
            'value' => 'sometimes|string',
        ]);

        $prompts = BrandPrompt::whereIn('id', $request->prompt_ids)
            ->where('brand_id', $brand->id)
            ->get();

        foreach ($prompts as $prompt) {
            switch ($request->action) {
                case 'activate':
                    $prompt->update(['is_active' => true]);
                    break;
                case 'deactivate':
                    $prompt->update(['is_active' => false]);
                    break;
                case 'delete':
                    $prompt->delete();
                    break;
                case 'set_visibility':
                    if (in_array($request->value, ['public', 'private', 'draft'])) {
                        $prompt->update(['visibility' => $request->value]);
                    }
                    break;
                case 'set_sentiment':
                    if (in_array($request->value, ['positive', 'neutral', 'negative'])) {
                        $prompt->update(['sentiment' => $request->value]);
                    }
                    break;
            }
        }

        return redirect()->back()->with('success', 'Prompts updated successfully');
    }
}
