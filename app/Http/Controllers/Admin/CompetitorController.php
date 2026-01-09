<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Competitor;
use App\Models\User;
use Illuminate\Http\Request;
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
        $brands = Brand::with('agency')->orderBy('name')->get(['id', 'name', 'agency_id']);

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
            'description' => 'nullable|string|max:500',
        ]);

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
            'description' => 'nullable|string|max:500',
        ]);

        $competitor->update($validated);

        return redirect()->back()->with('success', 'Competitor updated successfully.');
    }

    public function destroy(Competitor $competitor)
    {
        $competitor->delete();

        return redirect()->back()->with('success', 'Competitor deleted successfully.');
    }
}
