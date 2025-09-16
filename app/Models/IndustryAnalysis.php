<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IndustryAnalysis extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'user_id',
        'target_url',
        'country',
        'industry_rankings',
        'top_sources',
        'metadata',
        'status',
        'error_message',
    ];

    protected $casts = [
        'industry_rankings' => 'array',
        'top_sources' => 'array',
        'metadata' => 'array',
    ];

    /**
     * Get the post that this analysis belongs to
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * Get the user who requested this analysis
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all AI API responses for this analysis
     */
    public function aiResponses(): HasMany
    {
        return $this->hasMany(AiApiResponse::class);
    }

    /**
     * Get completed AI responses only
     */
    public function completedResponses(): HasMany
    {
        return $this->hasMany(AiApiResponse::class)->where('status', 'completed');
    }

    /**
     * Check if analysis is complete
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Get analysis progress percentage
     */
    public function getProgressPercentage(): int
    {
        $totalExpected = \App\Models\AiModel::enabled()->count();
        if ($totalExpected === 0) {
            return 0;
        }
        
        $completed = $this->aiResponses()->whereIn('status', ['completed', 'failed'])->count();
        return (int) (($completed / $totalExpected) * 100);
    }

    /**
     * Scope for filtering by status
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for filtering by country
     */
    public function scopeByCountry($query, string $country)
    {
        return $query->where('country', $country);
    }
}
