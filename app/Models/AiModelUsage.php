<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiModelUsage extends Model
{
    protected $fillable = [
        'session_id',
        'ai_model_id',
        'usage_count',
        'context_type',
        'context_id',
    ];

    protected function casts(): array
    {
        return [
            'usage_count' => 'integer',
        ];
    }

    public function aiModel()
    {
        return $this->belongsTo(AiModel::class);
    }

    /**
     * Increment usage count for a model in a session
     */
    public static function incrementUsage(int $aiModelId, string $sessionId, ?string $contextType = null, ?int $contextId = null): void
    {
        $usage = static::firstOrNew([
            'session_id' => $sessionId,
            'ai_model_id' => $aiModelId,
            'context_type' => $contextType,
            'context_id' => $contextId,
        ]);

        $usage->usage_count = ($usage->usage_count ?? 0) + 1;
        $usage->save();
    }

    /**
     * Get usage counts for a session
     */
    public static function getSessionUsage(string $sessionId): array
    {
        return static::where('session_id', $sessionId)
            ->selectRaw('ai_model_id, SUM(usage_count) as total')
            ->groupBy('ai_model_id')
            ->pluck('total', 'ai_model_id')
            ->toArray();
    }
}
