<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class CheckUserRole extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:check {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check a user\'s roles and permissions';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            $this->error("User with email '{$email}' not found.");
            return 1;
        }
        
        $this->info("User Details:");
        $this->info("Name: {$user->name}");
        $this->info("Email: {$user->email}");
        $this->info("ID: {$user->id}");
        
        $this->info("\nRoles:");
        foreach ($user->roles as $role) {
            $this->info("- {$role->name}");
        }
        
        $this->info("\nPermissions:");
        foreach ($user->getAllPermissions() as $permission) {
            $this->info("- {$permission->name}");
        }
        
        $this->info("\nCan access:");
        $this->info("- Agency import (/posts/import): " . ($user->hasRole('agency') ? 'YES' : 'NO'));
        $this->info("- Admin import (/admin/posts/import): " . ($user->can('view-admin-panel') && $user->can('manage-system') ? 'YES' : 'NO'));
        
        return 0;
    }
}
