<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandCompetitiveStat extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
        'entity_type',
        'competitor_id',
        'ai_model_id',
        'entity_name',
        'entity_url',
        'visibility',
        'visibility_override',
        'sentiment',
        'position',
        'raw_data',
        'analysis_session_id',
        'analyzed_at',
        'is_manual_override',
        'override_reason',
        'overridden_by',
        'overridden_at',
    ];

    protected $casts = [
        'raw_data' => 'array',
        'analyzed_at' => 'datetime',
        'overridden_at' => 'datetime',
        'visibility' => 'decimal:2',
        'visibility_override' => 'decimal:2',
        'position' => 'decimal:1',
        'is_manual_override' => 'boolean',
    ];

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

    public function overriddenBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'overridden_by');
    }

    /**
     * Get the previous stats for trend calculation
     */
    public function getPreviousStats()
    {
        return static::where('brand_id', $this->brand_id)
            ->where('entity_type', $this->entity_type)
            ->where('competitor_id', $this->competitor_id)
            ->where('ai_model_id', $this->ai_model_id)
            ->where('analyzed_at', '<', $this->analyzed_at)
            ->orderBy('analyzed_at', 'desc')
            ->first();
    }

    /**
     * Calculate trends compared to previous analysis
     */
    public function getTrends(): array
    {
        // Check data sufficiency - user requested trends only if > 2 dates of data
        $datesCount = static::where('brand_id', $this->brand_id)
            ->where('entity_type', $this->entity_type)
            ->where('competitor_id', $this->competitor_id)
            ->where('ai_model_id', $this->ai_model_id)
            ->selectRaw('COUNT(DISTINCT DATE(analyzed_at)) as count')
            ->value('count');

        if ($datesCount <= 2) {
            return [
                'visibility_trend' => 'new',
                'sentiment_trend' => 'new',
                'position_trend' => 'new',
                'visibility_change' => 0,
                'sentiment_change' => 0,
                'position_change' => 0,
            ];
        }

        $previous = $this->getPreviousStats();

        if (! $previous) {
            return [
                'visibility_trend' => 'new',
                'sentiment_trend' => 'new',
                'position_trend' => 'new',
                'visibility_change' => 0,
                'sentiment_change' => 0,
                'position_change' => 0,
            ];
        }

        $visibilityChange = $this->visibility - $previous->visibility;
        $sentimentChange = $this->sentiment - $previous->sentiment;
        $positionChange = $previous->position - $this->position; // Lower position is better

        return [
            'visibility_trend' => $visibilityChange > 0 ? 'up' : ($visibilityChange < 0 ? 'down' : 'stable'),
            'sentiment_trend' => $sentimentChange > 0 ? 'up' : ($sentimentChange < 0 ? 'down' : 'stable'),
            'position_trend' => $positionChange > 0 ? 'up' : ($positionChange < 0 ? 'down' : 'stable'),
            'visibility_change' => round($visibilityChange, 2),
            'sentiment_change' => $sentimentChange,
            'position_change' => round($positionChange, 1),
        ];
    }

    /**
     * Scope for getting latest stats for a brand
     */
    public function scopeLatestForBrand($query, $brandId)
    {
        return $query->where('brand_id', $brandId)
            ->whereIn('id', function ($subQuery) use ($brandId) {
                $subQuery->selectRaw('MAX(id)')
                    ->from('brand_competitive_stats')
                    ->where('brand_id', $brandId)
                    ->groupBy(['entity_type', 'competitor_id']);
            });
    }

    /**
     * Scope for brand entities only
     */
    public function scopeBrandEntity($query)
    {
        return $query->where('entity_type', 'brand');
    }

    /**
     * Scope for competitor entities only
     */
    public function scopeCompetitorEntity($query)
    {
        return $query->where('entity_type', 'competitor');
    }

    /**
     * Get formatted visibility percentage
     */
    public function getVisibilityPercentageAttribute(): string
    {
        return number_format($this->getEffectiveVisibility(), 1).'%';
    }

    /**
     * Get the effective visibility value (override takes precedence over AI)
     */
    public function getEffectiveVisibility(): float
    {
        return $this->visibility_override ?? $this->visibility;
    }

    /**
     * Check if this stat has an active override
     */
    public function hasOverride(): bool
    {
        return $this->visibility_override !== null;
    }

    /**
     * Get formatted position with ordinal
     */
    public function getPositionFormattedAttribute(): string
    {
        $pos = $this->position;
        if ($pos == 1.0) {
            return '1st';
        }
        if ($pos == 2.0) {
            return '2nd';
        }
        if ($pos == 3.0) {
            return '3rd';
        }

        return number_format($pos, 1);
    }

    /**
     * Get sentiment level description
     */
    public function getSentimentLevelAttribute(): string
    {
        $sentiment = $this->sentiment;
        if ($sentiment === null) {
            return 'N/A';
        }
        if ($sentiment >= 80) {
            return 'Excellent';
        }
        if ($sentiment >= 70) {
            return 'Good';
        }
        if ($sentiment >= 60) {
            return 'Fair';
        }
        if ($sentiment >= 50) {
            return 'Poor';
        }

        return 'Very Poor';
    }
}
