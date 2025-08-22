<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
        'user_id',
        'title',
        'url',
        'description',
        'status',
        'posted_at',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function citations(): HasMany
    {
        return $this->hasMany(PostCitation::class);
    }

    public function prompts(): HasMany
    {
        return $this->hasMany(PostPrompt::class);
    }

    public function getCitationByAiModel(string $aiModel): ?PostCitation
    {
        return $this->citations()->where('ai_model', $aiModel)->first();
    }

    public function isMentionedInAi(string $aiModel): bool
    {
        return $this->citations()
            ->where('ai_model', $aiModel)
            ->where('is_mentioned', true)
            ->exists();
    }
}
