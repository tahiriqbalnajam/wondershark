<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class CheckPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:check-permissions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check the roles and permissions setup';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=== Roles and Permissions Setup Check ===');
        $this->newLine();

        // Check roles
        $roles = Role::all();
        $this->info("Roles ({$roles->count()}):");
        foreach ($roles as $role) {
            $this->line("  - {$role->name}");
        }
        $this->newLine();

        // Check permissions
        $permissions = Permission::all();
        $this->info("Permissions ({$permissions->count()}):");
        foreach ($permissions as $permission) {
            $this->line("  - {$permission->name}");
        }
        $this->newLine();

        // Check test user
        $testUser = User::where('email', 'test@example.com')->first();
        if ($testUser) {
            $this->info("Test User (test@example.com):");
            $this->line("  Roles: " . $testUser->getRoleNames()->implode(', '));
            $this->line("  Direct Permissions: " . $testUser->getDirectPermissions()->pluck('name')->implode(', '));
            $this->line("  All Permissions: " . $testUser->getAllPermissions()->pluck('name')->implode(', '));
        } else {
            $this->error("Test user not found!");
        }

        $this->newLine();
        $this->info('Setup check complete!');
    }
}
