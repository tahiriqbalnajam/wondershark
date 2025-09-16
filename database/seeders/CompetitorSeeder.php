<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Brand;
use App\Models\Competitor;

class CompetitorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all brands
        $brands = Brand::all();

        if ($brands->isEmpty()) {
            $this->command->info('No brands found. Please create brands first.');
            return;
        }

        foreach ($brands as $brand) {
            // Create sample competitors for each brand
            $competitors = [
                [
                    'name' => 'Industry Leader Inc',
                    'domain' => 'industryleader.com',
                    'rank' => 1,
                    'visibility' => 0.95,
                    'sentiment' => 0.85,
                    'mentions' => 1250,
                    'status' => 'accepted',
                    'traffic_estimate' => 500000,
                    'market_share' => 25.5,
                    'social_metrics' => [
                        'followers' => 150000,
                        'engagement_rate' => 3.2
                    ]
                ],
                [
                    'name' => 'Competitor Alpha',
                    'domain' => 'alpha-comp.com', 
                    'rank' => 2,
                    'visibility' => 0.78,
                    'sentiment' => 0.72,
                    'mentions' => 890,
                    'status' => 'accepted',
                    'traffic_estimate' => 320000,
                    'market_share' => 18.3,
                    'social_metrics' => [
                        'followers' => 89000,
                        'engagement_rate' => 2.8
                    ]
                ],
                [
                    'name' => 'Beta Solutions',
                    'domain' => 'betasolutions.io',
                    'rank' => 3,
                    'visibility' => 0.65,
                    'sentiment' => 0.68,
                    'mentions' => 650,
                    'status' => 'accepted',
                    'traffic_estimate' => 180000,
                    'market_share' => 12.7,
                    'social_metrics' => [
                        'followers' => 54000,
                        'engagement_rate' => 2.1
                    ]
                ],
                [
                    'name' => 'Gamma Technologies',
                    'domain' => 'gammatech.co',
                    'rank' => 4,
                    'visibility' => 0.52,
                    'sentiment' => 0.55,
                    'mentions' => 420,
                    'status' => 'accepted',
                    'traffic_estimate' => 95000,
                    'market_share' => 8.9,
                    'social_metrics' => [
                        'followers' => 32000,
                        'engagement_rate' => 1.9
                    ]
                ],
                [
                    'name' => 'Delta Innovations',
                    'domain' => 'delta-innovations.net',
                    'rank' => 5,
                    'visibility' => 0.41,
                    'sentiment' => 0.49,
                    'mentions' => 280,
                    'status' => 'accepted',
                    'traffic_estimate' => 65000,
                    'market_share' => 5.2,
                    'social_metrics' => [
                        'followers' => 21000,
                        'engagement_rate' => 1.5
                    ]
                ]
            ];

            foreach ($competitors as $competitorData) {
                Competitor::create([
                    'brand_id' => $brand->id,
                    'name' => $competitorData['name'],
                    'domain' => $competitorData['domain'],
                    'rank' => $competitorData['rank'],
                    'visibility' => $competitorData['visibility'],
                    'sentiment' => $competitorData['sentiment'],
                    'mentions' => $competitorData['mentions'],
                    'status' => $competitorData['status'],
                    'source' => 'seeder',
                    'traffic_estimate' => $competitorData['traffic_estimate'],
                    'market_share' => $competitorData['market_share'],
                    'social_metrics' => $competitorData['social_metrics'],
                    'stats_updated_at' => now(),
                ]);
            }

            $this->command->info("Created 5 competitors for brand: {$brand->name}");
        }
    }
}
