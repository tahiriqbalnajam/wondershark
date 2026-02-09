<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandMention extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_prompt_id',
        'brand_id',
        'ai_model_id',
        'entity_type',
        'competitor_id',
        'entity_name',
        'entity_domain',
        'mention_count',
        'position',
        'context',
        'session_id',
        'analyzed_at',
        'sentiment',
    ];

    protected $casts = [
        'analyzed_at' => 'datetime',
        'mention_count' => 'integer',
        'position' => 'integer',
    ];

    public function brandPrompt(): BelongsTo
    {
        return $this->belongsTo(BrandPrompt::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function competitor(): BelongsTo
    {
        return $this->belongsTo(Competitor::class);
    }

    public function aiModel(): BelongsTo
    {
        return $this->belongsTo(AiModel::class);
    }

    /**
     * Scope to filter by brand
     */
    public function scopeForBrand($query, int $brandId)
    {
        return $query->where('brand_id', $brandId);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('analyzed_at', [$startDate, $endDate]);
    }

    /**
     * Scope to filter by AI model
     */
    public function scopeForAiModel($query, int $aiModelId)
    {
        return $query->where('ai_model_id', $aiModelId);
    }
}
