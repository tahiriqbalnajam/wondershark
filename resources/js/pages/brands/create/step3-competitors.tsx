import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepProps } from './types';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Competitor {
    id: number;
    name: string;
    domain: string;
    trackedName: string;
    allies: string[];
    mentions: number;
    status: 'suggested' | 'accepted' | 'rejected';
    source: 'ai' | 'manual';
}

interface CompetitorResponse {
    id?: number;
    name: string;
    domain: string;
    trackedName: string;
    allies: string[];
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
    brandId?: number;
}

export default function Step3Competitors({
    data,
    competitors,
    setCompetitors,
    sessionId,
    brandId
}: Step3CompetitorsProps) {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', domain: '', trackedName: '', allies: [] as string[] });

    // Track if we've already attempted to fetch automatically
    const autoFetchAttemptedRef = useRef<string | null>(null);
    // Add new empty ally field
    const addAllyField = () => setFormData(prev => ({ ...prev, allies: [...prev.allies, ''] }));
    const removeAllyField = (index: number) => setFormData(prev => ({
        ...prev,
        allies: prev.allies.filter((_, i) => i !== index)
    }));
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

            // Get fresh CSRF token from the page
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;

            if (!csrfToken) {
                throw new Error('CSRF token not found. Please refresh the page.');
            }

            const response = await fetch(fetchEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    website: data.website,
                    name: data.name,
                    description: data.description,
                    brand_id: brandId, // Pass brand_id to check database competitors
                    existing_competitors: competitors.map(c => ({
                        name: c.name,
                        domain: c.domain
                    }))
                }),
                credentials: 'same-origin', // Important for CSRF
            });

            if (!response.ok) {
                if (response.status === 419) {
                    // CSRF token mismatch - reload page to get fresh token
                    toast.error('Session expired. Reloading page...');
                    setTimeout(() => window.location.reload(), 1000);
                    return;
                }
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

                // Save to database immediately if we have a brand ID
                if (brandId) {
                    try {
                        const saveResponse = await fetch(route('competitors.save-bulk'), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': csrfToken,
                            },
                            body: JSON.stringify({
                                brand_id: brandId,
                                competitors: newCompetitors.map((c: Competitor) => ({
                                    name: c.name,
                                    domain: c.domain.startsWith('http') ? c.domain : `https://${c.domain}`,
                                    status: 'suggested'
                                }))
                            }),
                        });

                        if (!saveResponse.ok) {
                            console.error('Failed to save competitors to database');
                            toast.error('Failed to save competitors to database');
                        } else {
                            const savedData = await saveResponse.json();
                            console.log('Saved competitors data:', savedData); // Debug log

                            // Update competitors with actual database IDs
                            if (savedData.competitors && savedData.competitors.length > 0) {
                                // Replace the new competitors that were just added with their database versions
                                const allCompetitors = [...competitors];

                                // Remove the temporary competitors we just added
                                const competitorsWithoutNew = allCompetitors.filter(c =>
                                    !newCompetitors.some((nc: Competitor) => nc.name === c.name && nc.domain === c.domain)
                                );

                                // Add the saved competitors with real database IDs
                                const competitorsWithDbIds = savedData.competitors.map((comp: CompetitorResponse) => ({
                                    id: comp.id!,
                                    name: comp.name,
                                    domain: comp.domain,
                                    trackedName: comp.trackedName || '',
                                    allies: comp.allies || [],
                                    mentions: comp.mentions || 0,
                                    status: 'suggested' as const,
                                    source: 'ai' as const
                                }));

                                setCompetitors([...competitorsWithoutNew, ...competitorsWithDbIds]);
                                console.log('Updated competitors with DB IDs:', [...competitorsWithoutNew, ...competitorsWithDbIds]); // Debug log
                                toast.success(`Saved ${savedData.competitors.length} competitors to database`);
                            } else {
                                console.error('No competitors returned from save operation');
                                toast.error('No competitors were saved - they may already exist');
                            }
                        }
                    } catch (saveError) {
                        console.error('Error saving competitors to database:', saveError);
                    }
                }

                toast.success('Competitors fetched successfully!');
            } else {
                throw new Error(responseData.error || 'Failed to fetch competitors');
            }
        } catch (error) {
            console.error('Error fetching competitors:', error);
            toast.error('Failed to fetch competitors. You can add them manually or skip this step.');
        } finally {
            setLoading(false);
            setProgress(0);
            setProgressText('');
        }
    }, [data.website, data.name, data.description, competitors, sessionId, setCompetitors, brandId]);

    // Load competitors from database when component mounts
    useEffect(() => {
        // If we have brand ID but no competitors loaded yet, they will come from server via Inertia props
        // If we have competitors from DB (they'll have proper IDs), don't auto-fetch
        const hasExistingCompetitors = competitors.length > 0;

        const shouldAutoFetch = (
            brandId && // Must have brand ID
            data.website &&
            data.website.trim() !== '' &&
            !loading &&
            !hasExistingCompetitors &&
            autoFetchAttemptedRef.current !== data.website
        );

        if (shouldAutoFetch) {
            autoFetchAttemptedRef.current = data.website;
            handleFetchFromAI();
        }
    }, [brandId, data.website, competitors, loading, handleFetchFromAI]);

    // Handle competitor actions - UPDATE STATUS IN DATABASE
    const handleAccept = async (competitorId: number) => {
        console.log('Attempting to accept competitor ID:', competitorId); // Debug log
        console.log('Current competitors state:', competitors); // Debug log
        console.log('Brand ID:', brandId); // Debug log

        // Find the competitor in our local state
        const competitor = competitors.find(c => c.id === competitorId);
        console.log('Found competitor in state:', competitor); // Debug log

        // If brand doesn't exist yet (during creation), just update local state
        if (!brandId) {
            setCompetitors(competitors.map(c =>
                c.id === competitorId ? { ...c, status: "accepted" } : c
            ));
            toast.success("Competitor accepted!");
            return;
        }

        try {
            console.log('Making API call to:', `/brands/${brandId}/competitors/${competitorId}/status`); // Debug log

            const response = await fetch(`/brands/${brandId}/competitors/${competitorId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ status: 'accepted' }),
            });

            const data = await response.json();
            console.log('API response:', data); // Debug log

            // If backend sends success but message indicates limit
            if (data.message === "Maximum 10 accepted competitors allowed") {
                toast.error(data.message);
                return;
            }
            // If backend sends success normally
            if (response.ok && data.success) {
                // update UI
                setCompetitors(competitors.map(c =>
                    c.id === competitorId ? { ...c, status: "accepted" } : c
                ));
                toast.success("Competitor accepted!");
                return;
            }
            // Any other errors
            toast.error(data.message || "Failed to accept competitor");

        } catch (error) {
            console.error('Error updating competitor status:', error);
            toast.error('Failed to accept competitor');
        }
    };

    const handleReject = async (competitorId: number) => {
        // If brand doesn't exist yet (during creation), just update local state
        if (!brandId) {
            setCompetitors(competitors.map(c =>
                c.id === competitorId ? { ...c, status: 'rejected' as const } : c
            ));
            toast.success('Competitor rejected!');
            return;
        }

        try {
            const response = await fetch(`/brands/${brandId}/competitors/${competitorId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ status: 'rejected' }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Update local state
                setCompetitors(competitors.map(c =>
                    c.id === competitorId ? { ...c, status: 'rejected' as const } : c
                ));
                toast.success('Competitor rejected!');
            } else {
                toast.error(data.message || 'Failed to reject competitor');
            }
        } catch (error) {
            console.error('Error updating competitor status:', error);
            toast.error('Failed to reject competitor');
        }
    };

    // Manual add functionality
    const handleManualAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.domain.trim()) {
            toast.error('Please enter both name and domain');
            return;
        }

        if (acceptedCompetitors.length >= 10) {
            toast.error("Maximum 10 competitors allowed");
            return;
        }

        const domain = formData.domain.trim().startsWith('http')
            ? formData.domain.trim()
            : `https://${formData.domain.trim()}`;

        // If we have a brand ID, save to database first
        if (brandId) {
            try {
                const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;

                if (!csrfToken) {
                    toast.error('CSRF token not found. Please refresh the page.');
                    return;
                }

                const response = await fetch(route('competitors.save-bulk'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({
                        brand_id: brandId,
                        competitors: [{
                            name: formData.name.trim(),
                            domain: domain,
                            tracked_name: formData.trackedName.trim(),
                            allies: formData.allies.filter(a => a.trim() !== ''),
                            status: 'accepted',
                            source: 'manual'
                        }]
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    toast.error(errorData.message || 'Failed to save competitor');
                    return;
                }

                const savedData = await response.json();

                if (savedData.competitors && savedData.competitors.length > 0) {
                    const savedCompetitor = savedData.competitors[0];
                    const newCompetitor: Competitor = {
                        id: savedCompetitor.id,
                        name: savedCompetitor.name,
                        domain: savedCompetitor.domain,
                        trackedName: savedCompetitor.trackedName || '',
                        allies: savedCompetitor.allies || [],
                        mentions: savedCompetitor.mentions || 0,
                        status: 'accepted',
                        source: 'manual'
                    };

                    setCompetitors([...competitors, newCompetitor]);
                    setShowForm(false);
                    setFormData({ name: '', domain: '', trackedName: '', allies: [] });
                    toast.success('Competitor added successfully');
                } else {
                    toast.error('Failed to save competitor - no data returned');
                }
            } catch (error) {
                console.error('Error saving competitor:', error);
                toast.error('Failed to save competitor');
            }
        } else {
            // No brand ID yet (during creation flow), just update local state
            const newCompetitor: Competitor = {
                id: Date.now(),
                name: formData.name.trim(),
                domain: domain,
                trackedName: formData.trackedName.trim(),
                allies: formData.allies.filter(a => a.trim() !== ''),
                mentions: 0,
                status: 'accepted',
                source: 'manual'
            };

            setCompetitors([...competitors, newCompetitor]);
            setShowForm(false);
            setFormData({ name: '', domain: '', trackedName: '', allies: [] });
            toast.success('Competitor added successfully');
        }
    };

    return (
        <div className="space-y-6 mt-15">
            <div className="flex items-center justify-between">
                <div className="block">
                    <h3 className="text-xl font-semibold">Suggested Competitors</h3>
                </div>
                <button
                    type="button"
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
                                    {/* <button className="edit-btn">
                                        <Pencil className="w-[15px]"/>
                                    </button> */}
                                </div>
                                <p className='text-gray-400'>{competitor.mentions} Mentions</p>
                                <div className="competitor-btn-action">
                                    <button
                                        type="button"
                                        className='btn-action-close'
                                        onClick={() => handleReject(competitor.id)}
                                    >
                                        <X className="w-[15px]" />
                                    </button>
                                    <button
                                        type="button"
                                        className='btn-action-check'
                                        onClick={() => handleAccept(competitor.id)}
                                    >
                                        <Check className="w-[15px]" />
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
                                        <Pencil className="w-[15px]" />
                                    </button>
                                </div>
                                <p className='text-gray-400'>{competitor.mentions} Mentions</p>
                                <div className="competitor-btn-action">
                                    <button className='btn-action-close opacity-50' disabled>
                                        <X className="w-[15px]" />
                                    </button>
                                    <button className='btn-action-check opacity-50' disabled>
                                        <Check className="w-[15px]" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Manual Add */}
            <div className="step-wrapp-card mt-[50px]">
                <h3 className="text-xl font-semibold mb-5">Create Competitor</h3>
                {showForm ? (
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="domain">Domain</Label>
                            <Input id="domain" value={formData.domain} onChange={e => {
                                let val = e.target.value;
                                if (val && !val.startsWith('http://') && !val.startsWith('https://')) val = 'https://' + val;
                                setFormData(prev => ({ ...prev, domain: val }));
                            }} />
                        </div>
                        <div className=" space-y-4 allies-card">
                            <div className="grid gap-2">
                                <Label>Tracked Name  <small className='text-xs font-normal text-muted-foreground'>( Optional )</small> </Label>
                                <Input value={formData.trackedName} onChange={e => setFormData(prev => ({ ...prev, trackedName: e.target.value }))} />
                            </div>
                            <div className="flex gap-2">
                                <Label>Alias  <small className='text-xs font-normal text-muted-foreground'>( Optional )</small> </Label>
                                <Button type="button" variant="outline" size="sm" onClick={addAllyField}>+ Add Alias</Button>
                                {formData.allies.map((a, i) => (
                                    <div key={i} className="grid gap-2">
                                        <Input value={a} onChange={e => {
                                            const updated = [...formData.allies]; updated[i] = e.target.value;
                                            setFormData(prev => ({ ...prev, allies: updated }));
                                        }} />
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeAllyField(i)}>✕</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" onClick={handleManualAdd}><Check className='w-4' /> Save</Button>
                            <Button type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <Button type="button" onClick={() => setShowForm(true)}><CirclePlus className='w-4' /> Add Competitor</Button>
                )}
            </div>

            <div className="bg-sidebar flex flex-col gap-6 rounded-xl border p-10 shadow-sm mt-[50px]">
                <div className="block mb-5">
                    <h3 className="text-xl font-semibold">Selected Brands</h3>
                </div>

                {/* Your Brand */}
                <div className="flex items-center gap-[15px] border rounded-sm min-h-[60px] p-5 mb-1 bg-white flex-wrap">
                    <button><RotateCw className='w-4 text-gray-400' /></button>
                    <p className='text-black'>{data.name || 'Your Brand'}</p>
                    <Badge className='bg-green-100 text-green-600 h-[40px] w-[110px]'>
                        <span className='h-3 w-3 rounded-full bg-green-600 mr-2'></span>
                        Your Brand
                    </Badge>
                </div>

                {/* Accepted Competitors */}
                {acceptedCompetitors.map((competitor) => (
                    <div key={competitor.id} className="flex items-center gap-[15px] border rounded-sm min-h-[60px] p-5 bg-white flex-wrap">
                        <button><Settings className='w-4 text-gray-400' /></button>
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
