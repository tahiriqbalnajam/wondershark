<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the dashboard.
     * Redirects to the first active brand if available.
     */
    public function index()
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Get user's first brand
        $firstBrand = Brand::where(function($query) use ($user) {
            $query->where('user_id', $user->id)
                  ->orWhere('agency_id', $user->id);
        })
        ->where('status', 'active')
        ->orderBy('updated_at', 'desc')
        ->first();
        
        // If user has brands, redirect to the first brand's page
        if ($firstBrand) {
            return redirect()->route('brands.show', $firstBrand->id);
        }
        
        // Otherwise, show the default dashboard
        return Inertia::render('dashboard');
    }
}
