<?php

require_once 'vendor/autoload.php';

use App\Models\User;
use Illuminate\Support\Facades\Hash;

// Boot Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    echo "Fixing password hash for admin@wondershark.ai user..." . PHP_EOL;
    
    $user = User::where('email', 'admin@wondershark.ai')->first();
    
    if ($user) {
        echo "Found user: {$user->name} ({$user->email})" . PHP_EOL;
        echo "Current password hash: " . substr($user->password, 0, 30) . "..." . PHP_EOL;
        echo "Hash algorithm: " . (password_get_info($user->password)['algo'] ?? 'unknown') . PHP_EOL;
        
        // Properly hash the password using Bcrypt
        $newPassword = Hash::make('12345678');
        
        echo PHP_EOL . "Generating new Bcrypt hash..." . PHP_EOL;
        echo "New hash: " . substr($newPassword, 0, 30) . "..." . PHP_EOL;
        echo "Hash algorithm: " . password_get_info($newPassword)['algo'] . PHP_EOL;
        
        // Update the password
        $user->password = $newPassword;
        $user->save();
        
        echo PHP_EOL . "Password updated successfully with proper Bcrypt hash!" . PHP_EOL;
        echo "New credentials:" . PHP_EOL;
        echo "Email: {$user->email}" . PHP_EOL;
        echo "Password: 12345678" . PHP_EOL;
        
        // Verify the password works
        if (Hash::check('12345678', $user->password)) {
            echo "✅ Password verification successful!" . PHP_EOL;
        } else {
            echo "❌ Password verification failed!" . PHP_EOL;
        }
        
    } else {
        echo "User with email admin@wondershark.ai not found" . PHP_EOL;
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . PHP_EOL;
}
