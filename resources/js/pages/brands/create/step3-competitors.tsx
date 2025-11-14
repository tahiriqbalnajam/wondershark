import React, { useState, useEffect, useRef, useCallback } from 'react';
import CompetitorSelector from '@/components/competitor-selector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepProps } from './types';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Competitor {
    id: number;
    name: string;
    domain: string;
    mentions: number;
    status: 'suggested' | 'accepted' | 'rejected';
    source: 'ai' | 'manual';
}

interface CompetitorResponse {
    id?: number;
    name: string;
    domain: string;
    mentions?: number;
}

import {
    WandSparkles,
    Pencil,
    Check,
    X,
    CirclePlus,
    RotateCw,
    Settings
} from 'lucide-react';

interface Step3CompetitorsProps extends StepProps {
    competitors: Competitor[];
    setCompetitors: (competitors: Competitor[]) => void;
    sessionId?: string;
}

export default function Step3Competitors({
    data,
    competitors,
    setCompetitors,
    sessionId
}: Step3CompetitorsProps) {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', domain: '' });
    
    // Track if we've already attempted to fetch automatically
    const autoFetchAttemptedRef = useRef<string | null>(null);

    // Separate competitors by status
    const suggestedCompetitors = competitors.filter(c => c.status === 'suggested');
    const acceptedCompetitors = competitors.filter(c => c.status === 'accepted');
    const rejectedCompetitors = competitors.filter(c => c.status === 'rejected');



    // AI fetch functionality
    const handleFetchFromAI = useCallback(async () => {
        if (!data.website) {
            toast.error('Please enter your website first to fetch competitors');
            return;
        }

        setLoading(true);
        setProgress(0);
        setProgressText('Analyzing your brand...');

        try {
            const fetchEndpoint = sessionId
                ? `/api/competitors/fetch-for-brand-creation?session_id=${sessionId}`
                : '/api/competitors/fetch-for-brand-creation';

            const response = await fetch(fetchEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    website: data.website,
                    name: data.name,
                    description: data.description
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();

            if (responseData.success) {
                const newCompetitors = responseData.competitors.map((comp: CompetitorResponse) => ({
                    id: comp.id || Date.now() + Math.random(),
                    name: comp.name,
                    domain: comp.domain,
                    mentions: comp.mentions || 0,
                    status: 'suggested' as const,
                    source: 'ai' as const
                }));

                setCompetitors([...competitors, ...newCompetitors]);
                toast.success('Competitors fetched successfully!');
            } else {
                throw new Error(responseData.error || 'Failed to fetch competitors');
            }
        } catch (error) {
            console.error('Error fetching competitors:', error);
            toast.error('Failed to fetch competitors. You can add them manually or skip this step.');
        } finally {
            setTimeout(() => {
                setLoading(false);
                setProgress(0);
                setProgressText('');
            }, 2000);
        }
    }, [data.website, data.name, data.description, competitors, sessionId, setCompetitors]);

    // Auto-fetch competitors when component mounts if no competitors exist and we have website data
    useEffect(() => {
        const shouldAutoFetch = (
            data.website && 
            data.website.trim() !== '' &&
            !loading && 
            competitors.length === 0 &&
            autoFetchAttemptedRef.current !== data.website
        );

        if (shouldAutoFetch) {
            autoFetchAttemptedRef.current = data.website;
            handleFetchFromAI();
        }
    }, [data.website, competitors.length, loading, handleFetchFromAI]);

    // Handle competitor actions
    const handleAccept = (competitorId: number) => {
        setCompetitors(competitors.map(c =>
            c.id === competitorId ? { ...c, status: 'accepted' as const } : c
        ));
        toast.success('Competitor accepted!');
    };

    const handleReject = (competitorId: number) => {
        setCompetitors(competitors.map(c =>
            c.id === competitorId ? { ...c, status: 'rejected' as const } : c
        ));
        toast.success('Competitor rejected!');
    };

    // Manual add functionality
    const handleManualAdd = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event from bubbling to parent form

        if (!formData.name.trim() || !formData.domain.trim()) {
            toast.error('Please enter both name and domain');
            return;
        }

        const newCompetitor: Competitor = {
            id: Date.now(),
            name: formData.name.trim(),
            domain: formData.domain.trim(),
            mentions: 0,
            status: 'accepted',
            source: 'manual'
        };

        setCompetitors([...competitors, newCompetitor]);
        setShowForm(false);
        setFormData({ name: '', domain: '' });
        toast.success('Competitor added successfully');
    };

    return (
        <div className="space-y-6 mt-15">
            <div className="flex items-center justify-between">
                <div className="block">
                    <h3 className="text-xl font-semibold">Suggested Competitors</h3>
                </div>
                <button
                    onClick={handleFetchFromAI}
                    disabled={loading || !data.website}
                    className='flex py-3 px-6 gap-3 text-sm border rounded-sm fetch-ai-btn'
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-[15px] animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <WandSparkles className='w-[15px]' />
                            Fetch with AI
                        </>
                    )}
                </button>
            </div>

            {/* Progress indicator */}
            {loading && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm font-medium">{progressText}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                AI is analyzing your brand to find relevant competitors...
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Suggested Competitors Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {/* Suggested competitors */}
                {suggestedCompetitors.map((competitor) => {
                    const cleanDomain = competitor.domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
                    const logoUrl = `https://img.logo.dev/${cleanDomain}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`;
                    
                    return (
                        <div key={competitor.id} className="block">
                            <div className="competitor-box bg-sidebar border">
                                <div className="flex items-center justify-between mb-12">
                                    <div className="flex items-center gap-[10px]">
                                        <span className='w-[20px] h-[20px] flex items-center justify-center'>
                                            <img 
                                                src={logoUrl} 
                                                alt={competitor.name}
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
                                                }}
                                            />
                                        </span>
                                        <h4>{competitor.name}</h4>
                                    </div>
                                    <button className="edit-btn">
                                        <Pencil className="w-[15px]"/>
                                    </button>
                                </div>
                                <p className='text-gray-400'>{competitor.mentions} Mentions</p>
                                <div className="competitor-btn-action">
                                    <button
                                        className='btn-action-close'
                                        onClick={() => handleReject(competitor.id)}
                                    >
                                        <X className="w-[15px]"/>
                                    </button>
                                    <button
                                        className='btn-action-check'
                                        onClick={() => handleAccept(competitor.id)}
                                    >
                                        <Check className="w-[15px]"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Rejected competitors with gray background */}
                {rejectedCompetitors.map((competitor) => {
                    const cleanDomain = competitor.domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
                    const logoUrl = `https://img.logo.dev/${cleanDomain}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`;
                    
                    return (
                        <div key={competitor.id} className="block">
                            <div className="competitor-box bg-gray-200 border opacity-50">
                                <div className="flex items-center justify-between mb-12">
                                    <div className="flex items-center gap-[10px]">
                                        <span className='w-[20px] h-[20px] flex items-center justify-center'>
                                            <img 
                                                src={logoUrl} 
                                                alt={competitor.name}
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
                                                }}
                                            />
                                        </span>
                                        <h4>{competitor.name}</h4>
                                    </div>
                                    <button className="edit-btn">
                                        <Pencil className="w-[15px]"/>
                                    </button>
                                </div>
                                <p className='text-gray-400'>{competitor.mentions} Mentions</p>
                                <div className="competitor-btn-action">
                                    <button className='btn-action-close opacity-50' disabled>
                                        <X className="w-[15px]"/>
                                    </button>
                                    <button className='btn-action-check opacity-50' disabled>
                                        <Check className="w-[15px]"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="step-wrapp-card mt-[50px]">
                <div className="block mb-5">
                    <h3 className="text-xl font-semibold">Create Competitor</h3>
                </div>

                {showForm ? (
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Brand or competitor Name"
                                required
                                className="form-control"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="domain">Domain</Label>
                            <Input
                                id="domain"
                                type="text"
                                value={formData.domain}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    // Auto-add https:// if user starts typing and hasn't added it
                                    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                                        value = 'https://' + value;
                                    }
                                    setFormData(prev => ({ ...prev, domain: value }));
                                }}
                                placeholder="https://competitor.com"
                                className="form-control"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleManualAdd(e);
                                }}
                                className='flex py-4 justify-center gap-3 text-md border rounded-sm w-[200px] font-medium fetch-ai-btn'
                            >
                                <Check className='w-[20px]' /> Save
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className='flex py-4 justify-center gap-3 text-md border rounded-sm w-[200px] font-medium'>
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setShowForm(true)} className='flex py-4 justify-center gap-3 text-md border rounded-sm w-[200px] font-medium fetch-ai-btn'>
                        <CirclePlus className='w-[20px]' /> Add Competitor
                    </button>
                )}
            </div>

            <div className="bg-sidebar flex flex-col gap-6 rounded-xl border p-10 shadow-sm mt-[50px]">
                <div className="block mb-5">
                    <h3 className="text-xl font-semibold">Selected Brands</h3>
                </div>

                {/* Your Brand */}
                <div className="flex items-center gap-[15px] border rounded-sm min-h-[60px] p-5 mb-1 bg-white flex-wrap">
                    <button><RotateCw className='w-4 text-gray-400'/></button>
                    <p className='text-black'>{data.name || 'Your Brand'}</p>
                    <Badge className='bg-green-100 text-green-600 h-[40px] w-[110px]'>
                        <span className='h-3 w-3 rounded-full bg-green-600 mr-2'></span>
                        Your Brand
                    </Badge>
                </div>

                {/* Accepted Competitors */}
                {acceptedCompetitors.map((competitor) => (
                    <div key={competitor.id} className="flex items-center gap-[15px] border rounded-sm min-h-[60px] p-5 bg-white flex-wrap">
                        <button><Settings className='w-4 text-gray-400'/></button>
                        <p className='text-black'>{competitor.name}</p>
                        <Badge variant="outline">{competitor.mentions} mentions</Badge>
                        <Badge variant={competitor.source === 'ai' ? 'default' : 'secondary'}>
                            {competitor.source.toUpperCase()}
                        </Badge>
                    </div>
                ))}

                {acceptedCompetitors.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No competitors accepted yet.</p>
                        <p className="text-sm mt-2">
                            Click the check button on suggested competitors to add them here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
