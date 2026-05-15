import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CompetitorSelector from '@/components/competitor-selector';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Info, Loader2, CircleAlert } from 'lucide-react';
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
    trackedName: string;
    allies: [];
    domain: string;
    mentions: number;
    status: 'suggested' | 'accepted' | 'rejected';
    source: 'ai' | 'manual';
}

interface Brand {
    id: number;
    name: string;
    trackedName: string;
    allies: [];
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
    const { errors: pageErrors, flash } = usePage().props as any;
    const [competitors, setCompetitors] = useState<Competitor[]>([
        ...suggestedCompetitors,
        ...acceptedCompetitors
    ]);
    const [refreshing, setRefreshing] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);

    useEffect(() => {
        if (pageErrors?.error) {
            setErrorMessage(Array.isArray(pageErrors.error) ? pageErrors.error[0] : pageErrors.error);
            const timeout = setTimeout(() => setErrorMessage(null), 5000);
            return () => clearTimeout(timeout);
        }

        if (flash?.analysis_triggered) {
            setAnalysisMessage('The system is re-analyzing competitive stats and recalculating visibility. This may take a few minutes to complete.');
            const timeout = setTimeout(() => setAnalysisMessage(null), 60000);
            return () => clearTimeout(timeout);
        }
    }, [pageErrors, flash]);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        trackedName: '',
        allies: [''],
        domain: '',
    });
    // Add new empty ally field
    const addAllyField = () => {
    setData('allies', [...data.allies, '']);
    };

    // Remove ally by index
    const removeAllyField = (index: number) => {
    const updated = data.allies.filter((_, i) => i !== index);
    setData('allies', updated.length ? updated : ['']);
    };
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
                // { title: 'Brands', href: '/brands' },
                // { title: brand.name, href: `/brands/${brand.id}` },
                // { title: 'Competitors', href: '' }
            ]} title="Competitors"
        >
            <Head title={`Competitors for ${brand.name}`} />

            {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                    <CircleAlert className="h-5 w-5 text-red-600" />
                    <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                </div>
            )}

            {analysisMessage && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="relative">
                        <Info className="h-5 w-5 text-blue-600" />
                        <div className="absolute top-0 right-0 -mr-1 -mt-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-blue-800">Analysis in Progress</h4>
                        <p className="text-sm text-blue-700">
                            The system is re-analyzing competitive stats and recalculating visibility. This may take a few minutes to complete.
                        </p>
                    </div>
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin ml-auto" />
                </div>
            )}

            {/* <div className="mx-auto py-6 space-y-6"> */}
                {/* <div className="flex justify-between items-center"> */}
                    {/* <div>
                        <h2 className="text-2xl font-bold">Competitor Analysis</h2>
                        {totalCompetitors > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {competitors.filter(c => c.status === 'accepted').length} accepted • {competitors.filter(c => c.status === 'suggested').length} pending review
                            </p>
                        )}
                    </div> */}
                    <div className="flex gap-2 mb-6 justify-end" style={{ paddingRight: '57px' }}>
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
                                                <Label htmlFor="trackedName">Tracked Name *</Label>
                                                <Input 
                                                    id="trackedName" 
                                                    className='form-control' 
                                                    type="text" 
                                                    placeholder="Tracked Name" 
                                                    value={data.trackedName}
                                                    onChange={(e) => setData('trackedName', e.target.value)}
                                                    required
                                                />
                                                {errors.trackedName && <p className="text-sm text-red-600">{errors.trackedName}</p>}
                                            </div>
                                            {/* ✅ Allies Dynamic Fields */}
                                            <div className="allies-section space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>Alias *</Label>
                                                <Button type="button" variant="outline" size="sm" onClick={addAllyField}>
                                                + Add Alias
                                                </Button>
                                            </div>

                                            {data.allies.map((ally, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                <Input
                                                    type="text"
                                                    placeholder="Ally name"
                                                    value={ally}
                                                    onChange={(e) => {
                                                    const updated = [...data.allies];
                                                    updated[index] = e.target.value;
                                                    setData('allies', updated);
                                                    }}
                                                    className="form-control"
                                                    required
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => removeAllyField(index)}
                                                >
                                                    ✕
                                                </Button>
                                                </div>
                                            ))}

                                            {errors.allies && <p className="text-sm text-red-600">{errors.allies}</p>}
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

                <CompetitorSelector
                    selectedBrand={brand}
                    suggestedCompetitors={suggestedCompetitors}
                    acceptedCompetitors={acceptedCompetitors}
                    onRefreshCompetitors={handleRefreshCompetitors}
                    refreshing={refreshing}
                    totalCompetitors={totalCompetitors}
                />
            {/* </div> */}
        </AppLayout>
    );
};

export default CompetitorsPage;
