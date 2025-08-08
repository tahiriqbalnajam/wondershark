<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GeneratedPrompt extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',
        'website',
        'prompt',
        'source',
        'ai_provider',
        'order',
        'is_selected',
    ];

    protected $casts = [
        'is_selected' => 'boolean',
        'order' => 'integer',
    ];

    public function scopeForSession($query, $sessionId)
    {
        return $query->where('session_id', $sessionId);
    }

    public function scopeForWebsite($query, $website)
    {
        return $query->where('website', $website);
    }

    public function scopeSelected($query)
    {
        return $query->where('is_selected', true);
    }
}
