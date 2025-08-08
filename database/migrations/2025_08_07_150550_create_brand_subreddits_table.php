<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('brand_subreddits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_id')->constrained()->onDelete('cascade');
            $table->string('subreddit_name');
            $table->text('description')->nullable();
            $table->enum('status', ['approved', 'pending', 'rejected'])->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('brand_subreddits');
    }
};
