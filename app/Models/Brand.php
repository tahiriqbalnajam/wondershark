<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    use HasFactory;

    protected $fillable = [
        'agency_id',
        'user_id',
        'name',
        'website',
        'description',
        'monthly_posts',
        'status',
        'is_completed',
        'current_step',
        'session_id',
        'completed_at',
    ];

    protected $casts = [
        'monthly_posts' => 'integer',
        'is_completed' => 'boolean',
        'current_step' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function agency(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agency_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function prompts(): HasMany
    {
        return $this->hasMany(BrandPrompt::class);
    }

    public function subreddits(): HasMany
    {
        return $this->hasMany(BrandSubreddit::class);
    }
}
