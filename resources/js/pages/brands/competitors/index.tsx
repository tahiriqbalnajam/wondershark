import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CompetitorSelector from '@/components/competitor-selector';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Competitor {
    id: number;
    name: string;
    domain: string;
    mentions: number;
    status: 'suggested' | 'accepted' | 'rejected';
    source: 'ai' | 'manual';
}

interface Brand {
    id: number;
    name: string;
    website: string;
}

interface Props {
    brand: Brand;
    suggestedCompetitors: Competitor[];
    acceptedCompetitors: Competitor[];
    shouldAutoFetch: boolean;
    totalCompetitors: number;
}

const CompetitorsPage = ({ brand, suggestedCompetitors, acceptedCompetitors, totalCompetitors }: Props) => {
    const [competitors, setCompetitors] = useState<Competitor[]>([
        ...suggestedCompetitors,
        ...acceptedCompetitors
    ]);
    const [refreshing, setRefreshing] = useState(false);

    // Update competitors when props change
    useEffect(() => {
        setCompetitors([...suggestedCompetitors, ...acceptedCompetitors]);
    }, [suggestedCompetitors, acceptedCompetitors]);

    const handleRefreshCompetitors = async () => {
        setRefreshing(true);
        try {
            // First clear existing competitors
            const refreshResponse = await fetch(`/brands/${brand.id}/competitors/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            
            if (refreshResponse.ok) {
                // Reset competitors state
                setCompetitors([]);
                toast.success('Competitors refreshed! Use "Fetch with AI" to get new suggestions.');
            } else {
                toast.error('Failed to refresh competitors');
            }
        } catch (error) {
            console.error('Error refreshing competitors:', error);
            toast.error('Error refreshing competitors');
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Brands', href: '/brands' },
                { title: brand.name, href: `/brands/${brand.id}` },
                { title: 'Competitors', href: '' }
            ]}
        >
            <Head title={`Competitors for ${brand.name}`} />

            <div className="mx-auto py-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Competitor Analysis</h2>
                        {totalCompetitors > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {competitors.filter(c => c.status === 'accepted').length} accepted • {competitors.filter(c => c.status === 'suggested').length} pending review
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {totalCompetitors > 0 && (
                            <Button 
                                className='refresh-ai-analysis-btn'
                                variant="outline" 
                                onClick={handleRefreshCompetitors} 
                                disabled={refreshing}
                            >
                                {refreshing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Refreshing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Refresh AI Analysis
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                <CompetitorSelector
                    selectedBrand={brand}
                    suggestedCompetitors={suggestedCompetitors}
                    acceptedCompetitors={acceptedCompetitors}
                />
            </div>
        </AppLayout>
    );
};

export default CompetitorsPage;
