<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostPrompt extends Model
{
    use HasFactory;

    // Use unified brand_prompts table
    protected $table = 'brand_prompts';

    protected $fillable = [
        'brand_id',
        'post_id',
        'session_id',
        'prompt',
        'source',
        'ai_provider',
        'order',
        'is_active',
        'is_selected',
        'country_code',
        'position',
        'sentiment',
        'visibility',
        'volume',
        'location',
        'status',
        'ai_response',
        'resources',
        'competitor_mentions',
        'analysis_completed_at',
        'analysis_failed_at',
        'analysis_error',
        'ai_model_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_selected' => 'boolean',
        'order' => 'integer',
        'position' => 'integer',
        'resources' => 'array',
        'competitor_mentions' => 'array',
        'analysis_completed_at' => 'datetime',
        'analysis_failed_at' => 'datetime',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        // Apply global scope to only get post prompts (post_id is not null)
        static::addGlobalScope('post_prompts', function ($query) {
            $query->whereNotNull('post_id');
        });

        // Auto-set post_id to 0 if not provided (to differentiate from brand prompts)
        static::creating(function ($model) {
            if ($model->post_id === null) {
                $model->post_id = 0;
            }
        });
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function aiModel(): BelongsTo
    {
        return $this->belongsTo(AiModel::class);
    }

    // Scope to get only post prompts (not brand prompts)
    public function scopePostPrompts($query)
    {
        return $query->whereNotNull('post_id');
    }

    // Scope to get only brand prompts (not post prompts)
    public function scopeBrandPrompts($query)
    {
        return $query->whereNull('post_id');
    }

    public function scopeForPost($query, int $postId)
    {
        return $query->where('post_id', $postId);
    }

    public function scopeForSession($query, string $sessionId)
    {
        return $query->where('session_id', $sessionId);
    }

    public function scopeSelected($query)
    {
        return $query->where('is_selected', true);
    }
}
