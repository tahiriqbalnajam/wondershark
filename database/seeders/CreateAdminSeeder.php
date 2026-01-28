<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CreateAdminSeeder extends Seeder
{
    public function run()
    {
        $user = User::firstOrCreate([
            'email' => 'admin@admin.com',
        ], [
            'name' => 'Administrator',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        $user->assignRole('admin');

        echo "Admin user created: {$user->email}".PHP_EOL;
        echo 'Password: password'.PHP_EOL;
    }
}
