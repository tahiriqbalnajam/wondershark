<?php

namespace App\Enums;

class Feature
{
    // Feature keys
    const AI_CITATIONS        = 'ai_citations_tracking';
    const COMPETITOR_ANALYSIS = 'competitor_analysis';
    const POSTS_TRACKING      = 'posts_tracking';
    const BRANDS_COVERED      = 'brands_covered';
    const TEAM_SEATS          = 'team_seats';

    // Plan names (must match subscriptions.plan_name in DB)
    const PLAN_TRIAL     = 'trial';
    const PLAN_GROWTH    = 'agency_growth';
    const PLAN_UNLIMITED = 'agency_unlimited';
    const PLAN_FREE      = 'free';

    const PERIOD_LIFETIME = 'lifetime';

    public static function monthlyPeriod(): string
    {
        return now()->format('Y-m');
    }

    public static function allKeys(): array
    {
        return [
            self::AI_CITATIONS,
            self::COMPETITOR_ANALYSIS,
            self::POSTS_TRACKING,
            self::BRANDS_COVERED,
            self::TEAM_SEATS,
        ];
    }
}
