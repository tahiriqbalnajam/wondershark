<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostCitation extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'ai_model',
        'citation_text',
        'citation_url',
        'position',
        'is_mentioned',
        'metadata',
        'checked_at',
    ];

    protected $casts = [
        'is_mentioned' => 'boolean',
        'metadata' => 'array',
        'checked_at' => 'datetime',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }
}
