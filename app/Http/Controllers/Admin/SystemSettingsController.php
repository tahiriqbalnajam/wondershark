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
            ],
            'analytics' => [
                'use_relative_trend_calculation' => SystemSetting::getBoolean('use_relative_trend_calculation', false),
            ],
        ];

        return Inertia::render('admin/settings/index', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'allow_agency_post_creation' => 'boolean',
            'allow_brand_post_creation' => 'boolean',
            'enforce_brand_post_limits' => 'boolean',
            'default_monthly_post_limit' => 'integer|min:0',
            'use_relative_trend_calculation' => 'boolean',
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

        if ($request->has('use_relative_trend_calculation')) {
            SystemSetting::set(
                'use_relative_trend_calculation',
                $request->boolean('use_relative_trend_calculation') ? 'true' : 'false',
                'boolean',
                'Use Point-A to Point-B relative growth calculation for trends instead of Period-over-Period absolute change'
            );
        }

        return redirect()->back()->with('success', 'Settings updated successfully.');
    }

    public function stripe()
    {
        $settings = [
            'stripe_mode' => SystemSetting::get('stripe_mode', 'test'),
            'stripe_test_publishable_key' => SystemSetting::get('stripe_test_publishable_key', ''),
            'stripe_test_secret_key' => SystemSetting::get('stripe_test_secret_key', ''),
            'stripe_live_publishable_key' => SystemSetting::get('stripe_live_publishable_key', ''),
            'stripe_live_secret_key' => SystemSetting::get('stripe_live_secret_key', ''),
        ];

        return Inertia::render('admin/settings/stripe', [
            'settings' => $settings,
        ]);
    }

    public function updateStripe(Request $request)
    {
        $request->validate([
            'stripe_mode' => 'required|in:test,live',
            'stripe_test_publishable_key' => 'nullable|string',
            'stripe_test_secret_key' => 'nullable|string',
            'stripe_live_publishable_key' => 'nullable|string',
            'stripe_live_secret_key' => 'nullable|string',
        ]);

        // Update Stripe mode
        SystemSetting::set(
            'stripe_mode',
            $request->input('stripe_mode'),
            'string',
            'Stripe API mode (test or live)'
        );

        // Update test keys
        if ($request->has('stripe_test_publishable_key')) {
            SystemSetting::set(
                'stripe_test_publishable_key',
                $request->input('stripe_test_publishable_key'),
                'string',
                'Stripe test publishable key'
            );
        }

        if ($request->has('stripe_test_secret_key')) {
            SystemSetting::set(
                'stripe_test_secret_key',
                $request->input('stripe_test_secret_key'),
                'string',
                'Stripe test secret key'
            );
        }

        // Update live keys
        if ($request->has('stripe_live_publishable_key')) {
            SystemSetting::set(
                'stripe_live_publishable_key',
                $request->input('stripe_live_publishable_key'),
                'string',
                'Stripe live publishable key'
            );
        }

        if ($request->has('stripe_live_secret_key')) {
            SystemSetting::set(
                'stripe_live_secret_key',
                $request->input('stripe_live_secret_key'),
                'string',
                'Stripe live secret key'
            );
        }

        return redirect()->back()->with('success', 'Stripe settings updated successfully.');
    }
}
