<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Repair overrides that were saved for a day ahead of the app calendar.
     *
     * The admin drawer lists days in the request timezone (default +00:00), so near
     * midnight UTC its "today" can be tomorrow in the app timezone
     * (America/Montreal). `store()` used to write noon of that day, which is after
     * `now()->endOfDay()` — the upper bound of the 30-day period the average is
     * computed over. Those overrides were saved but never counted, which is why the
     * average appeared not to change. New saves keep the current instant; move the
     * existing rows onto it so they are counted too.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('brand_competitive_stats', 'visibility_override')) {
            return;
        }

        DB::table('brand_competitive_stats')
            ->whereNotNull('visibility_override')
            ->where('analyzed_at', '>', now())
            ->update(['analyzed_at' => now()]);
    }

    public function down(): void
    {
        // Irreversible data repair — the original future timestamps carried no meaning.
    }
};
