<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BrandPrompt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BrandPromptController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'prompt' => 'required|string|max:2000',
            'country_code' => 'required|string|size:2',
        ]);

        // Check if user has access to this brand
        $brand = \App\Models\Brand::findOrFail($request->brand_id);
        
        if (!Auth::user()->canAccessBrand($brand)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $prompt = BrandPrompt::create([
            'brand_id' => $request->brand_id,
            'prompt' => $request->prompt,
            'country_code' => strtoupper($request->country_code),
        ]);

        return response()->json([
            'message' => 'Prompt added successfully',
            'prompt' => $prompt
        ]);
    }

    public function index(Request $request)
    {
        $request->validate([
            'brand_id' => 'required|exists:brands,id',
        ]);

        $brand = \App\Models\Brand::findOrFail($request->brand_id);
        
        if (!Auth::user()->canAccessBrand($brand) && $brand->user_id !== Auth::user()->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $prompts = BrandPrompt::where('brand_id', $request->brand_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($prompts);
    }

    public function destroy(BrandPrompt $prompt)
    {
        $brand = $prompt->brand;
        
        if (!Auth::user()->canAccessBrand($brand)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $prompt->delete();

        return response()->json(['message' => 'Prompt deleted successfully']);
    }
}
