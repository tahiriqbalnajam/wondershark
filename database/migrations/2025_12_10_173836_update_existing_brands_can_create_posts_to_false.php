<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update all existing brands to have can_create_posts set to false
        DB::table('brands')->update(['can_create_posts' => false]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optionally restore to true if needed
        DB::table('brands')->update(['can_create_posts' => true]);
    }
};
