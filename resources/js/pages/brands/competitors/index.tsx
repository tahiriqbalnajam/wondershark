import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CompetitorSelector from '@/components/competitor-selector';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';

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
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        domain: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        post(route('competitors.store', brand.id), {
            onSuccess: () => {
                reset();
                setIsDrawerOpen(false);
            },
        });
    };

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
                        <Drawer direction="right" open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                            <DrawerTrigger asChild>
                                <Button variant="outline" className='add-competitor-btn'>Add Competitor</Button>
                            </DrawerTrigger>
                            <DrawerContent className="w-[25%] right-0 left-auto top-0 bottom-0 m-0 rounded-bl-md items-center Create-Competitor">
                                <div className="mx-auto w-full max-w-sm">
                                    <DrawerHeader className='p-0 mb-5'>
                                        <DrawerTitle className="text-xl font-semibold mb-6 mt-10">Add New Competitor</DrawerTitle>
                                    </DrawerHeader>
                                    <div className="flex items-center w-full">
                                        <form onSubmit={handleSubmit} className="w-full space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="name">Competitor Name *</Label>
                                                <Input 
                                                    id="name" 
                                                    className='form-control' 
                                                    type="text" 
                                                    placeholder="e.g., Example Company" 
                                                    value={data.name}
                                                    onChange={(e) => setData('name', e.target.value)}
                                                    required
                                                />
                                                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label htmlFor="domain">Website URL *</Label>
                                                <Input 
                                                    id="domain" 
                                                    className='form-control' 
                                                    type="url" 
                                                    placeholder="https://example.com" 
                                                    value={data.domain}
                                                    onChange={(e) => {
                                                        const value = e.target.value.trim();
                                                        setData('domain', value);
                                                    }}
                                                    onBlur={(e) => {
                                                        let value = e.target.value.trim();
                                                        // Auto-add https:// if not present and value is not empty
                                                        if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                                                            value = 'https://' + value;
                                                            setData('domain', value);
                                                        }
                                                    }}
                                                    required
                                                />
                                                {errors.domain && <p className="text-sm text-red-600">{errors.domain}</p>}
                                            </div>
                                        </form>
                                    </div>
                                    <DrawerFooter className='flex px-0 buttons-wrapp flex-row'>
                                        <DrawerClose asChild className='w-50 inline-block'>
                                            <Button variant="outline" type="button" className='cancel-btn min-h-12'>Cancel</Button>
                                        </DrawerClose>
                                        <Button type='button' className='df-btn w-50 min-h-12 inline-block' onClick={handleSubmit} disabled={processing} > {processing ? 'Adding...' : 'Add Competitor'} </Button>
                                    </DrawerFooter>
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>
                </div>

                <CompetitorSelector
                    selectedBrand={brand}
                    suggestedCompetitors={suggestedCompetitors}
                    acceptedCompetitors={acceptedCompetitors}
                    onRefreshCompetitors={handleRefreshCompetitors}
                    refreshing={refreshing}
                    totalCompetitors={totalCompetitors}
                />
            </div>
        </AppLayout>
    );
};

export default CompetitorsPage;
