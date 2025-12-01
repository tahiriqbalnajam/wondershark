import { Head, Link } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import HeadingSmall from '@/components/heading-small';
import { ArrowLeft, ExternalLink, Users, MessageSquare, Loader2, Shield, Edit, Building2, Globe, Trophy, TrendingUp, TrendingDown, Bot, User } from 'lucide-react';
import { VisibilityChart } from '@/components/chart/visibility';
import { BrandVisibilityIndex } from '@/components/dashboard-table/brand-visibility';
import { AiCitations } from '@/components/chat/ai-citations';

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
            icon?: string;
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
    historicalStats: Record<string, Record<string, { entity_name: string; visibility: number; sentiment: number; position: number }>>;
}

const breadcrumbs = (brand: Brand) => [
    { name: 'Dashboard', href: '/', title: 'Dashboard' },
    { name: 'Brands', href: '/brands', title: 'Brands' },
    { name: brand.name, href: '', title: brand.name },
];

export default function BrandShow({ brand, competitiveStats, historicalStats }: Props) {
    const [selectedCompetitorDomain, setSelectedCompetitorDomain] = useState<string | null>(null);
    const [triggeringAnalysis, setTriggeringAnalysis] = useState(false);

    // Calculate visibility data from competitive stats - use historical data if available
    const visibilityChartData = useMemo(() => {
        // If we have historical stats, use them
        if (historicalStats && Object.keys(historicalStats).length > 0) {
            const dates = Object.keys(historicalStats).sort();
            
            // Get all unique entities across all dates
            const entitiesMap = new Map<string, { name: string; domain: string }>();
            
            dates.forEach(date => {
                const dayData = historicalStats[date];
                Object.keys(dayData).forEach(domain => {
                    if (!entitiesMap.has(domain)) {
                        entitiesMap.set(domain, {
                            name: dayData[domain].entity_name,
                            domain: domain
                        });
                    }
                });
            });

            const entities = Array.from(entitiesMap.values());

            // Build chart data
            const chartData = dates.map(dateStr => {
                const date = new Date(dateStr);
                const dataPoint: Record<string, string | number> = {
                    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                };

                // Add visibility for each entity
                entities.forEach(entity => {
                    const dayData = historicalStats[dateStr];
                    dataPoint[entity.domain] = dayData[entity.domain]?.visibility || 0;
                });

                return dataPoint;
            });

            return { 
                data: chartData, 
                granularity: 'day' as 'month' | 'day', 
                entities 
            };
        }

        // Fallback to current competitive stats if no historical data
        if (!competitiveStats || competitiveStats.length === 0) {
            return { data: [], granularity: 'month' as 'month' | 'day', entities: [] };
        }

        // Get all unique entities from competitive stats
        const entities: Array<{ name: string; domain: string }> = [];
        const entitiesMap = new Map<string, { name: string; domain: string }>();

        competitiveStats.forEach(stat => {
            const cleanDomain = stat.entity_url
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .split('/')[0];
            
            if (!entitiesMap.has(cleanDomain)) {
                const entity = { name: stat.entity_name, domain: cleanDomain };
                entitiesMap.set(cleanDomain, entity);
                entities.push(entity);
            }
        });

        // For now, show current visibility as a single data point
        const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const dataPoint: Record<string, string | number> = {
            date: currentDate
        };

        // Add visibility for each entity
        competitiveStats.forEach(stat => {
            const cleanDomain = stat.entity_url
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .split('/')[0];
            
            dataPoint[cleanDomain] = stat.visibility;
        });

        return { 
            data: [dataPoint], 
            granularity: 'month' as 'month' | 'day', 
            entities 
        };
    }, [competitiveStats, historicalStats]);
    const [selectedPrompt, setSelectedPrompt] = useState<Brand['prompts'][0] | null>(null);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

    const handleBrandRowClick = (domain: string) => {
        // Scroll to Recent AI Citations section
        const citationsSection = document.getElementById('recent-citations');
        if (citationsSection) {
            citationsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // Set the competitor filter
        setSelectedCompetitorDomain(domain);
    };

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
        // Only show active prompts (status = 'active' or is_active = true)
        const activePrompts = (brand.prompts || []).filter(prompt => 
            prompt.is_active === true
        );

        if (!selectedCompetitorDomain) {
            return activePrompts;
        }

        return activePrompts.filter(prompt => {
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
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <span className='w-[45px] h-[45px] bg-gray-200 flex items-center justify-center rounded'><Building2/></span>
                                <div>
                                    Visibility
                                    <p className="mt-2 text-gray-600 text-xs">Percentage of chats mentioning each brand</p>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <VisibilityChart
                            data={visibilityChartData.data}
                            entities={visibilityChartData.entities}
                            granularity={visibilityChartData.granularity}
                        />
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <span className='w-[45px] h-[45px] bg-gray-200 flex items-center justify-center rounded'><Trophy/></span>
                                Brand Visibility Index
                            </CardTitle>
                        </CardHeader>
                        <BrandVisibilityIndex 
                            competitiveStats={competitiveStats} 
                            onRowClick={handleBrandRowClick}
                        />
                    </Card>
                </div>

                {/* Recent chats */}
                <Card id="recent-citations">
                    <CardHeader>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center'>
                                <CardTitle className="flex items-center gap-2">
                                    <span className='w-[45px] h-[45px] bg-gray-200 flex items-center justify-center rounded'><MessageSquare/></span>
                                   Recent AI Citations ({filteredPrompts?.length || 0})
                                </CardTitle>
                                {selectedCompetitorDomain && (
                                    <Button variant="outline" size="sm" className="ml-2" onClick={() => setSelectedCompetitorDomain(null)}>
                                        Clear filter
                                    </Button>
                                )}
                            </div>
                            <a href="/" className='primary-btn'> View all AI Citations</a>
                        </div>
                    </CardHeader>
                    <AiCitations 
                        prompts={filteredPrompts} 
                        onPromptClick={handlePromptClick}
                    />
                </Card>

                {/* Target Subreddits */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span className='w-[45px] h-[45px] bg-gray-200 flex items-center justify-center rounded'><Users/></span>
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
                                    {selectedPrompt.ai_model.icon ? (
                                        <img 
                                            src={`/storage/${selectedPrompt.ai_model.icon}`}
                                            alt={selectedPrompt.ai_model.display_name}
                                            className="w-5 h-5 object-contain rounded"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <Bot className="h-5 w-5 text-primary" />
                                    )}
                                    <span className="font-medium text-sm">
                                        Analyzed by {selectedPrompt.ai_model.display_name}
                                    </span>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-12 gap-6">
                                {/* Left Column - 75% width (9/12) */}
                                <div className="col-span-9 space-y-4">
                                    {/* Prompt Card - aligned right */}
                                    <div className="flex items-start justify-end gap-3">
                                        <Card className="max-w-md w-full bg-blue-50 border-blue-200">
                                            <CardContent>
                                                <p className="text-sm">{selectedPrompt.prompt}</p>
                                            </CardContent>
                                        </Card>
                                        <div className="flex-shrink-0 mt-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                                <User className="h-5 w-5 text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Response */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-3">
                                            {selectedPrompt.ai_model?.icon ? (
                                                <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center p-1">
                                                    <img 
                                                        src={`/storage/${selectedPrompt.ai_model.icon}`}
                                                        alt={selectedPrompt.ai_model.display_name}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Bot className="h-5 w-5 text-primary" />
                                                </div>
                                            )}
                                        </div>
                                        <Card className="flex-1">
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
                                        {/* Brand Icon */}
                                        <div className="border rounded-lg p-3 bg-gradient-to-br from-blue-50 to-indigo-50">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center p-1.5">
                                                    <img 
                                                        src={`https://img.logo.dev/${brand.domain?.replace(/^www\./, '') || brand.website?.replace(/^www\./, '')}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`}
                                                        alt={brand.name}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`;
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-sm">{brand.name}</h4>
                                                    <p className="text-xs text-muted-foreground">Your Brand</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Competitor Resources */}
                                        {selectedPrompt.prompt_resources && selectedPrompt.prompt_resources.length > 0 ? (
                                            selectedPrompt.prompt_resources.map((resource: { url: string; type: string; title: string; description: string; domain: string; is_competitor_url: boolean; }, index: number) => {
                                                const cleanDomain = resource.domain.replace(/^www\./, '');
                                                return (
                                                    <div 
                                                        key={index} 
                                                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer hover:shadow-md"
                                                        onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex-shrink-0 w-8 h-8 rounded bg-white border flex items-center justify-center p-1">
                                                                <img 
                                                                    src={`https://img.logo.dev/${cleanDomain}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`}
                                                                    alt={resource.domain}
                                                                    className="w-full h-full object-contain"
                                                                    onError={(e) => {
                                                                        e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-medium text-sm mb-1">
                                                                    {resource.title || 'Untitled Resource'}
                                                                </h4>
                                                                <p className="text-xs text-gray-500 truncate mb-2" title={resource.url}>
                                                                    {resource.domain}
                                                                </p>
                                                                {resource.description && (
                                                                    <p className="text-xs text-gray-600 mt-1 mb-2 line-clamp-2">{resource.description}</p>
                                                                )}
                                                                {resource.type && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {resource.type}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
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
