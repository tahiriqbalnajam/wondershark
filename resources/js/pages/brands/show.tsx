import { Head, Link } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import HeadingSmall from '@/components/heading-small';
import { ArrowLeft, ExternalLink, Users, MessageSquare, Loader2, Shield, Edit, Building2, Globe, Trophy, TrendingUp, TrendingDown, Bot } from 'lucide-react';

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

interface Brand {
    id: number;
    name: string;
    domain?: string;
    website?: string;
    description?: string;
    created_at?: string;
    status: string;
    competitors: Array<{
        id: number;
        name: string;
        domain: string;
        rank?: number;
        sentiment?: number;
        visibility?: number;
        serp_volume: number;
        serp_difficulty: number;
        serp_position: number;
    }>;
    prompts: Array<{
        id: number;
        prompt: string;
        ai_response?: string;
        sentiment?: string;
        position?: number;
        visibility?: number;
        is_active: boolean;
        analysis_completed_at?: string;
        ai_model?: {
            id: number;
            name: string;
            display_name: string;
            provider?: string;
        };
        prompt_resources?: Array<{
            url: string;
            type: string;
            title: string;
            description: string;
            domain: string;
            is_competitor_url: boolean;
        }>;
    }>;
    subreddits: Array<{
        id: number;
        subreddit_name: string;
        description?: string;
        status: string;
    }>;
}

interface Props {
    brand: Brand;
    competitiveStats: CompetitiveStat[];
}

const breadcrumbs = (brand: Brand) => [
    { name: 'Dashboard', href: '/', title: 'Dashboard' },
    { name: 'Brands', href: '/brands', title: 'Brands' },
    { name: brand.name, href: '', title: brand.name },
];

