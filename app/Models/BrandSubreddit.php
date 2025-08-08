<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandSubreddit extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
        'subreddit_name',
        'description',
        'status',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }
}
