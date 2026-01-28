<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AgencyInvitation extends Model
{
    use HasFactory;

    protected $fillable = [
        'agency_id',
        'name',
        'email',
        'token',
        'role',
        'rights',
        'expires_at',
        'accepted_at',
        'user_id',
    ];

    protected $casts = [
        'rights' => 'array',
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
    ];

    /**
     * Get the agency that sent the invitation
     */
    public function agency()
    {
        return $this->belongsTo(User::class, 'agency_id');
    }

    /**
     * Get the user who accepted the invitation
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the invitation is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if the invitation has been accepted
     */
    public function isAccepted(): bool
    {
        return $this->accepted_at !== null;
    }

    /**
     * Check if the invitation is still valid
     */
    public function isValid(): bool
    {
        return ! $this->isExpired() && ! $this->isAccepted();
    }

    /**
     * Generate a unique token
     */
    public static function generateToken(): string
    {
        return Str::random(64);
    }

    /**
     * Mark invitation as accepted
     */
    public function markAsAccepted(User $user): void
    {
        $this->update([
            'accepted_at' => now(),
            'user_id' => $user->id,
        ]);
    }
}
