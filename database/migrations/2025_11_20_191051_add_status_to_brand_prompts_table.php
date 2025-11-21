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
        Schema::table('brand_prompts', function (Blueprint $table) {
            // Add status field: 'suggested', 'active', 'inactive'
            // Default is 'suggested' for newly AI-generated prompts
            $table->enum('status', ['suggested', 'active', 'inactive'])->default('suggested')->after('is_active');
            
            // Migrate existing data: is_active=1 -> 'active', is_active=0 -> 'suggested'
            // We'll update this after the column is added
        });
        
        // Update existing records based on is_active value
        DB::table('brand_prompts')
            ->where('is_active', true)
            ->update(['status' => 'active']);
            
        DB::table('brand_prompts')
            ->where('is_active', false)
            ->update(['status' => 'suggested']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('brand_prompts', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
