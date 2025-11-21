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
        'prompt',
        'country_code',
        'order',
        'position',
        'sentiment',
        'visibility',
        'is_active',
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
        'is_active' => 'boolean',
        'order' => 'integer',
        'position' => 'integer',
        'resources' => 'array',
        'competitor_mentions' => 'array',
        'analysis_completed_at' => 'datetime',
        'analysis_failed_at' => 'datetime',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
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
}
