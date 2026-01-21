<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

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
        ]);

        $user = null;
        
        DB::transaction(function () use ($request, &$user) {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'email_verified_at' => now(),
                'can_create_posts' => $request->boolean('can_create_posts', false),
                'post_creation_note' => $request->post_creation_note,
            ]);

            // Assign roles
            if ($request->roles && !empty($request->roles)) {
                $user->assignRole($request->roles);
            }

            // Assign direct permissions
            if ($request->permissions) {
                $user->givePermissionTo($request->permissions);
            }
        });

        // Create brand record after transaction if brand role was assigned
        if ($user && $request->roles && in_array('brand', $request->roles)) {
            try {
                $adminUser = Auth::user();
                
                $brand = \App\Models\Brand::create([
                    'agency_id' => $adminUser->id,
                    'user_id' => $user->id,
                    'name' => $request->name . "'s Brand",
                    'website' => null,
                    'description' => 'Brand created for ' . $request->name,
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

        return Inertia::render('admin/users/edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'can_create_posts' => $user->can_create_posts,
                'post_creation_note' => $user->post_creation_note,
                'roles' => $user->getRoleNames(),
                'direct_permissions' => $user->getDirectPermissions()->pluck('name'),
            ],
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users,email,' . $user->id,
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'roles' => 'array',
            'roles.*' => 'exists:roles,name',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,name',
            'can_create_posts' => 'boolean',
            'post_creation_note' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $user) {
            $updateData = [
                'name' => $request->name,
                'email' => $request->email,
                'can_create_posts' => $request->boolean('can_create_posts', false),
                'post_creation_note' => $request->post_creation_note,
            ];

            if ($request->password) {
                $updateData['password'] = Hash::make($request->password);
            }

            $user->update($updateData);

            // Update roles
            if ($request->has('roles')) {
                $user->syncRoles($request->roles ?? []);
            }

            // Update direct permissions
            if ($request->has('permissions')) {
                $user->syncPermissions($request->permissions ?? []);
            }
        });

        return redirect()->route('admin.users.index')
            ->with('success', 'User updated successfully.');
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(User $user): RedirectResponse
    {
        // Prevent admin from deleting themselves
        if ($user->id === Auth::id()) {
            return back()->withErrors(['error' => 'You cannot delete your own account.']);
        }

        // Check if user has critical data
        $brandsCount = $user->brands()->count();
        $postsCount = $user->posts()->count();

        if ($brandsCount > 0 || $postsCount > 0) {
            return back()->withErrors([
                'error' => "Cannot delete user. They have {$brandsCount} brands and {$postsCount} posts associated. Please transfer or delete these first."
            ]);
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
