<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandPrompt extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
        'prompt',
        'order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }
}
