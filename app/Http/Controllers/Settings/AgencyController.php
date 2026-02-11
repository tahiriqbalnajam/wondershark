<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
                'url' => $user->url,
                'logo' => $user->logo ? asset('storage/'.$user->logo) : null,
                'color' => $user->agency_color ?? '',
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
            'logo' => ['nullable', 'image', 'max:2048'], // 2MB max
            'color' => ['nullable', 'string', 'regex:/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/'],
        ]);

        /** @var User $user */
        $user = Auth::user();

        // Normalize color value to 6-digit lowercase hex
        $normalizedColor = null;
        if ($request->color) {
            $color = strtolower(trim($request->color));
            // Convert 3-digit hex to 6-digit hex
            if (strlen($color) === 4 && $color[0] === '#') {
                $color = '#' . $color[1] . $color[1] . $color[2] . $color[2] . $color[3] . $color[3];
            }
            $normalizedColor = $color;
        }

        $updateData = [
            'name' => $request->name,
            'url' => $request->url,
            'agency_color' => $normalizedColor,
        ];

        // Handle logo upload
        if ($request->hasFile('logo')) {
            // Delete old logo and thumbnail if exists
            if ($user->logo) {
                Storage::disk('public')->delete($user->logo);
            }
            if ($user->logo_thumbnail) {
                Storage::disk('public')->delete($user->logo_thumbnail);
            }

            $logo = $request->file('logo');
            $extension = $logo->getClientOriginalExtension();
            $filename = 'agency_'.$user->id.'_'.time();

            // Store original logo
            $logoPath = $logo->storeAs('agency-logos', $filename.'.'.$extension, 'public');
            $updateData['logo'] = $logoPath;

            // Create thumbnail (80x80)
            $thumbnailPath = $this->createThumbnail($logo, $filename, $extension);
            if ($thumbnailPath) {
                $updateData['logo_thumbnail'] = $thumbnailPath;
            }
        }

        $user->update($updateData);

        return back()->with('status', 'Agency information updated successfully!');
    }

    /**
     * Create a thumbnail version of the uploaded image.
     */
    private function createThumbnail($file, string $filename, string $extension): ?string
    {
        try {
            $image = imagecreatefromstring(file_get_contents($file->getRealPath()));

            if (! $image) {
                return null;
            }

            $originalWidth = imagesx($image);
            $originalHeight = imagesy($image);

            // Create 80x80 thumbnail
            $thumbnailSize = 80;
            $thumbnail = imagecreatetruecolor($thumbnailSize, $thumbnailSize);

            // Preserve transparency for PNG and GIF
            if ($extension === 'png' || $extension === 'gif') {
                imagealphablending($thumbnail, false);
                imagesavealpha($thumbnail, true);
                $transparent = imagecolorallocatealpha($thumbnail, 255, 255, 255, 127);
                imagefilledrectangle($thumbnail, 0, 0, $thumbnailSize, $thumbnailSize, $transparent);
            }

            // Resize image
            imagecopyresampled(
                $thumbnail,
                $image,
                0, 0, 0, 0,
                $thumbnailSize,
                $thumbnailSize,
                $originalWidth,
                $originalHeight
            );

            // Save thumbnail
            $thumbnailFilename = $filename.'_thumb.'.$extension;
            $thumbnailPath = storage_path('app/public/agency-logos/'.$thumbnailFilename);

            // Ensure directory exists
            if (! file_exists(dirname($thumbnailPath))) {
                mkdir(dirname($thumbnailPath), 0755, true);
            }

            // Save based on extension
            $saved = false;
            switch (strtolower($extension)) {
                case 'jpg':
                case 'jpeg':
                    $saved = imagejpeg($thumbnail, $thumbnailPath, 90);
                    break;
                case 'png':
                    $saved = imagepng($thumbnail, $thumbnailPath, 9);
                    break;
                case 'gif':
                    $saved = imagegif($thumbnail, $thumbnailPath);
                    break;
                case 'webp':
                    $saved = imagewebp($thumbnail, $thumbnailPath, 90);
                    break;
            }

            imagedestroy($image);
            imagedestroy($thumbnail);

            return $saved ? 'agency-logos/'.$thumbnailFilename : null;
        } catch (\Exception $e) {
            \Log::error('Failed to create thumbnail: '.$e->getMessage());

            return null;
        }
    }
}
