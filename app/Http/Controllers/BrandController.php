<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\BrandPrompt;
use App\Models\BrandSubreddit;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BrandController extends Controller
{
    /**
     * Display a listing of brands for the authenticated agency.
     */
    public function index(): Response
    {
        /** @var User $user */
        $user = Auth::user();
        
        $brands = Brand::where('agency_id', $user->id)
            ->with(['prompts', 'subreddits'])
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('brands/index', [
            'brands' => $brands,
        ]);
    }

    /**
     * Show the form for creating a new brand.
     */
    public function create(): Response
    {
        return Inertia::render('brands/create');
    }

    /**
     * Store a newly created brand in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'website' => 'nullable|url|max:255',
            'description' => 'required|string|max:1000',
            'prompts' => 'required|array|min:1|max:25',
            'prompts.*' => 'required|string|max:500',
            'subreddits' => 'required|array|min:1|max:20',
            'subreddits.*' => 'required|string|max:100',
            'monthly_posts' => 'required|integer|min:1|max:1000',
            'brand_email' => 'required|email|unique:users,email',
            'brand_password' => 'required|string|min:8',
        ]);

        DB::transaction(function () use ($request) {
            /** @var User $agency */
            $agency = Auth::user();

            // Create brand user account
            $brandUser = User::create([
                'name' => $request->name . ' User',
                'email' => $request->brand_email,
                'password' => Hash::make($request->brand_password),
                'email_verified_at' => now(),
            ]);
            $brandUser->assignRole('brand');

            // Create brand
            $brand = Brand::create([
                'agency_id' => $agency->id,
                'user_id' => $brandUser->id,
                'name' => $request->name,
                'website' => $request->website,
                'description' => $request->description,
                'monthly_posts' => $request->monthly_posts,
                'status' => 'active',
            ]);

            // Create prompts
            foreach ($request->prompts as $index => $prompt) {
                BrandPrompt::create([
                    'brand_id' => $brand->id,
                    'prompt' => $prompt,
                    'order' => $index + 1,
                    'is_active' => true,
                ]);
            }

            // Create subreddits
            foreach ($request->subreddits as $subreddit) {
                BrandSubreddit::create([
                    'brand_id' => $brand->id,
                    'subreddit_name' => $subreddit,
                    'status' => 'approved',
                ]);
            }
        });

        return redirect()->route('brands.index')->with('success', 'Brand created successfully!');
    }

    /**
     * Display the specified brand.
     */
    public function show(Brand $brand): Response
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency
        if ($brand->agency_id !== $user->id) {
            abort(403);
        }

        $brand->load(['prompts', 'subreddits', 'user']);

        return Inertia::render('brands/show', [
            'brand' => $brand,
        ]);
    }

    /**
     * Show the form for editing the specified brand.
     */
    public function edit(Brand $brand): Response
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency
        if ($brand->agency_id !== $user->id) {
            abort(403);
        }

        $brand->load(['prompts', 'subreddits']);

        return Inertia::render('brands/edit', [
            'brand' => $brand,
        ]);
    }

    /**
     * Update the specified brand in storage.
     */
    public function update(Request $request, Brand $brand): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency
        if ($brand->agency_id !== $user->id) {
            abort(403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'website' => 'nullable|url|max:255',
            'description' => 'required|string|max:1000',
            'monthly_posts' => 'required|integer|min:1|max:1000',
            'prompts' => 'required|array|min:1|max:25',
            'prompts.*' => 'required|string|max:500',
            'subreddits' => 'required|array|min:1|max:20',
            'subreddits.*' => 'required|string|max:100',
        ]);

        DB::transaction(function () use ($request, $brand) {
            // Update brand
            $brand->update([
                'name' => $request->name,
                'website' => $request->website,
                'description' => $request->description,
                'monthly_posts' => $request->monthly_posts,
            ]);

            // Delete existing prompts and create new ones
            $brand->prompts()->delete();
            foreach ($request->prompts as $index => $promptText) {
                BrandPrompt::create([
                    'brand_id' => $brand->id,
                    'prompt' => $promptText,
                    'order' => $index + 1,
                    'is_active' => true,
                ]);
            }

            // Delete existing subreddits and create new ones
            $brand->subreddits()->delete();
            foreach ($request->subreddits as $subredditName) {
                BrandSubreddit::create([
                    'brand_id' => $brand->id,
                    'subreddit_name' => $subredditName,
                    'status' => 'approved',
                ]);
            }
        });

        return redirect()->route('brands.show', $brand)->with('success', 'Brand updated successfully!');
    }

    /**
     * Update the brand status.
     */
    public function updateStatus(Request $request, Brand $brand): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency
        if ($brand->agency_id !== $user->id) {
            abort(403);
        }

        $request->validate([
            'status' => 'required|in:active,inactive,pending',
        ]);

        $brand->update([
            'status' => $request->status,
        ]);

        return back()->with('success', 'Brand status updated successfully!');
    }

    /**
     * Remove the specified brand from storage.
     */
    public function destroy(Brand $brand): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Ensure the brand belongs to the authenticated agency
        if ($brand->agency_id !== $user->id) {
            abort(403);
        }

        // Delete the brand user account if exists
        if ($brand->user) {
            $brand->user->delete();
        }

        $brand->delete();

        return redirect()->route('brands.index')->with('success', 'Brand deleted successfully!');
    }
}
