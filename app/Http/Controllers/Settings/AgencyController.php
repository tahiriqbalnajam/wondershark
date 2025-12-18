<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AgencyController extends Controller
{
    /**
     * Show the general settings form.
     */
    public function general(): Response
    {
        // In a real application, you would fetch agency data from database
        $agencyData = [
            'name' => Auth::user()->name,
            'logo' => null, // This would come from agency table
        ];

        return Inertia::render('settings/general', [
            'agencyData' => $agencyData,
        ]);
    }

    /**
     * Update the agency general settings.
     */
    public function updateGeneral(Request $request): RedirectResponse
    {
        $request->validate([
            'agency_name' => ['required', 'string', 'max:255'],
            'logo' => ['nullable', 'image', 'max:2048'], // 2MB max
        ]);

        /** @var User $user */
        $user = Auth::user();
        
        // Update agency name (you might want to store this in a separate agencies table)
        $user->update([
            'name' => $request->agency_name,
        ]);

        // Handle logo upload
        if ($request->hasFile('logo')) {
            // Delete old logo if exists
            // if ($user->logo) {
            //     Storage::disk('public')->delete($user->logo);
            // }

            $logoPath = $request->file('logo')->store('agency-logos', 'public');
            
            // In a real application, save this to agency table
            // $user->update(['logo' => $logoPath]);
        }

        return back()->with('status', 'Agency settings updated successfully!');
    }

    /**
     * Show the brands management page.
     */
    public function brands(): Response
    {
        // In a real application, you would fetch brands from database
        $brands = [
            [
                'id' => 1,
                'name' => 'Brand One',
                'website' => 'https://brandone.com',
                'status' => 'active',
                'created_at' => now()->subDays(30)->toISOString(),
            ],
            [
                'id' => 2,
                'name' => 'Brand Two',
                'website' => null,
                'status' => 'active',
                'created_at' => now()->subDays(15)->toISOString(),
            ],
        ];

        return Inertia::render('settings/brands', [
            'brands' => $brands,
        ]);
    }

    /**
     * Store a new brand.
     */
    public function storeBrand(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
        ]);

        // In a real application, you would create a Brand model and store in database
        // Brand::create([
        //     'agency_id' => auth()->id(),
        //     'name' => $request->name,
        //     'website' => $request->website,
        // ]);

        return back()->with('status', 'Brand added successfully!');
    }

    /**
     * Delete a brand.
     */
    public function deleteBrand($brandId): RedirectResponse
    {
        // In a real application, you would delete from database
        // Brand::where('agency_id', auth()->id())->findOrFail($brandId)->delete();

        return back()->with('status', 'Brand deleted successfully!');
    }

    /**
     * Show the integration settings page.
     */
    public function integration(): Response
    {
        return Inertia::render('settings/integration');
    }

    /**
     * Show the account settings page.
     */
    public function account(): Response
    {
        return Inertia::render('settings/account', [
            'mustVerifyEmail' => Auth::user() instanceof \Illuminate\Contracts\Auth\MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Show the agency settings page.
     */
    public function agency(): Response
    {
        /** @var User $user */
        $user = Auth::user();
        
        return Inertia::render('settings/agency', [
            'agency' => [
                'name' => $user->name,
                'url' => $user->email, // You might want to add a separate URL field to users table
            ],
        ]);
    }

    /**
     * Update the agency settings.
     */
    public function updateAgency(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'url' => ['nullable', 'url', 'max:255'],
        ]);

        /** @var User $user */
        $user = Auth::user();
        
        // Update agency name
        $user->update([
            'name' => $request->name,
            // If you add a URL field to the users table, update it here:
            // 'url' => $request->url,
        ]);

        return back()->with('status', 'Agency information updated successfully!');
    }
}
