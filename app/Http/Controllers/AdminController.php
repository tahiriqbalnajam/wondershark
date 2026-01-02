<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function index()
    {
        return Inertia::render('admin');
    }

    /**
     * Display a listing of all brands (individual brands without agency).
     */
    public function brands(): Response
    {
        $brands = Brand::with('agency:id,name,email')
            ->orderBy('name')
            ->get()
            ->map(function ($brand) {
                return [
                    'id' => $brand->id,
                    'name' => $brand->name,
                    'website' => $brand->website ?? $brand->domain,
                    'agency_name' => $brand->agency?->name,
                    'agency_email' => $brand->agency?->email,
                    'has_agency' => ! is_null($brand->agency_id),
                    'status' => $brand->status,
                    'created_at' => $brand->created_at?->format('M d, Y'),
                ];
            });

        return Inertia::render('admin/brands/index', [
            'brands' => $brands,
        ]);
    }

    /**
     * Select a brand for the current session.
     */
    public function selectBrand(Request $request)
    {
        $request->validate([
            'brand_id' => 'required|exists:brands,id',
        ]);

        session(['selected_brand_id' => $request->brand_id]);

        return response()->json([
            'success' => true,
            'message' => 'Brand selected successfully',
        ]);
    }
}
