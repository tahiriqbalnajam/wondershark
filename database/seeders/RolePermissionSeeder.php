<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // Dashboard permissions
            'view-dashboard',
            'manage-dashboard',

            // User management permissions
            'view-users',
            'create-users',
            'edit-users',
            'delete-users',

            // Settings permissions
            'view-settings',
            'manage-settings',

            // Admin permissions
            'view-admin-panel',
            'manage-system',
            'manage-ai-models',
            'manage-citation-check',


            // Agency manager permissions
            'view-all-brands',
            'manage-competitors', 
            'manage-prompts',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Create roles and assign permissions
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->syncPermissions(Permission::all());

        $agencyRole = Role::firstOrCreate(['name' => 'agency']);
        $agencyRole->syncPermissions([
            'view-dashboard',
            'manage-dashboard',
            'view-settings',
        ]);

        $brandRole = Role::firstOrCreate(['name' => 'brand']);
        $brandRole->syncPermissions([
            'view-dashboard',
            'manage-dashboard',
            'view-settings',
            
        ]);

        $agencyMemberRole = Role::firstOrCreate(['name' => 'agency_member']);
        $agencyMemberRole->syncPermissions([
            'view-dashboard',
            'manage-dashboard',
            'view-settings',
            'view-settings',
            'manage-settings',
           
        ]);



        $agencyMemberRole = Role::firstOrCreate(['name' => 'agency_manager']);
        $agencyMemberRole->syncPermissions([
            'view-dashboard',
            'manage-dashboard',
            'view-settings',
            'view-settings',
            'manage-settings',
           
        ]);

        // Assign roles to existing users
        $testUser = User::where('email', 'test@example.com')->first();
        if ($testUser) {
            $testUser->assignRole('admin');
        }

        // Create test agency user
        $agencyUser = User::firstOrCreate(
            ['email' => 'agency@example.com'],
            [
                'name' => 'Test Agency User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $agencyUser->assignRole('agency');

        // Create test brand user
        $brandUser = User::firstOrCreate(
            ['email' => 'brand@example.com'],
            [
                'name' => 'Test Brand User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $brandUser->assignRole('brand');
    }
}
