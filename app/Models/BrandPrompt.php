<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BrandPrompt extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
        'post_id',
        'prompt',
        'source',
        'ai_provider',
        'country_code',
        'order',
        'position',
        'sentiment',
        'visibility',
        'is_active',
        'is_selected',
        'status',
        'ai_response',
        'resources',
        'competitor_mentions',
        'session_id',
        'analysis_completed_at',
        'analysis_failed_at',
        'analysis_error',
        'ai_model_id',
    ];

    protected $casts = [
        'is_active'              => 'boolean',
        'is_selected'            => 'boolean',
        'order'                  => 'integer',
        'position'               => 'integer',
        // Note: 'sentiment' is NOT cast here — handled by getSentimentAttribute() accessor
        // to correctly convert legacy text labels ('positive','neutral','negative') to numeric scores.
        'resources'              => 'array',
        'competitor_mentions'    => 'array',
        'analysis_completed_at'  => 'datetime',
        'analysis_failed_at'     => 'datetime',
    ];

    /**
     * Normalize the raw sentiment value from the DB to a 0-100 integer.
     * Handles both new numeric values ("72") and legacy text labels ("positive", "neutral", "negative").
     * This prevents the old text values from being silently cast to 0 by PHP's integer coercion.
     */
    public function getSentimentAttribute(mixed $value): ?int
    {
        if ($value === null) {
            return null;
        }

        // Already a clean integer stored in DB
        if (is_int($value)) {
            return max(0, min(100, $value));
        }

        $raw = strtolower(trim((string) $value));

        // Numeric string (e.g. "72", "72/100")
        if (preg_match('/^(\d+(?:\.\d+)?)/', $raw, $m)) {
            $score = (float) $m[1];
            if ($score <= 10) {
                $score *= 10; // Convert old 1-10 scale
            }
            return (int) max(0, min(100, round($score)));
        }

        // Legacy text labels
        return match (true) {
            str_contains($raw, 'very positive') || str_contains($raw, 'excellent') => 90,
            str_contains($raw, 'positive')                                          => 75,
            str_contains($raw, 'very negative') || str_contains($raw, 'poor')      => 15,
            str_contains($raw, 'negative')                                          => 30,
            default                                                                  => 50, // neutral
        };
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        // Apply global scope to only get brand prompts (post_id is null)
        static::addGlobalScope('brand_prompts', function ($query) {
            $query->whereNull('post_id');
        });
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * Get the AI model used for this prompt analysis
     */
    public function aiModel(): BelongsTo
    {
        return $this->belongsTo(AiModel::class);
    }

    /**
     * Get the resources for this brand prompt
     */
    public function promptResources(): HasMany
    {
        return $this->hasMany(BrandPromptResource::class);
    }

    /**
     * Get only competitor URLs for this prompt
     */
    public function competitorResources(): HasMany
    {
        return $this->hasMany(BrandPromptResource::class)->competitorUrls();
    }

    /**
     * Scope to get only brand prompts (not post prompts)
     */
    public function scopeBrandPrompts($query)
    {
        return $query->whereNull('post_id');
    }

    /**
     * Scope to get only post prompts (not brand prompts)
     */
    public function scopePostPrompts($query)
    {
        return $query->whereNotNull('post_id');
    }
}
