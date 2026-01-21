<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
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
     * Store a new brand.
     */
    public function storeBrand(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'website' => ['required', 'url', 'max:255'],
            'country' => ['required', 'string', 'max:2'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        try {
            \DB::beginTransaction();

            // Create a user account for the brand
            $brandUser = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => \Hash::make($validated['password']),
            ]);

            // Assign brand role to the user
            $brandUser->assignRole('brand');

            // Create the brand and link it to the user
            // Individual brands have no agency
            $brand = Brand::create([
                'agency_id' => null,
                'user_id' => $brandUser->id,
                'name' => $validated['name'],
                'website' => $validated['website'],
                'country' => $validated['country'],
                'status' => 'active',
            ]);

            \DB::commit();

            return redirect()->back()->with('success', 'Brand and user account created successfully!');
        } catch (\Illuminate\Database\QueryException $e) {
            \DB::rollBack();
            \Log::error('Database error creating brand: '.$e->getMessage());

            // Check for specific database errors
            if ($e->getCode() == 23000) {
                return redirect()->back()->withErrors(['error' => 'A database constraint was violated. The email might already exist.']);
            }

            return redirect()->back()->withErrors(['error' => 'Database error: '.$e->getMessage()]);
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Failed to create brand: '.$e->getMessage());

            return redirect()->back()->withErrors(['error' => 'Failed to create brand: '.$e->getMessage()]);
        }
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