export default function BrandShow({ brand, competitiveStats }: Props) {
    const [selectedCompetitorDomain, setSelectedCompetitorDomain] = useState<string | null>(null);
    const [triggeringAnalysis, setTriggeringAnalysis] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useState<Brand['prompts'][0] | null>(null);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

    // Helper function to render trend indicators (only for up/down changes)
    const renderTrendIndicator = (trend: 'up' | 'down' | 'stable' | 'new', change: number) => {
        // Only show trends for actual up/down changes
        if (trend !== 'up' && trend !== 'down') {
            return null;
        }
        
        // Handle null/undefined change values
        if (change == null || isNaN(change)) {
            return null;
        }
        
        const isUp = trend === 'up';
        const colorClass = isUp ? 'text-green-600' : 'text-red-600';
        const Icon = isUp ? TrendingUp : TrendingDown;
        const prefix = isUp ? '+' : '';
        
        return (
            <div className={`flex items-center gap-1 ${colorClass}`}>
                <Icon className="h-3 w-3" />
                <span className="text-xs font-medium">{prefix}{Math.abs(change)}%</span>
            </div>
        );
    };

    const filteredPrompts = useMemo(() => {
        if (!selectedCompetitorDomain) {
            return brand.prompts || [];
        }

        return (brand.prompts || []).filter(prompt => {
            if (!prompt.prompt_resources) return false;
            
            return prompt.prompt_resources.some((resource: { url: string; type: string; title: string; description: string; domain: string; is_competitor_url: boolean; }) => {
                const resourceDomain = resource.domain ? resource.domain.replace(/^www\./, '') : '';
                return resourceDomain === selectedCompetitorDomain;
            });
        });
    }, [brand.prompts, selectedCompetitorDomain]);

    const handlePromptClick = (prompt: Brand['prompts'][0]) => {
        setSelectedPrompt(prompt);
        setIsPromptModalOpen(true);
    };

    const handleTriggerAnalysis = async (force: boolean = false) => {
        setTriggeringAnalysis(true);
        try {
            const response = await fetch(`/brands/${brand.id}/trigger-prompt-analysis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ force })
            });
            const data = await response.json();
            if (data.success) {
                alert(`Successfully queued ${data.jobs_queued} analysis jobs. Check back in a few minutes to see results.`);
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error triggering analysis:', error);
            alert('Error triggering analysis. Please try again.');
        } finally {
            setTriggeringAnalysis(false);
        }
    };

    if (!brand) {
        return (
            <AppLayout>
                <Head title="Brand Not Found" />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold text-gray-900">Brand Not Found</h1>
                        <p className="mt-2 text-gray-600">The brand you're looking for doesn't exist.</p>
                        <Button className="mt-4" asChild>
                            <Link href="/brands">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Brands
                            </Link>
                        </Button>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs(brand)}>
            <Head title={`${brand.name} - Brand Details`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/brands">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Brands
                            </Link>
                        </Button>
                        <div>
                            <HeadingSmall 
                                title={brand.name}
                                description="Brand details and content strategy overview" 
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => handleTriggerAnalysis(false)}
                            disabled={triggeringAnalysis}
                        >
                            {triggeringAnalysis ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Analyze Prompts
                                </>
                            )}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('competitors.index', { brand: brand.id })}>
                                <Shield className="h-4 w-4 mr-2" />
                                Competitors
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={`/brands/${brand.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Brand
                            </Link>
                        </Button>
                        <Badge variant={brand.status === 'active' ? 'default' : 'secondary'} className="px-3 py-1">
                            {brand.status}
                        </Badge>
                    </div>
                </div>

                {/* Brand Overview */}
                <div className="grid gap-6 lg:grid-cols-4">
                    <Card className="lg:col-span-1">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Basic Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Brand Name</label>
                                <p className="text-lg font-semibold">{brand.name}</p>
                            </div>
                            {brand.website && (
                                <div>
                                    <label className="text-sm font-medium">Website</label>
                                    <a 
                                        href={brand.website} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-primary hover:underline"
                                    >
                                        <Globe className="h-4 w-4" />
                                        {new URL(brand.website).hostname}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <p className="text-sm text-muted-foreground">{brand.description}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Created</label>
                                <p className="text-sm">{brand.created_at ? new Date(brand.created_at).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="h-5 w-5" />
                                Industry Ranking
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {competitiveStats && competitiveStats.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="pb-3 text-sm font-medium text-muted-foreground w-12">#</th>
                                                <th className="pb-3 text-sm font-medium text-muted-foreground">Entity</th>
                                                <th className="pb-3 text-sm font-medium text-muted-foreground text-center w-32">Position</th>
                                                <th className="pb-3 text-sm font-medium text-muted-foreground text-center w-32">Sentiment</th>
                                                <th className="pb-3 text-sm font-medium text-muted-foreground text-center w-32">Visibility</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {competitiveStats
                                                .sort((a, b) => a.position - b.position) // Sort by position (lower is better)
                                                .map((stat, index) => {
                                                // Clean domain for display - remove protocol and www
                                                const cleanDomain = stat.entity_url
                                                    .replace(/^https?:\/\//, '')
                                                    .replace(/^www\./, '');
                                                const logoUrl = `https://img.logo.dev/${cleanDomain}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`;
                                                const fallbackLogo = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`;
                                                
                                                const isBrand = stat.entity_type === 'brand';
                                                
                                                return (
                                                    <tr key={stat.id}
                                                        className={`border-b last:border-b-0 hover:bg-muted/50 transition-colors ${isBrand ? 'bg-blue-50/50' : ''}`}
                                                    >
                                                        <td className="py-4 text-sm font-medium">
                                                            {index + 1}
                                                            {isBrand && <span className="ml-1 text-blue-600">👑</span>}
                                                        </td>
                                                        <td className="py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg border bg-white flex items-center justify-center p-1">
                                                                    <img 
                                                                        src={logoUrl}
                                                                        alt={`${stat.entity_name} logo`}
                                                                        className="w-full h-full object-contain"
                                                                        onError={(e) => {
                                                                            e.currentTarget.src = fallbackLogo;
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-medium text-sm ${isBrand ? 'text-blue-700' : 'hover:text-primary'}`}>
                                                                            {stat.entity_name}
                                                                        </span>
                                                                        {isBrand && (
                                                                            <Badge variant="default" className="text-xs px-2 py-0">
                                                                                Your Brand
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">{cleanDomain}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {renderTrendIndicator(stat.trends.position_trend, stat.trends.position_change)}
                                                                <Badge variant={isBrand ? 'default' : 'secondary'} className="font-mono">
                                                                    {stat.position_formatted || 'N/A'}
                                                                </Badge>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {renderTrendIndicator(stat.trends.sentiment_trend, stat.trends.sentiment_change)}
                                                                <Badge 
                                                                    variant={
                                                                        stat.sentiment != null && stat.sentiment >= 75 ? 'default' :
                                                                        stat.sentiment != null && stat.sentiment >= 60 ? 'secondary' :
                                                                        'destructive'
                                                                    }
                                                                    className="font-mono"
                                                                >
                                                                    {stat.sentiment != null ? stat.sentiment : 'N/A'}
                                                                </Badge>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {renderTrendIndicator(stat.trends.visibility_trend, stat.trends.visibility_change)}
                                                                <Badge variant="outline" className="font-mono">
                                                                    {stat.visibility_percentage || 'N/A'}
                                                                </Badge>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    <div className="mt-4 text-xs text-muted-foreground text-center">
                                        Last updated: {competitiveStats[0]?.analyzed_at ? new Date(competitiveStats[0].analyzed_at).toLocaleDateString() : 'Never'}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <h3 className="font-medium mb-1">No competitive analysis data available</h3>
                                    <p className="text-sm">Run competitive analysis to track industry rankings and performance.</p>
                                    <Button className="mt-4" size="sm" asChild>
                                        <Link href={`/brands/${brand.id}/competitive-stats`}>
                                            View Competitive Analysis
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent chats */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Recent chats ({filteredPrompts?.length || 0})
                        </CardTitle>
                        {selectedCompetitorDomain && (
                            <Button variant="outline" size="sm" className="ml-2" onClick={() => setSelectedCompetitorDomain(null)}>
                                Clear competitor filter
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {filteredPrompts && filteredPrompts.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {filteredPrompts.map((prompt, index) => (
                                    <Card 
                                        key={prompt.id} 
                                        className="border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => handlePromptClick(prompt)}
                                    >
                                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">Prompt {index + 1}</Badge>
                                                {prompt.ai_model && (
                                                    <Badge variant="secondary" className="flex items-center gap-1">
                                                        <Bot className="h-3 w-3" />
                                                        {prompt.ai_model.display_name}
                                                    </Badge>
                                                )}
                                            </div>
                                            <Badge variant={prompt.is_active ? 'default' : 'secondary'}>
                                                {prompt.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm mb-2">{prompt.prompt}</p>
                                            {/* Optionally show competitor resources here if filtered */}
                                            {selectedCompetitorDomain && prompt.prompt_resources && (
                                                <div className="mt-2">
                                                    <h4 className="font-medium mb-1 text-xs">Competitor Resources:</h4>
                                                    <div className="space-y-1">
                                                        {prompt.prompt_resources.map((resource: { url: string; type: string; title: string; description: string; domain: string; is_competitor_url: boolean; }, resourceIndex: number) => (
                                                            (resource.domain && resource.domain.replace(/^www\./, '') === selectedCompetitorDomain) ? (
                                                                <a
                                                                    key={resourceIndex}
                                                                    href={resource.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="block text-xs text-primary hover:underline p-1 bg-blue-50 rounded border-l-2 border-l-blue-500"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {resource.title || resource.url}
                                                                </a>
                                                            ) : null
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No chats found for this competitor.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Target Subreddits */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Target Subreddits ({brand.subreddits?.length || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {brand.subreddits && brand.subreddits.length > 0 ? (
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {brand.subreddits.map((subreddit) => (
                                    <div key={subreddit.id} className="p-3 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="secondary">r/{subreddit.subreddit_name}</Badge>
                                            <Badge variant={subreddit.status === 'approved' ? 'default' : 'outline'}>
                                                {subreddit.status}
                                            </Badge>
                                        </div>
                                        {subreddit.description && (
                                            <p className="text-sm text-muted-foreground">{subreddit.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No target subreddits configured yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Prompt Details Modal */}
            <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
                <DialogContent className=" max-w-lg max-h-[90vh] overflow-y-auto" style={{ width: '90vw', maxWidth: '90vw' }}>
                    {selectedPrompt && (
                        <>
                            {/* AI Model Header - at the very top */}
                            {selectedPrompt.ai_model && (
                                <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                                    <Bot className="h-5 w-5 text-primary" />
                                    <span className="font-medium text-sm">
                                        Analyzed by {selectedPrompt.ai_model.display_name}
                                    </span>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-12 gap-6">
                                {/* Left Column - 75% width (9/12) */}
                                <div className="col-span-9 space-y-4">
                                    {/* Prompt Card - aligned right */}
                                    <div className="flex justify-end">
                                        <Card className="max-w-md w-full bg-blue-50 border-blue-200">
                                            <CardContent>
                                                <p className="text-sm">{selectedPrompt.prompt}</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* AI Response */}
                                    <div>
                                        <Card>
                                            <CardContent className="pt-6">
                                                {selectedPrompt.ai_response ? (
                                                    <div 
                                                        className="prose prose-sm max-w-none"
                                                        dangerouslySetInnerHTML={{ __html: selectedPrompt.ai_response }}
                                                    />
                                                ) : (
                                                    <p className="text-muted-foreground italic">No AI response available yet.</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* Right Column - 25% width (3/12) */}
                                <div className="col-span-3">
                                    <h3 className="text-lg font-semibold mb-3">Resources</h3>
                                    <div className="space-y-3">
                                        {selectedPrompt.prompt_resources && selectedPrompt.prompt_resources.length > 0 ? (
                                            selectedPrompt.prompt_resources.map((resource: { url: string; type: string; title: string; description: string; domain: string; is_competitor_url: boolean; }, index: number) => (
                                                <div 
                                                    key={index} 
                                                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer hover:shadow-md"
                                                    onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
                                                >
                                                    <h4 className="font-medium text-sm mb-1">
                                                        {resource.title || 'Untitled Resource'}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 block truncate mb-2" title={resource.url}>
                                                        {resource.url}
                                                    </p>
                                                    {resource.description && (
                                                        <p className="text-xs text-gray-600 mt-1 mb-2">{resource.description}</p>
                                                    )}
                                                    {resource.type && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {resource.type}
                                                        </Badge>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No resources found for this prompt.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
