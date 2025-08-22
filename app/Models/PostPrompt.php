<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostPrompt extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'session_id',
        'prompt',
        'source',
        'ai_provider',
        'order',
        'is_selected',
    ];

    protected $casts = [
        'is_selected' => 'boolean',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
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
