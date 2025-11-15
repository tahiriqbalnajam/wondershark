<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Brand;

class AdminController extends Controller
{
    public function index()
    {
        return Inertia::render('admin');
    }

    /**
     * Display list of all agencies with their brands
     */
    public function agencies()
    {
        $agencies = User::role('agency')
            ->with(['brands' => function($query) {
                $query->select('id', 'name', 'website', 'status', 'agency_id', 'created_at')
                      ->orderBy('created_at', 'desc');
            }])
            ->withCount('brands')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('admin/agencies/index', [
            'agencies' => $agencies,
        ]);
    }

    /**
     * Display list of all individual brands (not belonging to agencies)
     */
    public function brands()
    {
        $brands = Brand::with(['user'])
            ->whereNull('agency_id')
            ->orWhere('agency_id', 0)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('admin/brands/index', [
            'brands' => $brands,
        ]);
    }

    /**
     * Select a brand to view (admin functionality)
     */
    public function selectBrand(Request $request)
    {
        $request->validate([
            'brand_id' => 'required|exists:brands,id'
        ]);

        $brand = Brand::findOrFail($request->brand_id);
        
        // Store selected brand in session
        session(['selected_brand_id' => $brand->id]);

        return redirect()->back()->with('success', "Viewing brand: {$brand->name}");
    }
}

