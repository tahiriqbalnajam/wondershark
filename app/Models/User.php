<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo as EloquentBelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, HasRoles, Notifiable;

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
        'url',
        'logo',
        'logo_thumbnail',
        'agency_color',
        'docs_view_mode',
        'docs_sort_by',
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
     * Get the agency this user belongs to (for agency members).
     */
    public function agency(): EloquentBelongsTo
    {
        return $this->belongsTo(User::class, 'id', 'agency_id')
            ->join('agency_members', 'users.id', '=', 'agency_members.agency_id')
            ->where('agency_members.user_id', $this->id);
    }

    /**
     * Get agency member record if this user is an agency member.
     */
    public function agencyMembership()
    {
        return $this->hasOne(AgencyMember::class, 'user_id');
    }

    /**
     * Check if user can access a brand (either as agency owner or agency member).
     */
    public function canAccessBrand(Brand $brand): bool
    {
        // Admin can access all brands
        if ($this->hasRole('admin')) {
            return true;
        }

        // Brand user can access their assigned brand
        if ($brand->user_id === $this->id) {
            return true;
        }

        // Agency owner can access their own brands
        if ($brand->agency_id === $this->id) {
            return true;
        }

        // Agency member can access their agency's brands
        $membership = $this->agencyMembership;
        if ($membership && $membership->agency_id === $brand->agency_id) {
            return true;
        }

        return false;
    }

    /**
     * Get all brands accessible to this user (owned or through agency membership).
     */
    public function getAccessibleBrands()
    {
        // If user is agency owner, return their brands
        if ($this->hasRole('agency')) {
            return Brand::where('agency_id', $this->id)->get();
        }

        // If user is agency member, return their agency's brands
        $membership = $this->agencyMembership;
        if ($membership) {
            return Brand::where('agency_id', $membership->agency_id)->get();
        }

        return collect([]);
    }

    /**
     * Check if user has specific agency member right.
     */
    public function hasAgencyRight(string $right): bool
    {
        $membership = $this->agencyMembership;
        if (!$membership) {
            return false;
        }

        return in_array($right, $membership->rights ?? []);
    }

    /**
     * Check if user can manage competitors (agency managers and above).
     */
    public function canManageCompetitors(): bool
    {
        // Admin and agency owners can always manage competitors
        if ($this->hasRole(['admin', 'agency'])) {
            return true;
        }

        // Agency managers can manage competitors
        return $this->hasAgencyRight('agency_manager') || $this->hasAgencyRight('agency_admin');
    }

    /**
     * Check if user can manage prompts (agency managers and above).
     */
    public function canManagePrompts(): bool
    {
        // Admin and agency owners can always manage prompts
        if ($this->hasRole(['admin', 'agency'])) {
            return true;
        }

        // Agency managers can manage prompts
        return $this->hasAgencyRight('agency_manager') || $this->hasAgencyRight('agency_admin');
    }

    /**
     * Check if user can view all brands (agency managers and above).
     */
    public function canViewAllBrands(): bool
    {
        // Admin and agency owners can always view all brands
        if ($this->hasRole(['admin', 'agency'])) {
            return true;
        }

        // Agency managers and brand users can view all brands
        return $this->hasAgencyRight('agency_manager') || $this->hasAgencyRight('agency_admin') || $this->hasAgencyRight('brand_user');
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
