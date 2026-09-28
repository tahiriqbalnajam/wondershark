<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientForecast extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
        'competitor_id',
        'analysis_session_id',
        'region',
        'procedure',
        'visibility',
        'market_share',
        'ai_usage_rate',
        'status',
        'booked_consultations_estimated',
        'new_patients_lower',
        'new_patients_upper',
        'assumptions',
        'error_message',
    ];

    protected $casts = [
        'visibility' => 'decimal:2',
        'market_share' => 'decimal:2',
        'ai_usage_rate' => 'integer',
        'booked_consultations_estimated' => 'integer',
        'new_patients_lower' => 'integer',
        'new_patients_upper' => 'integer',
        'assumptions' => 'array',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function competitor(): BelongsTo
    {
        return $this->belongsTo(Competitor::class);
    }

    public function isBrandRow(): bool
    {
        return $this->competitor_id === null;
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }
}