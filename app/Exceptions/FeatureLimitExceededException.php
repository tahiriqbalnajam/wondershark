<?php

namespace App\Exceptions;

use Exception;

class FeatureLimitExceededException extends Exception
{
    public function __construct(
        public readonly string $featureKey,
        public readonly int|null $limit,
        public readonly int $used,
        string $message = ''
    ) {
        parent::__construct(
            $message ?: "Limit reached for [{$featureKey}]: used {$used} of " . ($limit ?? '∞') . '.'
        );
    }

    /**
     * Render as JSON for API / Inertia requests.
     */
    public function render($request)
    {
        $message = match ($this->featureKey) {
            'competitor_analysis'   => 'You have reached the competitor limit for your plan.',
            'brands_covered'        => 'You have reached the brand limit for your plan.',
            'posts_tracking'        => 'You have reached the posts limit for your plan.',
            'ai_citations_tracking' => 'AI citations tracking is not available on your current plan.',
            'team_seats'            => 'You have reached the team seat limit for your plan.',
            default                 => 'You have reached the limit for this feature on your current plan.',
        };

        if ($request->expectsJson() || $request->inertia()) {
            return response()->json([
                'error'       => 'feature_limit_exceeded',
                'feature'     => $this->featureKey,
                'message'     => $message,
                'limit'       => $this->limit,
                'used'        => $this->used,
            ], 403);
        }

        return redirect()->back()->withErrors(['feature' => $message]);
    }
}
