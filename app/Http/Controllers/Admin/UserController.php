<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlanFeature;
use App\Models\Subscription;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserFeatureOverride;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * Display a listing of users with their roles and permissions.
     */
    public function index(): Response
    {
        $users = User::with(['roles', 'permissions'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified_at' => $user->email_verified_at,
                    'created_at' => $user->created_at,
                    'can_create_posts' => $user->can_create_posts,
                    'post_creation_note' => $user->post_creation_note,
                    'roles' => $user->getRoleNames(),
                    'permissions' => $user->getAllPermissions()->pluck('name'),
                    'brands_count' => $user->brands()->count(),
                    'posts_count' => $user->posts()->count(),
                ];
            });

        $roles = Role::all();
        $permissions = Permission::all();
        $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'roles' => $roles,
            'permissions' => $permissions,
            'adminEmail' => $adminEmail,
        ]);
    }

    /**
     * Show the form for creating a new user.
     */
    public function create(): Response
    {
        $roles = Role::all();
        $permissions = Permission::all();

        return Inertia::render('admin/users/create', [
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'roles' => 'array',
            'roles.*' => 'exists:roles,name',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,name',
            'can_create_posts' => 'boolean',
            'post_creation_note' => 'nullable|string|max:500',
            'trial_option' => 'required|in:A,B,subscription',
            'trial_days' => 'nullable|integer|min:1|max:365',
            'trial_discount' => 'nullable|integer|min:0|max:100',
            'plan_name' => 'nullable|string|in:trial,free,agency_growth,agency_unlimited,brand_growth,brand_growth',
            'subscription_expires_at' => 'nullable|date|after:today',
            'admin_note' => 'nullable|string|max:500',
        ]);

        $user = null;

        DB::transaction(function () use ($request, &$user) {
            $trialOption = $request->trial_option;
            $trialDays = $request->integer('trial_days', 7);

            $userData = [
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'email_verified_at' => now(),
                'can_create_posts' => $request->boolean('can_create_posts', false),
                'post_creation_note' => $request->post_creation_note,
                'created_by_admin' => true,
            ];

            if ($trialOption === 'A') {
                $userData['trial_type'] = 'A';
                $userData['trial_days'] = $trialDays;
                $userData['trial_ends_at'] = now()->addDays($trialDays);
                $userData['trial_discount'] = $request->integer('trial_discount', 50);
                $userData['free_trial_availed'] = true;
                $userData['free_trial_claimed_at'] = now();
            } elseif ($trialOption === 'B') {
                $userData['trial_type'] = 'B';
                $userData['trial_days'] = 0;
                $userData['trial_ends_at'] = null;
                $userData['free_trial_availed'] = false;
            } else {
                // subscription — no trial
                $userData['trial_type'] = null;
                $userData['trial_days'] = 0;
                $userData['trial_ends_at'] = null;
                $userData['free_trial_availed'] = false;
            }

            $user = User::create($userData);

            // Assign roles
            if ($request->roles && ! empty($request->roles)) {
                $user->assignRole($request->roles);
            }

            // Assign direct permissions
            if ($request->permissions) {
                $user->givePermissionTo($request->permissions);
            }

            // Activate subscription immediately if option is 'subscription'
            if ($trialOption === 'subscription' && $request->plan_name) {
                Subscription::create([
                    'user_id' => $user->id,
                    'plan_name' => $request->plan_name,
                    'status' => 'active',
                    'is_manual' => true,
                    'activated_by' => Auth::id(),
                    'admin_note' => $request->admin_note,
                    'current_period_start' => now(),
                    'current_period_end' => $request->subscription_expires_at
                        ? Carbon::parse($request->subscription_expires_at)
                        : null,
                ]);
            }
        });

        // Create brand record after transaction if brand role was assigned
        if ($user && $request->roles && in_array('brand', $request->roles)) {
            try {
                $adminUser = Auth::user();

                $brand = \App\Models\Brand::create([
                    'agency_id' => $adminUser->id,
                    'user_id' => $user->id,
                    'name' => $request->name."'s Brand",
                    'website' => null,
                    'description' => 'Brand created for '.$request->name,
                    'status' => 'active',
                ]);

                Log::info('Brand record created successfully', [
                    'brand_id' => $brand->id,
                    'brand_name' => $brand->name,
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to create brand record', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        return redirect()->route('admin.users.index')
            ->with('success', 'User created successfully.');
    }

    /**
     * Display the specified user.
     */
    public function show(User $user): Response
    {
        $user->load(['roles', 'permissions', 'brands', 'posts']);

        return Inertia::render('admin/users/show', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
                'can_create_posts' => $user->can_create_posts,
                'post_creation_note' => $user->post_creation_note,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'direct_permissions' => $user->getDirectPermissions()->pluck('name'),
                'brands' => $user->brands->map(function ($brand) {
                    return [
                        'id' => $brand->id,
                        'name' => $brand->name,
                        'can_create_posts' => $brand->can_create_posts,
                        'post_creation_note' => $brand->post_creation_note,
                        'monthly_posts' => $brand->monthly_posts,
                    ];
                }),
                'posts_count' => $user->posts()->count(),
                'recent_posts' => $user->posts()->latest()->take(5)->get(['id', 'title', 'url', 'created_at']),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified user.
     */
    public function edit(User $user): Response
    {
        $roles = Role::all();
        $permissions = Permission::all();
        $featureKeys = \App\Http\Controllers\Admin\PlanFeatureController::FEATURE_KEYS;
        $userOverrides = UserFeatureOverride::forUser($user->id);
        $activeSubscription = $user->activeSubscription;

        return Inertia::render('admin/users/edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'can_create_posts' => $user->can_create_posts,
                'post_creation_note' => $user->post_creation_note,
                'roles' => $user->getRoleNames(),
                'direct_permissions' => $user->getDirectPermissions()->pluck('name'),
                'trial_type' => $user->trial_type,
                'trial_days' => $user->trial_days ?? 7,
                'trial_discount' => $user->trial_discount ?? 50,
                'trial_ends_at' => $user->trial_ends_at?->toDateString(),
                'created_by_admin' => $user->created_by_admin,
                'is_on_trial' => $user->isOnTrial(),
                'trial_days_left' => $user->trialDaysLeft(),
                'is_trial_expired' => $user->isTrialExpired(),
            ],
            'roles' => $roles,
            'permissions' => $permissions,
            'featureKeys' => $featureKeys,
            'userOverrides' => $userOverrides,
            'activeSubscription' => $activeSubscription ? [
                'id' => $activeSubscription->id,
                'plan_name' => $activeSubscription->plan_name,
                'status' => $activeSubscription->status,
                'is_manual' => $activeSubscription->is_manual,
                'admin_note' => $activeSubscription->admin_note,
                'current_period_start' => $activeSubscription->current_period_start?->toDateString(),
                'current_period_end' => $activeSubscription->current_period_end?->toDateString(),
            ] : null,
        ]);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'name'               => 'required|string|max:255',
            'email'              => 'required|string|lowercase|email|max:255|unique:users,email,'.$user->id,
            'password'           => ['nullable', 'confirmed', Rules\Password::defaults()],
            'roles'              => 'array',
            'roles.*'            => 'exists:roles,name',
            'permissions'        => 'array',
            'permissions.*'      => 'exists:permissions,name',
            'can_create_posts'   => 'boolean',
            'post_creation_note' => 'nullable|string|max:500',
            'access_option'      => 'required|in:A,B,subscription',
            'trial_ends_at'      => 'nullable|date',
            'trial_discount'     => 'nullable|integer|min:0|max:100',
            'plan_name'          => 'nullable|string|in:trial,free,agency_growth,agency_unlimited,brand_growth',
            'expires_at'         => 'nullable|date',
            'admin_note'         => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $user) {
            $updateData = [
                'name'               => $request->name,
                'email'              => $request->email,
                'can_create_posts'   => $request->boolean('can_create_posts', false),
                'post_creation_note' => $request->post_creation_note,
            ];

            if ($request->password) {
                $updateData['password'] = Hash::make($request->password);
            }

            $user->update($updateData);

            if ($request->has('roles')) {
                $user->syncRoles($request->roles ?? []);
            }

            if ($request->has('permissions')) {
                $user->syncPermissions($request->permissions ?? []);
            }

            // Access settings
            if ($request->access_option === 'A') {
                Subscription::where('user_id', $user->id)->where('status', 'active')->update(['status' => 'canceled']);
                $user->update([
                    'trial_type'            => 'A',
                    'trial_ends_at'         => $request->trial_ends_at ? Carbon::parse($request->trial_ends_at)->endOfDay() : null,
                    'trial_discount'        => $request->integer('trial_discount', 50),
                    'free_trial_availed'    => true,
                    'free_trial_claimed_at' => $user->free_trial_claimed_at ?? now(),
                ]);
            } elseif ($request->access_option === 'B') {
                Subscription::where('user_id', $user->id)->where('status', 'active')->update(['status' => 'canceled']);
                $user->update(['trial_type' => 'B', 'trial_ends_at' => null, 'free_trial_availed' => false]);
            } else {
                $request->validate(['plan_name' => 'required|in:trial,free,agency_growth,agency_unlimited,brand_growth']);
                $user->update(['trial_type' => null, 'trial_ends_at' => null]);
                Subscription::where('user_id', $user->id)->where('status', 'active')->update(['status' => 'canceled']);
                Subscription::create([
                    'user_id'              => $user->id,
                    'plan_name'            => $request->plan_name,
                    'status'               => 'active',
                    'is_manual'            => true,
                    'activated_by'         => Auth::id(),
                    'admin_note'           => $request->admin_note,
                    'current_period_start' => now(),
                    'current_period_end'   => $request->expires_at ? Carbon::parse($request->expires_at)->endOfDay() : null,
                ]);
            }
        });

        return redirect()->route('admin.users.edit', $user)
            ->with('success', 'User updated successfully.');
    }

    /**
     * Unified access update: trial A, trial B, or manual subscription.
     */
    public function updateAccess(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'access_option'  => 'required|in:A,B,subscription',
            'trial_ends_at'  => 'nullable|date',
            'trial_discount' => 'nullable|integer|min:0|max:100',
            'plan_name'      => 'nullable|string|in:trial,free,agency_growth,agency_unlimited,brand_growth',
            'expires_at'     => 'nullable|date',
            'admin_note'     => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $user) {
            if ($request->access_option === 'A') {
                Subscription::where('user_id', $user->id)->where('status', 'active')->update(['status' => 'canceled']);

                $user->update([
                    'trial_type'             => 'A',
                    'trial_ends_at'          => $request->trial_ends_at
                        ? Carbon::parse($request->trial_ends_at)->endOfDay()
                        : null,
                    'trial_discount'         => $request->integer('trial_discount', 50),
                    'free_trial_availed'     => true,
                    'free_trial_claimed_at'  => $user->free_trial_claimed_at ?? now(),
                ]);
            } elseif ($request->access_option === 'B') {
                Subscription::where('user_id', $user->id)->where('status', 'active')->update(['status' => 'canceled']);

                $user->update([
                    'trial_type'         => 'B',
                    'trial_ends_at'      => null,
                    'free_trial_availed' => false,
                ]);
            } else {
                // subscription
                $request->validate([
                    'plan_name' => 'required|in:trial,free,agency_growth,agency_unlimited,brand_growth',
                ]);

                $user->update([
                    'trial_type'    => null,
                    'trial_ends_at' => null,
                ]);

                Subscription::where('user_id', $user->id)->where('status', 'active')->update(['status' => 'canceled']);

                Subscription::create([
                    'user_id'              => $user->id,
                    'plan_name'            => $request->plan_name,
                    'status'               => 'active',
                    'is_manual'            => true,
                    'activated_by'         => Auth::id(),
                    'admin_note'           => $request->admin_note,
                    'current_period_start' => now(),
                    'current_period_end'   => $request->expires_at
                        ? Carbon::parse($request->expires_at)->endOfDay()
                        : null,
                ]);
            }
        });

        return back()->with('success', 'Account access updated for '.$user->name.'.');
    }

    /**
     * Extend or update the trial for a user.
     */
    public function extendTrial(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'trial_ends_at' => 'required|date',
            'trial_type' => 'nullable|in:A,B',
        ]);

        $user->update([
            'trial_ends_at' => Carbon::parse($request->trial_ends_at)->endOfDay(),
            'trial_type' => $request->trial_type ?? ($user->trial_type ?? 'A'),
            'free_trial_availed' => true,
            'free_trial_claimed_at' => $user->free_trial_claimed_at ?? now(),
        ]);

        return back()->with('success', 'Trial updated for ' . $user->name . '.');
    }

    /**
     * Extend the user's trial by X additional days from today or current trial end.
     */
    public function extendTrialByDays(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'extend_days' => 'required|integer|min:1|max:365',
        ]);

        $days = $request->integer('extend_days');

        // Extend from current trial end if still active, otherwise from today
        $base = ($user->isOnTrial() && $user->trial_ends_at)
            ? $user->trial_ends_at
            : now();

        $user->update([
            'trial_ends_at'        => $base->addDays($days)->endOfDay(),
            'trial_type'           => $user->trial_type ?? 'A',
            'free_trial_availed'   => true,
            'free_trial_claimed_at' => $user->free_trial_claimed_at ?? now(),
        ]);

        return back()->with('success', "Trial extended by {$days} day(s) for {$user->name}.");
    }

    /**
     * Manually activate a subscription for a user (wire transfer / bypass Stripe).
     */
    public function activateSubscription(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'plan_name' => 'required|in:trial,free,agency_growth,agency_unlimited,brand_growth',
            'expires_at' => 'nullable|date',
            'admin_note' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $user) {
            // Cancel any existing active subscriptions
            Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->update(['status' => 'canceled']);

            Subscription::create([
                'user_id' => $user->id,
                'plan_name' => $request->plan_name,
                'status' => 'active',
                'is_manual' => true,
                'activated_by' => Auth::id(),
                'admin_note' => $request->admin_note,
                'current_period_start' => now(),
                'current_period_end' => $request->expires_at
                    ? Carbon::parse($request->expires_at)->endOfDay()
                    : null,
            ]);
        });

        return back()->with('success', 'Subscription activated for ' . $user->name . '.');
    }

    /**
     * Update per-user feature overrides.
     */
    public function updateFeatureOverrides(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'overrides' => 'required|array',
            'overrides.*.feature_key' => 'required|string',
            'overrides.*.value' => 'nullable|string|max:255',
        ]);

        foreach ($request->overrides as $override) {
            $val = $override['value'] ?? '';

            if ($val === '' || $val === null) {
                // Empty = remove override, fall back to plan default
                UserFeatureOverride::where('user_id', $user->id)
                    ->where('feature_key', $override['feature_key'])
                    ->delete();
            } else {
                UserFeatureOverride::updateOrCreate(
                    ['user_id' => $user->id, 'feature_key' => $override['feature_key']],
                    ['value' => $val]
                );
            }
        }

        return back()->with('success', 'Feature overrides saved for ' . $user->name . '.');
    }

    /**
     * Remove the specified user from storage.
     * All related data (brands, prompts, posts, files, etc.) is cascade-deleted at the DB level.
     * Any queued analysis jobs for this user's brand prompts are automatically discarded
     * because ProcessBrandPromptAnalysis has $deleteWhenMissingModels = true.
     */
    public function destroy(User $user): RedirectResponse
    {
        // Prevent admin from deleting themselves
        if ($user->id === Auth::id()) {
            return back()->withErrors(['error' => 'You cannot delete your own account.']);
        }

        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('success', 'User deleted successfully.');
    }

    /**
     * Toggle post creation permission for a user.
     */
    public function togglePostPermission(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'can_create_posts' => 'required|boolean',
            'post_creation_note' => 'nullable|string|max:500',
        ]);

        $user->update([
            'can_create_posts' => $request->boolean('can_create_posts'),
            'post_creation_note' => $request->post_creation_note,
        ]);

        $status = $request->boolean('can_create_posts') ? 'enabled' : 'disabled';

        return back()->with('success', "Post creation permission {$status} for {$user->name}.");
    }

    /**
     * Bulk update users' post creation permissions.
     */
    public function bulkUpdatePostPermissions(Request $request): RedirectResponse
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'can_create_posts' => 'required|boolean',
            'post_creation_note' => 'nullable|string|max:500',
        ]);

        $count = User::whereIn('id', $request->user_ids)->update([
            'can_create_posts' => $request->boolean('can_create_posts'),
            'post_creation_note' => $request->post_creation_note,
        ]);

        $status = $request->boolean('can_create_posts') ? 'enabled' : 'disabled';

        return back()->with('success', "Post creation permission {$status} for {$count} users.");
    }
}
