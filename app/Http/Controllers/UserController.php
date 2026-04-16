<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('roles')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames(),
                'created_at' => $user->created_at,
            ];
        });

        return Inertia::render('users', [
            'users' => $users,
        ]);
    }

    public function create()
    {
        $roles = Role::all();

        return Inertia::render('users/create', [
            'roles' => $roles,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'roles' => 'array',
            'roles.*' => 'exists:roles,name',
            'trial_option' => 'required|in:A,B,subscription',
            'trial_days' => 'nullable|integer|min:1|max:365',
            'trial_discount' => 'nullable|integer|min:0|max:100',
            'plan_name' => 'nullable|string|in:trial,free,agency_growth,agency_unlimited,brand_growth',
            'subscription_expires_at' => 'nullable|date',
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
                $userData['trial_type'] = null;
                $userData['trial_days'] = 0;
                $userData['trial_ends_at'] = null;
                $userData['free_trial_availed'] = false;
            }

            $user = User::create($userData);

            if ($request->roles) {
                $user->assignRole($request->roles);

                if (in_array('brand', $request->roles)) {
                    try {
                        \App\Models\Brand::create([
                            'agency_id' => Auth::id(),
                            'user_id' => $user->id,
                            'name' => $request->name."'s Brand",
                            'website' => null,
                            'description' => 'Brand created for '.$request->name,
                            'status' => 'active',
                            'monthly_posts' => 10, // Default value
                        ]);
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error('Failed to create brand record', [
                            'user_id' => $user->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }

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
                        ? Carbon::parse($request->subscription_expires_at)->endOfDay()
                        : null,
                ]);
            }
        });

        return redirect()->route('users.index')->with('success', 'User created successfully.');
    }

    public function edit(User $user)
    {
        $roles = Role::all();
        $activeSubscription = $user->activeSubscription;

        return Inertia::render('users/edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames(),
                'trial_ends_at' => $user->trial_ends_at?->toDateString(),
                'trial_type' => $user->trial_type,
                'trial_discount' => $user->trial_discount ?? 50,
                'is_on_trial' => $user->isOnTrial(),
                'trial_days_left' => $user->trialDaysLeft(),
                'is_trial_expired' => $user->isTrialExpired(),
            ],
            'roles' => $roles,
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

    public function updateAccess(Request $request, User $user): \Illuminate\Http\RedirectResponse
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
                $request->validate([
                    'plan_name' => 'required|in:trial,free,agency_growth,agency_unlimited,brand_growth',
                ]);

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
                    'current_period_end'   => $request->expires_at
                        ? Carbon::parse($request->expires_at)->endOfDay()
                        : null,
                ]);
            }
        });

        return back()->with('success', 'Account access updated for '.$user->name.'.');
    }

    public function extendTrialByDays(Request $request, User $user): \Illuminate\Http\RedirectResponse
    {
        $request->validate(['extend_days' => 'required|integer|min:1|max:365']);

        $days = $request->integer('extend_days');
        $base = ($user->isOnTrial() && $user->trial_ends_at) ? $user->trial_ends_at : now();

        $user->update([
            'trial_ends_at'         => $base->addDays($days)->endOfDay(),
            'trial_type'            => $user->trial_type ?? 'A',
            'free_trial_availed'    => true,
            'free_trial_claimed_at' => $user->free_trial_claimed_at ?? now(),
        ]);

        return back()->with('success', "Trial extended by {$days} day(s) for {$user->name}.");
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password'       => 'nullable|string|min:8|confirmed',
            'roles'          => 'array',
            'roles.*'        => 'exists:roles,name',
            'access_option'  => 'required|in:A,B,subscription',
            'trial_ends_at'  => 'nullable|date',
            'trial_discount' => 'nullable|integer|min:0|max:100',
            'plan_name'      => 'nullable|string|in:trial,free,agency_growth,agency_unlimited,brand_growth',
            'expires_at'     => 'nullable|date',
            'admin_note'     => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $user) {
            $user->update([
                'name'     => $request->name,
                'email'    => $request->email,
                'password' => $request->password ? Hash::make($request->password) : $user->password,
            ]);

            if ($request->has('roles')) {
                $user->syncRoles($request->roles);
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

        return redirect()->route('users.edit', $user)->with('success', 'User updated successfully.');
    }

    public function destroy(Request $request, User $user)
    {
        // Prevent deleting the current user
        if ($user->id === $request->user()->id) {
            return redirect()->route('users.index')->with('error', 'You cannot delete your own account.');
        }

        $user->delete();

        return redirect()->route('users.index')->with('success', 'User deleted successfully.');
    }
}
