<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Check competitors for brand 30
$brand = \App\Models\Brand::find(30);

if ($brand) {
    echo "Brand found: {$brand->name}\n";
    
    $competitors = $brand->competitors;
    echo "Competitors count: {$competitors->count()}\n";
    
    foreach ($competitors as $competitor) {
        echo "ID: {$competitor->id}, Name: {$competitor->name}, Domain: {$competitor->domain}, Status: {$competitor->status}\n";
    }
} else {
    echo "Brand with ID 30 not found\n";
}