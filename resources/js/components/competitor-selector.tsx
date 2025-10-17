import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, RefreshCw, Loader2 } from 'lucide-react';
import { Link } from '@inertiajs/react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";



interface Brand {
    id: number;
    name: string;
    website: string;
}

interface Competitor {
    id: number;
    name: string;
    domain: string;
    mentions?: number;
    status: string;
}

interface Props {
    selectedBrand: Brand;
    suggestedCompetitors: Competitor[];
    acceptedCompetitors: Competitor[];
    onRefreshCompetitors?: () => void;
    refreshing?: boolean;
    totalCompetitors?: number;
}

export default function CompetitorSelector({ 
    selectedBrand,
    suggestedCompetitors = [],
    acceptedCompetitors = [],
    onRefreshCompetitors,
    refreshing = false,
    totalCompetitors = 0
}: Props) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [updating, setUpdating] = useState<{id: number, action: string} | null>(null);

    const handleCompetitorAction = (competitorId: number, action: 'accepted' | 'rejected') => {
        setUpdating({id: competitorId, action});
        
        router.put(route('competitors.update', competitorId), 
            { status: action },
            {
                onSuccess: () => {
                    setUpdating(null);
                },
                onError: (errors) => {
                    console.error('Failed to update competitor:', errors);
                    setUpdating(null);
                }
            }
        );
    };

    const handleRemoveCompetitor = (competitorId: number) => {
        setUpdating({id: competitorId, action: 'remove'});
        
        router.put(route('competitors.update', competitorId), 
            { status: 'suggested' },
            {
                onSuccess: () => {
                    setUpdating(null);
                },
                onError: (errors) => {
                    console.error('Failed to remove competitor:', errors);
                    setUpdating(null);
                }
            }
        );
    };
    
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        domain: '',
        brand_id: selectedBrand?.id.toString() || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedBrand) return;
        
        post(route('competitors.store', selectedBrand.id), {
            onSuccess: () => {
                reset();
                setIsDrawerOpen(false);
            },
        });
    };
    return (  
            <Drawer direction="right" open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <div className="mx-auto py-6 space-y-6">
                    {/* Suggested Competitors Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">
                                    Suggested Competitors 
                                    <span className='text-gray-400 font-normal text-sm'>
                                        {suggestedCompetitors.length > 0 ? `- ${suggestedCompetitors.length}` : ''}
                                    </span>
                                </h2>
                                
                                {totalCompetitors > 0 && onRefreshCompetitors && (
                                    <Button 
                                        className='refresh-ai-analysis-btn'
                                        variant="outline" 
                                        onClick={onRefreshCompetitors} 
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
                        </CardHeader>
                        <CardContent>
                            {suggestedCompetitors.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {suggestedCompetitors.map((competitor) => (
                                        <Card key={competitor.id} className="hover:shadow-md transition-shadow pb-0 justify-between">
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2 competitor-title">
                                                    <span><Building2 className="h-4 w-4" /></span>
                                                    {competitor.name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className='p-0'>
                                                <p className="text-sm text-gray-600 mx-6 my-3">{competitor.domain}</p>
                                                <div className="buttons-wrapp flex items-center justify-between">
                                                    <p className="text-sm text-gray-600">{competitor.mentions || 0} Mentions</p>
                                                    <div className="flex items-center justify-end gap-3">
                                                        <Button 
                                                        className='df-btn'
                                                            size="sm" 
                                                            variant="default"
                                                            onClick={() => handleCompetitorAction(competitor.id, 'accepted')}
                                                            disabled={updating?.id === competitor.id && updating?.action === 'accepted'}
                                                        >
                                                            {updating?.id === competitor.id && updating?.action === 'accepted' ? 'Accepting...' : 'Accept'}
                                                        </Button>
                                                        <Button 
                                                        className='cancel-btn'
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => handleCompetitorAction(competitor.id, 'rejected')}
                                                            disabled={updating?.id === competitor.id && updating?.action === 'rejected'}
                                                        >
                                                            {updating?.id === competitor.id && updating?.action === 'rejected' ? 'Rejecting...' : 'Reject'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 mb-4">No suggested competitors found.</p>
                                    {selectedBrand && (
                                        <Button 
                                            asChild
                                            onClick={() => {
                                                // Trigger AI competitor fetch
                                                window.location.href = route('competitors.fetch-sync', selectedBrand.id);
                                            }}
                                        >
                                            <Link 
                                                href={route('competitors.fetch-sync', selectedBrand.id)}
                                                method="post"
                                                as="button"
                                                className="fetch-ai-competitors"
                                            >
                                                Fetch AI Competitors
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Accepted Competitors Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">
                                    Your Competitors
                                    <span className='text-gray-400 font-normal text-sm'>
                                        {acceptedCompetitors.length > 0 ? `- ${acceptedCompetitors.length}` : ''}+
                                    </span>
                                </h2>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {acceptedCompetitors.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {acceptedCompetitors.map((competitor) => (
                                        <Card key={competitor.id} className="hover:shadow-md transition-shadow pb-0 justify-between">
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2 competitor-title">
                                                    <span><Building2 className="h-4 w-4" /></span>
                                                    {competitor.name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className='p-0'>
                                                <p className="text-sm text-gray-600 mx-6 my-3">{competitor.domain}</p>
                                                <div className="buttons-wrapp flex items-center justify-between">
                                                    <p className="text-sm text-gray-600">{competitor.mentions || 0} Mentions</p>
                                                    <div className="flex items-center justify-end gap-3">
                                                        <Button 
                                                            className="cancel-btn"
                                                            size="sm" 
                                                            variant="destructive"
                                                            onClick={() => handleRemoveCompetitor(competitor.id)}
                                                            disabled={updating?.id === competitor.id && updating?.action === 'remove'}
                                                        >
                                                            {updating?.id === competitor.id && updating?.action === 'remove' ? 'Removing...' : 'Remove'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 mb-4">No competitors added yet.</p>
                                    <p className="text-sm text-muted-foreground">Add competitors using the button above.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
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
                            <DrawerFooter className='competitors-popup-btns p-0 mt-10'>
                                <DrawerClose asChild>
                                    <Button variant="outline" type="button" className='cancel-btn'>Cancel</Button>
                                </DrawerClose>
                                <Button 
                                    type='button' 
                                    onClick={handleSubmit}
                                    disabled={processing || !selectedBrand}
                                >
                                    {processing ? 'Adding...' : 'Add Competitor'}
                                </Button>
                            </DrawerFooter>
                        </div>
                    </DrawerContent>
                </div>
            </Drawer>
    );
}