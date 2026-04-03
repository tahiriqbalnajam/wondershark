<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeatureUsage extends Model
{
    protected $table = 'feature_usage';

    protected $fillable = [
        'user_id',
        'feature_key',  // max 100 chars
        'entity_type',  // max 50 chars
        'entity_id',
        'period',       // max 20 chars (e.g. '2026-04' or 'lifetime')
        'used_count',
    ];

    protected $casts = [
        'used_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get current usage count for a user + feature + optional entity + period.
     */
    public static function getCount(
        int $userId,
        string $featureKey,
        string $period,
        ?string $entityType = null,
        ?int $entityId = null
    ): int {
        return static::where('user_id', $userId)
            ->where('feature_key', $featureKey)
            ->where('period', $period)
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->value('used_count') ?? 0;
    }

    /**
     * Increment usage by 1, creating the record if it doesn't exist.
     */
    public static function incrementUsage(
        int $userId,
        string $featureKey,
        string $period,
        ?string $entityType = null,
        ?int $entityId = null
    ): void {
        static::firstOrCreate(
            [
                'user_id'     => $userId,
                'feature_key' => $featureKey,
                'entity_type' => $entityType,
                'entity_id'   => $entityId,
                'period'      => $period,
            ],
            ['used_count' => 0]
        );

        static::where('user_id', $userId)
            ->where('feature_key', $featureKey)
            ->where('period', $period)
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->increment('used_count');
    }

    /**
     * Decrement usage by 1 (e.g. when deleting a competitor).
     */
    public static function decrementUsage(
        int $userId,
        string $featureKey,
        string $period,
        ?string $entityType = null,
        ?int $entityId = null
    ): void {
        static::where('user_id', $userId)
            ->where('feature_key', $featureKey)
            ->where('period', $period)
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->where('used_count', '>', 0)
            ->decrement('used_count');
    }
}
