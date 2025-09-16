<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiApiResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'industry_analysis_id',
        'ai_provider',
        'prompt_used',
        'raw_response',
        'parsed_data',
        'status',
        'error_message',
        'processing_time',
        'tokens_used',
        'cost_estimate',
    ];

    protected $casts = [
        'parsed_data' => 'array',
        'processing_time' => 'float',
        'tokens_used' => 'integer',
        'cost_estimate' => 'decimal:4',
    ];

    /**
     * Get the industry analysis this response belongs to
     */
    public function industryAnalysis(): BelongsTo
    {
        return $this->belongsTo(IndustryAnalysis::class);
    }

    /**
     * Check if response is completed successfully
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if response has error
     */
    public function hasError(): bool
    {
        return $this->status === 'error';
    }

    /**
     * Get formatted cost
     */
    public function getFormattedCost(): string
    {
        return '$' . number_format($this->cost_estimate, 4);
    }

    /**
     * Scope for filtering by AI provider
     */
    public function scopeByProvider($query, string $provider)
    {
        return $query->where('ai_provider', $provider);
    }

    /**
     * Scope for filtering by status
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
}
