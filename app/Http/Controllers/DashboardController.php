<?php

namespace App\Http\Controllers;

use App\Models\AiModel;
use App\Models\Brand;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

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
                'aiModels' => $aiModels,
            ]);
        }

        // Check if agency user has no brands
        if ($user->hasRole('agency')) {
            $agencyBrands = Brand::where('agency_id', $user->id)->count();
            if ($agencyBrands === 0) {
                $brand = new Brand;
                $brand->agency_id = $user->id;

                return Inertia::render('brands/create', [
                    'currentStep' => 1,
                    'existingData' => [
                        'brand' => $brand,
                        'competitors' => [],
                        'prompts' => [],
                    ],
                    'flash' => [
                        'message' => 'You need to create your first brand before accessing the dashboard.',
                    ],
                ]);
            }
        }

        // For non-agency users, check for incomplete brands and redirect to steps
        // Skip this check for brand role users (they already have an existing brand account)
        if (! $user->hasRole('agency') && ! $user->hasRole('brand')) {
            // Get user's first brand (for individual users)
            $firstBrand = Brand::where('user_id', $user->id)
                ->orderBy('updated_at', 'desc')
                ->first();

            // If user has a brand that's not completed, redirect to multi-step creation
            if ($firstBrand && ! $firstBrand->is_completed) {
                // Redirect to the appropriate step based on current_step
                $step = $firstBrand->current_step ?? 2;

                // Step 1 doesn't have a GET route, so redirect to step 2 minimum
                if ($step < 2) {
                    $step = 2;
                }

                return redirect()->route('brands.create.step', ['brand' => $firstBrand->id, 'step' => $step]);
            }
        }

        // Get user's first brand (for agency or brand users) for active brand redirect
        $firstBrand = Brand::where(function ($query) use ($user) {
             $query->where('user_id', $user->id)
                ->orWhere('agency_id', $user->id);
            
            // Also include brands from user's agency if they are an agency member
            $membership = $user->agencyMembership;
            if ($membership) {
                $query->orWhere('agency_id', $membership->agency_id);
            }
        })
            ->where('status', 'active')
            ->orderBy('updated_at', 'desc')
            ->first();

      
   
        if($user->agencyMembership && $user->agencyMembership->role && $user->agencyMembership->role == "agency_member" ){
           // if ($user->agencyMembership && $user->agencyMembership->rights && in_array('agency_manager', $user->agencyMembership->rights)) {
                 $main_agencyId = $user->agencyMembership?->agency_id;
                 $main_agencyId_user = User::find($main_agencyId);
                 $main_user_agency_color = $main_agencyId_user->agency_color;
                 if($main_user_agency_color){
                    $user->agency_color  = $main_user_agency_color;
                    $user->save();
                 }
           // }
        } 

         if($user->agencyMembership && $user->agencyMembership->role && $user->agencyMembership->role == "agency_member" ){
           // if ($user->agencyMembership && $user->agencyMembership->rights && in_array('agency_manager', $user->agencyMembership->rights)) {
                 $main_agencyId = $user->agencyMembership?->agency_id;
                 $main_agencyId_user = User::find($main_agencyId);
                 $main_user_agency_color = $main_agencyId_user->agency_color;
        } 
       
    



        // If user has a last visited brand, redirect to it if accessible
        if ($user && $user->last_visited_brand) {
            $lastVisitedBrand = Brand::find($user->last_visited_brand);
            if ($lastVisitedBrand && $user->canAccessBrand($lastVisitedBrand)) {
                return redirect()->route('brands.show', $lastVisitedBrand->id);
            }
        }

        // If user has active brands, redirect to the first brand's show page
        if ($firstBrand && $firstBrand->status === 'active') {
            // Verify user can actually access this brand before redirecting
            if ($user->canAccessBrand($firstBrand)) {
                return redirect()->route('brands.show', $firstBrand->id);
            }
        }

        // Show free trial popup once for brand/agency users with no active subscription
        $showTrialPopup = false;
        $showSubscribePopup = false;
        if (! $user->hasRole('admin')) {
            $hasActiveSubscription = Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->exists();

            if (! $hasActiveSubscription) {
                if (! $user->free_trial_availed && ! Subscription::where('user_id', $user->id)->exists()) {
                    $showTrialPopup = true;
                    $user->free_trial_availed = true;
                    $user->free_trial_claimed_at = now();
                    $user->save();
                } elseif ($user->free_trial_availed && ! $user->subscribe_popup_shown && $user->free_trial_claimed_at && $user->free_trial_claimed_at->addDays(7)->isPast()) {
                    $showSubscribePopup = true;
                    $user->subscribe_popup_shown = true;
                    $user->save();
                }
            }
        }

        // Otherwise, show the default dashboard
        return Inertia::render('dashboard', [
            'aiModels' => $aiModels,
            'showTrialPopup' => $showTrialPopup,
            'showSubscribePopup' => $showSubscribePopup,
            'billingUrl' => $user->hasRole('agency') ? '/agency/billing' : '/brand/billing',
        ]);
    }
}
