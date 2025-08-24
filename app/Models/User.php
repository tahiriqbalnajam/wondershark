<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'can_create_posts',
        'post_creation_note',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'can_create_posts' => 'boolean',
        ];
    }

    /**
     * Get agency members for this agency user.
     */
    public function agencyMembers(): HasMany
    {
        return $this->hasMany(AgencyMember::class, 'agency_id');
    }

    /**
     * Get agency memberships for this user.
     */
    public function agencyMemberships(): HasMany
    {
        return $this->hasMany(AgencyMember::class, 'user_id');
    }

    /**
     * Get brands where this user is the agency.
     */
    public function brands(): HasMany
    {
        return $this->hasMany(Brand::class, 'agency_id');
    }

    /**
     * Get brands where this user is assigned as the brand user.
     */
    public function assignedBrands(): HasMany
    {
        return $this->hasMany(Brand::class, 'user_id');
    }

    /**
     * Get posts created by this user.
     */
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }
}
