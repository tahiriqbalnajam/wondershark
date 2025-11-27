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
        'entity_name',
        'entity_url',
        'visibility',
        'sentiment',
        'position',
        'raw_data',
        'analysis_session_id',
        'analyzed_at',
    ];

    protected $casts = [
        'raw_data' => 'array',
        'analyzed_at' => 'datetime',
        'visibility' => 'decimal:2',
        'position' => 'decimal:1',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function competitor(): BelongsTo
    {
        return $this->belongsTo(Competitor::class);
    }

    /**
     * Get the previous stats for trend calculation
     */
    public function getPreviousStats()
    {
        return static::where('brand_id', $this->brand_id)
            ->where('entity_type', $this->entity_type)
            ->where('competitor_id', $this->competitor_id)
            ->where('analyzed_at', '<', $this->analyzed_at)
            ->orderBy('analyzed_at', 'desc')
            ->first();
    }

    /**
     * Calculate trends compared to previous analysis
     */
    public function getTrends(): array
    {
        $previous = $this->getPreviousStats();
        
        if (!$previous) {
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
            ->whereIn('id', function($subQuery) use ($brandId) {
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
        return number_format($this->visibility, 1) . '%';
    }

    /**
     * Get formatted position with ordinal
     */
    public function getPositionFormattedAttribute(): string
    {
        $pos = $this->position;
        if ($pos == 1.0) return '1st';
        if ($pos == 2.0) return '2nd';
        if ($pos == 3.0) return '3rd';
        return number_format($pos, 1);
    }

    /**
     * Get sentiment level description
     */
    public function getSentimentLevelAttribute(): string
    {
        $sentiment = $this->sentiment;
        if ($sentiment >= 80) return 'Excellent';
        if ($sentiment >= 70) return 'Good';
        if ($sentiment >= 60) return 'Fair';
        if ($sentiment >= 50) return 'Poor';
        return 'Very Poor';
    }
}