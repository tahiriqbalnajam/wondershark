<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    use HasFactory;

    protected $fillable = [
        'agency_id',
        'user_id',
        'name',
        'website',
        'description',
        'country',
        'region',
        'procedure',
        'monthly_posts',
        'status',
        'is_completed',
        'current_step',
        'session_id',
        'completed_at',
        'can_create_posts',
        'post_creation_note',
        'logo',
        'logo_thumbnail',
        'trackedName',
        'allies',
        'campaign_indicator',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'allies' => 'array',
        'can_create_posts' => 'boolean',
    ];

    protected $appends = [
        'region_string',
    ];

    protected $attributes = [
        'can_create_posts' => false,
    ];

    /**
     * Read region as an array of {state, cities: [...]} rows. Handles three
     * storage shapes in the existing varchar column:
     *   1. null/empty -> []
     *   2. JSON array (new writes) -> decoded, with each row normalized to
     *      {state, cities: [...]} (legacy {state, city} rows are upgraded).
     *   3. Legacy "State, City" string -> [[state, cities: [city]]]
     * No schema migration required.
     */
    public function getRegionAttribute($value): array
    {
        if (empty($value)) {
            return [];
        }
        if (is_array($value)) {
            return array_map([$this, 'normalizeRegionRow'], $value);
        }
        $decoded = json_decode($value, true);
        if (is_array($decoded)) {
            return array_map([$this, 'normalizeRegionRow'], $decoded);
        }
        // Legacy "State, City" string
        $parts = explode(', ', (string) $value);
        return [[
            'state'  => trim($parts[0] ?? ''),
            'cities' => isset($parts[1]) && trim($parts[1]) !== '' ? [trim($parts[1])] : [],
        ]];
    }

    /**
     * Normalize a single region row to the {state, cities: [...]} shape.
     * Handles legacy {state, city: "..."} rows by upgrading city to cities: [city].
     */
    protected function normalizeRegionRow($row): array
    {
        if (!is_array($row)) {
            return ['state' => (string) $row, 'cities' => []];
        }
        $state = trim((string) ($row['state'] ?? ''));
        if (isset($row['cities']) && is_array($row['cities'])) {
            $cities = array_values(array_filter(array_map('strval', $row['cities']), fn ($c) => trim($c) !== ''));
        } elseif (isset($row['city']) && is_string($row['city']) && trim($row['city']) !== '') {
            $cities = [trim($row['city'])];
        } else {
            $cities = [];
        }
        return ['state' => $state, 'cities' => $cities];
    }

    /**
     * Store region as a JSON-encoded string in the varchar column.
     */
    public function setRegionAttribute($value): void
    {
        if (is_array($value)) {
            $this->attributes['region'] = json_encode(array_values($value));
        } elseif (is_string($value)) {
            $this->attributes['region'] = $value;
        } else {
            $this->attributes['region'] = null;
        }
    }

    /**
     * Joined, printable form of the region array.
     * Per row: "{state}, {city1}, {city2}, ..." (cities appended with ", ").
     * Rows joined with " | ". Empty string when region is empty.
     * Example: "New York, NYC, Buffalo | Texas, Tetly"
     * Consumers that interpolate region into prompts, CSV exports, or table
     * cells should use this.
     */
    public function getRegionStringAttribute(): string
    {
        $region = $this->region;
        if (empty($region)) {
            return '';
        }

        return implode(' | ', array_map(function ($r) {
            if (!is_array($r)) {
                return (string) $r;
            }
            $state = $r['state'] ?? '';
            $cities = $r['cities'] ?? [];
            if (!is_array($cities)) {
                $cities = $cities === '' ? [] : [$cities];
            }
            $cities = array_filter($cities, fn ($c) => trim((string) $c) !== '');
            return trim($state . (count($cities) ? ', ' . implode(', ', $cities) : ''));
        }, $region));
    }

    /**
     * Get the current month's posts count for this brand.
     */
    public function getCurrentMonthPostsCount(): int
    {
        return $this->posts()
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agency_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function prompts(): HasMany
    {
        return $this->hasMany(BrandPrompt::class);
    }

    public function subreddits(): HasMany
    {
        return $this->hasMany(BrandSubreddit::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    public function competitors(): HasMany
    {
        return $this->hasMany(Competitor::class);
    }

    public function competitiveStats(): HasMany
    {
        return $this->hasMany(BrandCompetitiveStat::class);
    }

    public function latestCompetitiveStats(): HasMany
    {
        return $this->competitiveStats()
            ->whereIn('id', function ($query) {
                $query->selectRaw('MAX(id)')
                    ->from('brand_competitive_stats')
                    ->where('brand_id', $this->id)
                    ->groupBy(['entity_type', 'competitor_id']);
            });
    }
}
