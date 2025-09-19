<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandPromptResource extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_prompt_id',
        'url',
        'type',
        'domain',
        'title',
        'description',
        'is_competitor_url',
    ];

    protected $casts = [
        'is_competitor_url' => 'boolean',
    ];

    /**
     * Get the brand prompt that owns this resource
     */
    public function brandPrompt(): BelongsTo
    {
        return $this->belongsTo(BrandPrompt::class);
    }

    /**
     * Scope to filter by competitor URLs
     */
    public function scopeCompetitorUrls($query)
    {
        return $query->where('is_competitor_url', true);
    }

    /**
     * Scope to filter by resource type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to filter by domain
     */
    public function scopeByDomain($query, string $domain)
    {
        return $query->where('domain', $domain);
    }
}
