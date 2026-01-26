<?php

namespace App\Http\Controllers;

use App\Models\AiModel;
use App\Models\Brand;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the dashboard.
     * Redirects to the first active brand if available (for agency/brand roles).
     */
    public function index()
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Get AI models
        $aiModels = AiModel::enabled()->ordered()->get();
        
        // If admin, show admin dashboard
        if ($user->hasRole('admin')) {
            return Inertia::render('dashboard', [
                'isAdmin' => true,
                'aiModels' => $aiModels
            ]);
        }
        
        // Get user's first brand (for agency or brand users)
        $firstBrand = Brand::where(function($query) use ($user) {
            $query->where('user_id', $user->id)
                  ->orWhere('agency_id', $user->id);
        })
        ->orderBy('updated_at', 'desc')
        ->first();
        
        // If user has a brand that's not completed, redirect to multi-step creation
        if ($firstBrand && !$firstBrand->is_completed) {
            // Redirect to the appropriate step based on current_step
            $step = $firstBrand->current_step ?? 2;
            
            // Step 1 doesn't have a GET route, so redirect to step 2 minimum
            if ($step < 2) {
                $step = 2;
            }
            
            return redirect()->route('brands.create.step', ['brand' => $firstBrand->id, 'step' => $step]);
        }
        
        // If user has active brands, redirect to the first brand's page
        if ($firstBrand && $firstBrand->status === 'active') {
            return redirect()->route('brands.show', $firstBrand->id);
        }
        
        // Otherwise, show the default dashboard
        return Inertia::render('dashboard', [
            'aiModels' => $aiModels
        ]);
    }
}
