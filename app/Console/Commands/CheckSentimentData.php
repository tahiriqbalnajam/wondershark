<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CheckSentimentData extends Command
{
    protected $signature = 'debug:sentiment';
    protected $description = 'Show saved sentiment values across brand_prompts, brand_mentions, and brand_competitive_stats';

    public function handle(): void
    {
        $out = [];

        // ── 1. brand_prompts (grouped counts) ────────────────────────────────
        $out[] = "\n--- brand_prompts.sentiment (grouped) ---";
        $grouped = DB::table('brand_prompts')
            ->whereNotNull('analysis_completed_at')
            ->selectRaw('sentiment, COUNT(*) as cnt')
            ->groupBy('sentiment')
            ->orderByDesc('cnt')
            ->get();
        foreach ($grouped as $r) {
            $out[] = "  " . str_pad((string)($r->sentiment ?? 'NULL'), 12) . " => {$r->cnt} rows";
        }

        // ── 2. brand_prompts (latest 10) ─────────────────────────────────────
        $out[] = "\n--- brand_prompts.sentiment (latest 10, ordered by analyzed_at desc) ---";
        $prompts = DB::table('brand_prompts')
            ->whereNotNull('analysis_completed_at')
            ->orderByDesc('analysis_completed_at')
            ->limit(10)
            ->get(['id', 'brand_id', 'sentiment', 'analysis_completed_at']);
        foreach ($prompts as $r) {
            $s = $r->sentiment ?? 'NULL';
            $out[] = "  prompt#{$r->id}  brand#{$r->brand_id}  sentiment={$s}  at={$r->analysis_completed_at}";
        }

        // ── 3. brand_mentions (latest 10) ────────────────────────────────────
        $out[] = "\n--- brand_mentions.sentiment (latest 10) ---";
        $mentions = DB::table('brand_mentions')
            ->orderByDesc('analyzed_at')
            ->limit(10)
            ->get(['id', 'entity_type', 'entity_name', 'sentiment', 'analyzed_at']);
        foreach ($mentions as $r) {
            $s = $r->sentiment ?? 'NULL';
            $out[] = "  mention#{$r->id}  [{$r->entity_type}]  {$r->entity_name}  sentiment={$s}";
        }

        // ── 4. brand_mentions (grouped) ───────────────────────────────────────
        $out[] = "\n--- brand_mentions.sentiment (grouped by entity_type) ---";
        $mGrouped = DB::table('brand_mentions')
            ->selectRaw('entity_type, sentiment, COUNT(*) as cnt')
            ->groupBy('entity_type', 'sentiment')
            ->orderBy('entity_type')
            ->orderByDesc('cnt')
            ->get();
        foreach ($mGrouped as $r) {
            $s = $r->sentiment ?? 'NULL';
            $out[] = "  [{$r->entity_type}]  sentiment={$s}  => {$r->cnt} rows";
        }

        // ── 5. brand_competitive_stats (latest 10) ────────────────────────────
        $out[] = "\n--- brand_competitive_stats.sentiment (latest 10) ---";
        $stats = DB::table('brand_competitive_stats')
            ->orderByDesc('analyzed_at')
            ->limit(10)
            ->get(['id', 'entity_type', 'entity_name', 'sentiment', 'analyzed_at']);
        foreach ($stats as $r) {
            $s = $r->sentiment ?? 'NULL';
            $out[] = "  stat#{$r->id}  [{$r->entity_type}]  {$r->entity_name}  sentiment={$s}  at={$r->analyzed_at}";
        }

        $out[] = "\nDone.";

        // Write to file for clean reading
        $path = storage_path('logs/sentiment_debug.txt');
        file_put_contents($path, implode("\n", $out));
        $this->info("Report written to: {$path}");
    }
}
