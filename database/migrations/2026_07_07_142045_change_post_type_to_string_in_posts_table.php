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
        // Change post_type from enum to varchar(50) to support new values
        DB::statement("ALTER TABLE posts MODIFY post_type VARCHAR(50) NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverting to enum is risky if new values exist; keep as varchar
        DB::statement("ALTER TABLE posts MODIFY post_type VARCHAR(50) NULL");
    }
};
