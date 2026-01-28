<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo 'Total brands: '.App\Models\Brand::count().PHP_EOL;

$brands = App\Models\Brand::latest()->take(3)->get(['id', 'name', 'agency_id']);
foreach ($brands as $brand) {
    echo "Brand ID: {$brand->id}, Name: {$brand->name}, Agency ID: {$brand->agency_id}".PHP_EOL;
}
