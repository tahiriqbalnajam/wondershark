<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebsiteUrl extends Model
{
    protected $fillable = [
        'title',
        'url',
        'description',
        'is_enabled',
        'order',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
    ];

    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('order')->orderBy('id');
    }
}
