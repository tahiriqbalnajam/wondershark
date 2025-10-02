<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Competitor extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
        'name',
        'domain',
        'mentions',
        'status',
        'source',
        'rank',
        'visibility',
        'sentiment',
        'traffic_estimate',
        'market_share',
        'social_metrics',
        'stats_updated_at',
    ];

    protected $casts = [
        'social_metrics' => 'array',
        'stats_updated_at' => 'datetime',
        'visibility' => 'decimal:2',
        'sentiment' => 'decimal:2',
        'market_share' => 'decimal:2',
    ];

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * Scope to get only accepted (active) competitors
     */
    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }
}
