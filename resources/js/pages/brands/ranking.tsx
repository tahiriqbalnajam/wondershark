import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import HeadingSmall from '@/components/heading-small';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandVisibilityIndex } from '@/components/dashboard-table/brand-visibility';
import { Trophy } from 'lucide-react';

interface Brand {
    id: number;
    name: string;
    website?: string;
    domain?: string;
}

interface CompetitiveStat {
    id: number;
    entity_type: 'brand' | 'competitor';
    entity_name: string;
    entity_url: string;
    visibility: number;
    sentiment: number;
    position: number;
    analyzed_at: string;
    trends: {
        visibility_trend: 'up' | 'down' | 'stable' | 'new';
        sentiment_trend: 'up' | 'down' | 'stable' | 'new';
        position_trend: 'up' | 'down' | 'stable' | 'new';
        visibility_change: number;
        sentiment_change: number;
        position_change: number;
    };
    visibility_percentage: string;
    position_formatted: string;
    sentiment_level: string;
}

interface RankingProps {
    brand: Brand;
    competitiveStats: CompetitiveStat[];
}

export default function Ranking({ brand, competitiveStats }: RankingProps) {
    return (
        <AppLayout title={'Ranking'}>
            <Head title={`${brand.name} - Ranking`} />
            
            <div className="container mx-auto p-6">
                <HeadingSmall>
                    {brand.name} - Brand Ranking
                </HeadingSmall>

                <Card className="mt-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2">
                            <span className='w-[45px] h-[45px] bg-gray-200 flex items-center justify-center rounded'>
                                <Trophy/>
                            </span>
                            Brand Visibility Index - All Competitors
                        </CardTitle>
                    </CardHeader>
                    <BrandVisibilityIndex 
                        competitiveStats={competitiveStats}
                    />
                </Card>
            </div>
        </AppLayout>
    );
}
