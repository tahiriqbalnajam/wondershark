<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiModel extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'display_name',
        'icon',
        'is_enabled',
        'prompts_per_brand',
        'api_config',
        'order',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'api_config' => 'array',
    ];

    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }
}
