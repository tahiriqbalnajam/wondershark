<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Report - {{ $brand->name }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #e5e7eb;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #111827;
        }
        .header p {
            margin: 8px 0 0;
            color: #6b7280;
            font-size: 14px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f9fafb;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }
        .stat-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: {{ $user->agency_color ?? '#16a34a' }};
            margin: 0;
        }
        .stat-change {
            font-size: 14px;
            margin-top: 4px;
        }
        .stat-change.positive {
            color: {{ $user->agency_color ?? '#16a34a' }};
        }
        .stat-change.negative {
            color: #ef4444;
        }
        .section {
            margin: 24px 0;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
        }
        .section h2 {
            margin: 0 0 16px;
            font-size: 18px;
            color: #111827;
        }
        .competitor-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .competitor-row:last-child {
            border-bottom: none;
        }
        .competitor-name {
            font-weight: 500;
            color: #374151;
        }
        .competitor-stats {
            text-align: right;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #9ca3af;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            margin-top: 20px;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: {{ $user->agency_color ?? '#16a34a' }};
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 16px 0;
        }
        @media (max-width: 480px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Weekly Report</h1>
            <p>{{ $brand->name }} — {{ $reportData['report_period']['current_week_start'] }} to {{ $reportData['report_period']['current_week_end'] }}</p>
        </div>

        @php
            $brandEntity = collect($reportData['entities'])->firstWhere('entity_type', 'brand');
            $currentVisibility = $brandEntity['current_period']['visibility'] ?? 0;
            $previousVisibility = $brandEntity['previous_period']['visibility'] ?? 0;
            $visibilityChange = $brandEntity['changes']['visibility_change_pct'] ?? 0;
            $currentSentiment = $brandEntity['current_period']['sentiment'] ?? 0;
            $previousSentiment = $brandEntity['previous_period']['sentiment'] ?? 0;
            $sentimentChange = $brandEntity['changes']['sentiment_change_pct'] ?? 0;
        @endphp

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Current Visibility</div>
                <div class="stat-value">{{ number_format($currentVisibility, 0) }}%</div>
                @if($visibilityChange > 0)
                    <div class="stat-change positive">+{{ number_format($visibilityChange, 1) }}% vs previous period</div>
                @elseif($visibilityChange < 0)
                    <div class="stat-change negative">{{ number_format($visibilityChange, 1) }}% vs previous period</div>
                @else
                    <div class="stat-change">No change vs previous period</div>
                @endif
            </div>

            <div class="stat-card">
                <div class="stat-label">Sentiment Change</div>
                <div class="stat-value">{{ $sentimentChange > 0 ? '+' : '' }}{{ number_format($sentimentChange, 0) }}</div>
                <div class="stat-change">AI sentiment score</div>
            </div>
        </div>

        @if(count($reportData['entities']) > 1)
        <div class="section">
            <h2>Competitor Visibility Changes</h2>
            @foreach($reportData['entities'] as $entity)
                @if($entity['entity_type'] === 'competitor')
                <div class="competitor-row">
                    <div class="competitor-name">{{ $entity['entity_name'] }}</div>
                    <div class="competitor-stats">
                        <div style="font-size: 18px; font-weight: bold; color: {{ $user->agency_color ?? '#16a34a' }};">
                            {{ number_format($entity['current_period']['visibility'] ?? 0, 0) }}%
                        </div>
                        @if(($entity['changes']['visibility_change_pct'] ?? 0) > 0)
                            <div class="stat-change positive">+{{ number_format($entity['changes']['visibility_change_pct'], 1) }}%</div>
                        @elseif(($entity['changes']['visibility_change_pct'] ?? 0) < 0)
                            <div class="stat-change negative">{{ number_format($entity['changes']['visibility_change_pct'], 1) }}%</div>
                        @endif
                    </div>
                </div>
                @endif
            @endforeach
        </div>
        @endif

        <div style="text-align: center; margin: 24px 0;">
            <a href="{{ url('/brands/' . $brand->id . '/weekly-report') }}" class="btn">View Full Report</a>
        </div>

        <div class="footer">
            <p>WonderShark Weekly Report</p>
            <p>You are receiving this because you have an active brand on WonderShark.</p>
        </div>
    </div>
</body>
</html>
