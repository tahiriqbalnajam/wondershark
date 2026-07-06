<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== BrandMention dates for brand 315 ===\n";
$dates = DB::table('brand_mentions')
    ->where('brand_id', 315)
    ->select(DB::raw('DATE(analyzed_at) as d'), DB::raw('COUNT(*) as cnt'))
    ->groupBy('d')
    ->orderBy('d', 'desc')
    ->get();
foreach ($dates as $row) {
    echo $row->d . " = " . $row->cnt . " mentions\n";
}

echo "\n=== Prompt analysis dates for brand 315 ===\n";
$dates2 = DB::table('brand_prompts')
    ->where('brand_id', 315)
    ->whereNotNull('analysis_completed_at')
    ->select(DB::raw('DATE(analysis_completed_at) as d'), DB::raw('COUNT(*) as cnt'))
    ->groupBy('d')
    ->orderBy('d', 'desc')
    ->get();
foreach ($dates2 as $row) {
    echo $row->d . " = " . $row->cnt . " prompts analyzed\n";
}

echo "\n=== Pending/Failed prompts for brand 315 ===\n";
$pending = DB::table('brand_prompts')
    ->where('brand_id', 315)
    ->where('is_active', true)
    ->whereNull('analysis_completed_at')
    ->count();
echo "Active prompts not analyzed: $pending\n";

$failed = DB::table('brand_prompts')
    ->where('brand_id', 315)
    ->whereNotNull('analysis_failed_at')
    ->where('analysis_failed_at', '>', '2026-06-01')
    ->count();
echo "Failed after June 1: $failed\n";

$failedList = DB::table('brand_prompts')
    ->where('brand_id', 315)
    ->whereNotNull('analysis_failed_at')
    ->where('analysis_failed_at', '>', '2026-06-01')
    ->select('id', 'analysis_failed_at', 'analysis_error')
    ->orderBy('analysis_failed_at', 'desc')
    ->get();
foreach ($failedList as $row) {
    echo "  Prompt #$row->id failed at $row->analysis_failed_at: $row->analysis_error\n";
}

echo "\nDone.\n";
