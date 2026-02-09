<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();
        $userRoles = $user ? $user->getRoleNames() : [];
        $userPermissions = $user ? $user->getPermissionNames() : [];

        // Fetch user's brands (limit to 10 most recent)
        $brands = collect();
        if ($user) {
            $isAdmin = $user->hasRole('admin');

            $query = \App\Models\Brand::query();

            if ($isAdmin) {
                // Admin can see all brands, limit to 10 most recent
                $query->whereNotNull('website')
                    ->where('website', '!=', '')
                    ->orderBy('updated_at', 'desc')
                    ->limit(10);
            } else {
                // Regular users see only their own brands
                // Include brands for: brand users (user_id), agency owners (agency_id), and agency members
                $query->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                        ->orWhere('agency_id', $user->id);

                    // Also include brands from user's agency if they are an agency member
                    $membership = $user->agencyMembership;
                    if ($membership) {
                        $q->orWhere('agency_id', $membership->agency_id);
                    }
                })
                    ->orderBy('updated_at', 'desc')
                    ->limit(10);
            }

            $brands = $query->select('id', 'name', 'website', 'logo')->get();
        }

        // Get selected brand from session
        $selectedBrandId = session('selected_brand_id');
        $selectedBrand = null;

        if ($selectedBrandId && $user) {
            try {
                $isAdmin = $user->hasRole('admin');

                $query = \App\Models\Brand::where('id', $selectedBrandId);

                // Admins can see any brand, regular users only their own
                if (! $isAdmin) {
                    $query->where(function ($q) use ($user) {
                        $q->where('user_id', $user->id)
                            ->orWhere('agency_id', $user->id);
                    });
                }

                $selectedBrand = $query->select('id', 'name', 'website', 'logo')->first();
            } catch (\Exception $e) {
                Log::error('Error loading selected brand', [
                    'brand_id' => $selectedBrandId,
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
                $selectedBrand = null;
            }
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user ? array_merge($user->toArray(), [
                    'logo' => $user->logo ? asset('storage/'.$user->logo) : null,
                    'logo_thumbnail' => $user->logo_thumbnail ? asset('storage/'.$user->logo_thumbnail) : null,
                    'agency_color' => $user->agency_color,
                ]) : null,
                'roles' => $userRoles,
                'permissions' => $userPermissions,
                'can' => $user ? [
                    'viewDashboard' => $user->can('view-dashboard'),
                    'manageDashboard' => $user->can('manage-dashboard'),
                    'viewUsers' => $user->can('view-users'),
                    'createUsers' => $user->can('create-users'),
                    'editUsers' => $user->can('edit-users'),
                    'deleteUsers' => $user->can('delete-users'),
                    'viewSettings' => $user->can('view-settings'),
                    'manageSettings' => $user->can('manage-settings'),
                    'viewAdminPanel' => $user->can('view-admin-panel'),
                    'manageSystem' => $user->can('manage-system'),
                ] : [],
            ],
            'brands' => $brands,
            'selectedBrand' => $selectedBrand,
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
