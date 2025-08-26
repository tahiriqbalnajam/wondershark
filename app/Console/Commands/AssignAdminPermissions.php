<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Spatie\Permission\Models\Permission;

class AssignAdminPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:assign-permissions {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign admin permissions to a user';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            $this->error("User with email {$email} not found.");
            return 1;
        }

        // List available permissions
        $this->info('Available permissions:');
        Permission::all()->each(function($permission) {
            $this->line('- ' . $permission->name);
        });

        // Check if required permissions exist, if not create them
        $requiredPermissions = ['view-admin-panel', 'manage-system'];
        
        foreach ($requiredPermissions as $permissionName) {
            $permission = Permission::firstOrCreate(['name' => $permissionName]);
            $user->givePermissionTo($permission);
            $this->info("Assigned permission: {$permissionName}");
        }

        $this->info("All admin permissions assigned to {$user->name} ({$user->email})");
        
        // Show user's current permissions
        $this->info('Current permissions:');
        $user->permissions->each(function($permission) {
            $this->line('- ' . $permission->name);
        });
        
        return 0;
    }
}
