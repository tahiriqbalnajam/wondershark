<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\SystemSetting;

class SystemSettingsSeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        // System settings for post creation control
        SystemSetting::set(
            'allow_agency_post_creation',
            'true',
            'boolean',
            'Allow agencies to create posts for their brands'
        );

        SystemSetting::set(
            'allow_brand_post_creation',
            'true',
            'boolean',
            'Allow brands to create posts directly'
        );

        SystemSetting::set(
            'enforce_brand_post_limits',
            'true',
            'boolean',
            'Enforce monthly post limits set for each brand'
        );

        SystemSetting::set(
            'default_monthly_post_limit',
            '50',
            'integer',
            'Default monthly post limit for new brands'
        );
    }
}
