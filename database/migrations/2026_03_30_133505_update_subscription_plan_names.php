<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing plan names to new format
        DB::table('subscriptions')
            ->where('plan_name', 'growth')
            ->update(['plan_name' => 'agency_growth']);

        DB::table('subscriptions')
            ->where('plan_name', 'unlimited')
            ->update(['plan_name' => 'agency_unlimited']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to old plan names
        DB::table('subscriptions')
            ->where('plan_name', 'agency_growth')
            ->update(['plan_name' => 'growth']);

        DB::table('subscriptions')
            ->where('plan_name', 'agency_unlimited')
            ->update(['plan_name' => 'unlimited']);
    }
};
