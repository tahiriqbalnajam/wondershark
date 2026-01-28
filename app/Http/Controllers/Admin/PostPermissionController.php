<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PostPermissionController extends Controller
{
    /**
     * Display the post permissions management page.
     */
    public function index()
    {
        $users = User::with('brands')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'can_create_posts' => $user->can_create_posts,
                'post_creation_note' => $user->post_creation_note,
                'brands_count' => $user->brands->count(),
            ];
        });

        $brands = Brand::all()->map(function ($brand) {
            return [
                'id' => $brand->id,
                'name' => $brand->name,
                'can_create_posts' => $brand->can_create_posts,
                'post_creation_note' => $brand->post_creation_note,
                'monthly_posts' => $brand->monthly_posts,
                'current_month_posts' => $brand->getCurrentMonthPostsCount(),
            ];
        });

        return Inertia::render('admin/post-permissions/index', [
            'users' => $users,
            'brands' => $brands,
        ]);
    }

    /**
     * Update user post creation permissions.
     */
    public function updateUser(Request $request, User $user)
    {
        $request->validate([
            'can_create_posts' => 'required|boolean',
            'post_creation_note' => 'nullable|string|max:500',
        ]);

        $user->update([
            'can_create_posts' => $request->can_create_posts,
            'post_creation_note' => $request->post_creation_note,
        ]);

        return redirect()->back()->with('success', 'User permissions updated successfully.');
    }

    /**
     * Update brand post creation permissions.
     */
    public function updateBrand(Request $request, Brand $brand)
    {
        $request->validate([
            'can_create_posts' => 'required|boolean',
            'post_creation_note' => 'nullable|string|max:500',
            'monthly_posts' => 'nullable|integer|min:0',
        ]);

        $brand->update([
            'can_create_posts' => $request->can_create_posts,
            'post_creation_note' => $request->post_creation_note,
            'monthly_posts' => $request->monthly_posts,
        ]);

        return redirect()->back()->with('success', 'Brand permissions updated successfully.');
    }

    /**
     * Bulk update permissions for multiple users.
     */
    public function bulkUpdateUsers(Request $request)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'can_create_posts' => 'required|boolean',
            'post_creation_note' => 'nullable|string|max:500',
        ]);

        User::whereIn('id', $request->user_ids)->update([
            'can_create_posts' => $request->can_create_posts,
            'post_creation_note' => $request->post_creation_note,
        ]);

        return redirect()->back()->with('success', 'User permissions updated for '.count($request->user_ids).' users.');
    }

    /**
     * Bulk update permissions for multiple brands.
     */
    public function bulkUpdateBrands(Request $request)
    {
        $request->validate([
            'brand_ids' => 'required|array',
            'brand_ids.*' => 'exists:brands,id',
            'can_create_posts' => 'required|boolean',
            'post_creation_note' => 'nullable|string|max:500',
            'monthly_posts' => 'nullable|integer|min:0',
        ]);

        $updateData = [
            'can_create_posts' => $request->can_create_posts,
            'post_creation_note' => $request->post_creation_note,
        ];

        if ($request->has('monthly_posts')) {
            $updateData['monthly_posts'] = $request->monthly_posts;
        }

        Brand::whereIn('id', $request->brand_ids)->update($updateData);

        return redirect()->back()->with('success', 'Brand permissions updated for '.count($request->brand_ids).' brands.');
    }
}
