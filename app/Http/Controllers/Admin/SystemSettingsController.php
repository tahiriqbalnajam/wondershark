<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SystemSettingsController extends Controller
{
    public function index()
    {
        $settings = [
            'post_creation' => [
                'allow_agency_post_creation' => SystemSetting::getBoolean('allow_agency_post_creation', true),
                'allow_brand_post_creation' => SystemSetting::getBoolean('allow_brand_post_creation', true),
                'enforce_brand_post_limits' => SystemSetting::getBoolean('enforce_brand_post_limits', true),
                'default_monthly_post_limit' => SystemSetting::getInteger('default_monthly_post_limit', 50),
            ]
        ];

        return Inertia::render('admin/settings/index', [
            'settings' => $settings
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'allow_agency_post_creation' => 'boolean',
            'allow_brand_post_creation' => 'boolean',
            'enforce_brand_post_limits' => 'boolean',
            'default_monthly_post_limit' => 'integer|min:0',
        ]);

        // Update post creation settings
        if ($request->has('allow_agency_post_creation')) {
            SystemSetting::set(
                'allow_agency_post_creation',
                $request->boolean('allow_agency_post_creation') ? 'true' : 'false',
                'boolean',
                'Allow agencies to create posts for their brands'
            );
        }

        if ($request->has('allow_brand_post_creation')) {
            SystemSetting::set(
                'allow_brand_post_creation',
                $request->boolean('allow_brand_post_creation') ? 'true' : 'false',
                'boolean',
                'Allow brands to create posts directly'
            );
        }

        if ($request->has('enforce_brand_post_limits')) {
            SystemSetting::set(
                'enforce_brand_post_limits',
                $request->boolean('enforce_brand_post_limits') ? 'true' : 'false',
                'boolean',
                'Enforce monthly post limits set for each brand'
            );
        }

        if ($request->has('default_monthly_post_limit')) {
            SystemSetting::set(
                'default_monthly_post_limit',
                $request->integer('default_monthly_post_limit'),
                'integer',
                'Default monthly post limit for new brands'
            );
        }

        return redirect()->back()->with('success', 'Settings updated successfully.');
    }
}
