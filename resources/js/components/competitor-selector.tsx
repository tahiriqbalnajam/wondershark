import React, { useState, FormEvent, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, X, Plus, Loader2, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from '@inertiajs/react';

interface Competitor {
    id: number;
    name: string;
    domain: string;
    mentions: number;
    status: 'suggested' | 'accepted' | 'rejected';
    source: 'ai' | 'manual';
}

interface CompetitorSelectorProps {
    competitors: Competitor[];
    setCompetitors: (competitors: Competitor[]) => void;
    brandData?: {
        website?: string;
        name?: string;
        description?: string;
    };
    sessionId?: string;
    fetchEndpoint?: string; // Allow custom endpoint for different contexts
    title?: string;
    description?: string;
    showTitle?: boolean;
    persistChanges?: boolean; // Whether to persist status changes to database
}

export default function CompetitorSelector({
    competitors,
    setCompetitors,
    brandData,
    sessionId,
    fetchEndpoint = '/api/competitors/fetch-for-brand-creation',
    title = "Competitor Analysis",
    description = "Identify your main competitors to better understand your market position.",
    showTitle = true,
    persistChanges = false // Default to false for brand creation
}: CompetitorSelectorProps) {
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    
    const { data: formData, setData: setFormData, processing, errors: formErrors, reset } = useForm({
        name: '',
        domain: '',
    });

    const suggestedCompetitors = competitors.filter(c => c.status === 'suggested');
    const acceptedCompetitors = competitors.filter(c => c.status === 'accepted');

    const handleFetchFromAI = useCallback(async () => {
        if (!brandData?.website) {
            toast.error('Please enter a website first');
            return;
        }

        setLoading(true);
        setProgress(10);
        setProgressText('Connecting to AI service...');
        
        try {
            setProgress(25);
            setProgressText('Analyzing brand information...');
            
            const response = await fetch(fetchEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    website: brandData.website,
                    name: brandData.name,
                    description: brandData.description,
                    session_id: sessionId
                })
            });
            
            setProgress(75);
            setProgressText('Processing competitor data...');
            
            const responseData = await response.json();
            
            if (responseData.success && responseData.competitors) {
                setProgress(100);
                setProgressText('Competitors loaded successfully!');
                
                // Add new competitors to state
                const newCompetitors = responseData.competitors.map((comp: { name: string; domain: string; mentions?: number }, index: number) => ({
                    id: Date.now() + index, // Temporary ID for brand creation
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
            setProgress(0);
            setProgressText('');
        } finally {
            setTimeout(() => {
                setLoading(false);
                setProgress(0);
                setProgressText('');
            }, 2000);
        }
    }, [brandData?.website, brandData?.name, brandData?.description, sessionId, competitors, setCompetitors, fetchEndpoint]);

    const handleAccept = async (competitorId: number) => {
        if (persistChanges) {
            // For existing brand pages - persist to database
            try {
                const response = await fetch(`/competitors/${competitorId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({
                        status: 'accepted'
                    })
                });

                if (response.ok) {
                    // Update local state only after successful API call
                    // Move competitor from suggested to accepted status
                    setCompetitors(competitors.map(c => 
                        c.id === competitorId ? { ...c, status: 'accepted' as const } : c
                    ));
                    toast.success('Competitor accepted!');
                } else {
                    const errorData = await response.text();
                    console.error('API Error Response:', response.status, errorData);
                    throw new Error(`Failed to update competitor status: ${response.status} - ${errorData}`);
                }
            } catch (error) {
                console.error('Error accepting competitor:', error);
                toast.error('Failed to accept competitor');
            }
        } else {
            // For brand creation - just update local state
            setCompetitors(competitors.map(c => 
                c.id === competitorId ? { ...c, status: 'accepted' as const } : c
            ));
        }
    };

    const handleReject = async (competitorId: number) => {
        if (persistChanges) {
            // For existing brand pages - update status to rejected (hide from UI)
            try {
                const response = await fetch(`/competitors/${competitorId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({
                        status: 'rejected'
                    })
                });

                if (response.ok) {
                    // Remove from local state (hide rejected competitors)
                    setCompetitors(competitors.filter(c => c.id !== competitorId));
                    toast.success('Competitor rejected!');
                } else {
                    const errorData = await response.text();
                    console.error('API Error Response:', response.status, errorData);
                    throw new Error(`Failed to update competitor status: ${response.status} - ${errorData}`);
                }
            } catch (error) {
                console.error('Error rejecting competitor:', error);
                toast.error('Failed to reject competitor');
            }
        } else {
            // For brand creation - just update local state
            setCompetitors(competitors.filter(c => c.id !== competitorId));
        }
    };

    const handleMoveToSuggested = async (competitorId: number) => {
        if (persistChanges) {
            // For existing brand pages - move from accepted back to suggested
            try {
                const response = await fetch(`/competitors/${competitorId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({
                        status: 'suggested'
                    })
                });

                if (response.ok) {
                    // Update local state - move from accepted back to suggested
                    setCompetitors(competitors.map(c => 
                        c.id === competitorId ? { ...c, status: 'suggested' as const } : c
                    ));
                    toast.success('Competitor moved back to suggestions!');
                } else {
                    const errorData = await response.text();
                    console.error('API Error Response:', response.status, errorData);
                    throw new Error(`Failed to update competitor status: ${response.status} - ${errorData}`);
                }
            } catch (error) {
                console.error('Error updating competitor:', error);
                toast.error('Failed to update competitor');
            }
        } else {
            // For brand creation - just update local state
            setCompetitors(competitors.map(c => 
                c.id === competitorId ? { ...c, status: 'suggested' as const } : c
            ));
        }
    };

    const handleManualAdd = (e: FormEvent) => {
        e.preventDefault();
        
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
        reset();
        toast.success('Competitor added successfully');
    };

    return (
        <div className="space-y-6">
            {showTitle && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">{title}</h3>
                    <p className="text-muted-foreground">{description}</p>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {acceptedCompetitors.length} accepted • {suggestedCompetitors.length} pending review
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={handleFetchFromAI} 
                        disabled={loading || !brandData?.website}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Zap className="mr-2 h-4 w-4" />
                                {suggestedCompetitors.length > 0 ? 'Find More' : 'Fetch with AI'}
                            </>
                        )}
                    </Button>
                </div>
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
                            <Progress value={progress} className="w-full" />
                            <p className="text-xs text-muted-foreground">
                                AI is analyzing your brand to find relevant competitors...
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Suggested Competitors */}
            {suggestedCompetitors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Suggested Competitors
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {suggestedCompetitors.map((competitor) => (
                                <Card key={competitor.id}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{competitor.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <a href={competitor.domain} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate block">
                                            {competitor.domain}
                                        </a>
                                        <div className="mt-2">
                                            <Badge variant="secondary">Mentions: {competitor.mentions}</Badge>
                                        </div>
                                    </CardContent>
                                    <div className="flex justify-end p-4 border-t gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleReject(competitor.id)}>
                                            <X className="h-4 w-4 text-red-500" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleAccept(competitor.id)}>
                                            <Check className="h-4 w-4 text-green-500" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Accepted Competitors */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Accepted Competitors
                    </CardTitle>
                    <Button size="sm" onClick={() => setShowForm(!showForm)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Manually
                    </Button>
                </CardHeader>
                <CardContent>
                    {showForm && (
                        <form onSubmit={handleManualAdd} className="p-4 border rounded-lg mb-6 bg-muted/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData('name', e.target.value)}
                                        placeholder="Competitor Name"
                                        className="w-full"
                                    />
                                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                                </div>
                                <div>
                                    <Input
                                        id="domain"
                                        name="domain"
                                        value={formData.domain}
                                        onChange={(e) => setFormData('domain', e.target.value)}
                                        placeholder="https://competitor.com"
                                        className="w-full"
                                    />
                                    {formErrors.domain && <p className="text-red-500 text-xs mt-1">{formErrors.domain}</p>}
                                </div>
                            </div>
                            <div className="flex justify-end mt-4 gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    Add Competitor
                                </Button>
                            </div>
                        </form>
                    )}

                    {acceptedCompetitors.length > 0 ? (
                        <div className="space-y-4">
                            {acceptedCompetitors.map((competitor) => (
                                <div key={competitor.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-semibold">{competitor.name}</p>
                                        <a href={competitor.domain} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                                            {competitor.domain}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge variant="outline">Mentions: {competitor.mentions}</Badge>
                                        <Badge variant={competitor.source === 'ai' ? 'default' : 'secondary'}>
                                            {competitor.source.toUpperCase()}
                                        </Badge>
                                        <Button variant="ghost" size="icon" onClick={() => handleMoveToSuggested(competitor.id)}>
                                            <X className="h-4 w-4 text-gray-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No competitors added yet.</p>
                            <p className="text-sm mt-2">
                                {!brandData?.website 
                                    ? "Enter your website to use AI detection."
                                    : "Click 'Fetch with AI' to discover competitors or add them manually."
                                }
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
