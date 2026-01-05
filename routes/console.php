<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Competitive Analysis Scheduling - Runs at 2 AM and 2 PM
Schedule::command('brands:analyze-competitive-stats')
    ->twiceDaily(2, 14)
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();

// Brand Prompt Analysis Scheduling (only unanalyzed prompts) - Runs at 2 AM and 2 PM
Schedule::command('brand:analyze-prompts --all')
    ->twiceDaily(2, 14)
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();

// Post Prompt Stats Fetching - Runs daily at 3 AM
Schedule::command('posts:fetch-prompts-stats')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();
