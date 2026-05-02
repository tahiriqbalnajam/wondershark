<?php

namespace App\Helpers;

use Carbon\Carbon;

class DateFormat
{
    /** Default format for date+time display */
    public const string DATETIME = 'M j, Y g:i A';

    /** Default format for date-only display */
    public const string DATE = 'M j, Y';

    /** Default format for ISO conversion */
    public const string ISO = 'Y-m-d\TH:i:s.000000\Z';

    /**
     * Format a Carbon date for display (server-side rendering like emails).
     * Prefer passing raw Carbon/ISO strings to the frontend instead.
     */
    public static function forDisplay(mixed $date, string $format = self::DATETIME): string
    {
        if (! $date) {
            return '—';
        }

        if (is_string($date)) {
            $date = Carbon::parse($date);
        }

        return $date->format($format);
    }

    /**
     * Convert any date to a consistent ISO 8601 string for JSON transport.
     * Pass this to the frontend so JavaScript's new Date() parses it correctly.
     */
    public static function toIso(mixed $date): ?string
    {
        if (! $date) {
            return null;
        }

        if (is_string($date)) {
            $date = Carbon::parse($date);
        }

        return $date->toISOString();
    }

    /**
     * Convert a DB timestamp string to an ISO 8601 string.
     * Use for raw DB values (jobs table, failed_jobs table) that aren't Eloquent models.
     */
    public static function dbToIso(?string $dbTimestamp): ?string
    {
        if (! $dbTimestamp) {
            return null;
        }

        return Carbon::parse($dbTimestamp)->toISOString();
    }
}
