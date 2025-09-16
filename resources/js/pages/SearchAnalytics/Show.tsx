import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ExternalLink, TrendingUp, Globe, Calendar, DollarSign } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface IndustryAnalysis {
    id: number;
    post_id: number;
    domain: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress: number;
    total_cost: number;
    industry_mentions: Record<string, number> | null;
    top_sources: Record<string, string> | null;
    sentiment_scores: Record<string, number> | null;
    created_at: string;
    updated_at: string;
    post: {
        id: number;
        title: string;
        content: string;
        url: string;
    };
    ai_responses?: Array<{
        id: number;
        ai_provider: 'openai' | 'gemini' | 'perplexity';
        model_name: string;
        prompt: string;
        response: string;
        tokens_used: number;
        cost: number;
        response_time: number;
        status: 'pending' | 'completed' | 'failed';
        error_message: string | null;
        created_at: string;
    }>;
}

interface Props {
    analysis: IndustryAnalysis;
}

export default function Show({ analysis }: Props) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'failed': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getProviderColor = (provider: string) => {
        if (!provider) return 'bg-gray-100 text-gray-800';
        switch (provider.toLowerCase()) {
            case 'openai': return 'bg-emerald-100 text-emerald-800';
            case 'gemini': return 'bg-purple-100 text-purple-800';
            case 'perplexity': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 4
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Search Analytics', href: '/search-analytics' },
                { title: analysis.domain, href: '' }
            ]}
        >
            <Head title={`Analysis: ${analysis.domain}`} />

            <div className="max-w-7xl mx-auto py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/search-analytics">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Analytics
                            </Button>
                        </Link>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Industry Analysis Details</h2>
                            <p className="text-sm text-gray-600">{analysis.domain}</p>
                        </div>
                    </div>
                    <Badge className={getStatusColor(analysis.status)}>
                        {analysis.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                </div>
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Progress</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analysis.progress}%</div>
                            <Progress value={analysis.progress} className="mt-2" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(analysis.total_cost)}</div>
                            <p className="text-xs text-muted-foreground">API usage cost</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">AI Responses</CardTitle>
                            <Globe className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analysis.ai_responses?.length || 0}</div>
                            <p className="text-xs text-muted-foreground">From {new Set(analysis.ai_responses?.map(r => r.ai_provider) || []).size} providers</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Created</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium">{formatDate(analysis.created_at)}</div>
                            <p className="text-xs text-muted-foreground">Last updated: {formatDate(analysis.updated_at)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Post Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Source Post
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-lg">{analysis.post.title}</h3>
                            <p className="text-gray-600 mt-2">{analysis.post.content}</p>
                        </div>
                        {analysis.post.url && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">URL:</span>
                                <a 
                                    href={analysis.post.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                    {analysis.post.url}
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* AI API Responses */}
                <Card>
                    <CardHeader>
                        <CardTitle>AI Provider Responses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {(analysis.ai_responses || []).map((response) => (
                                <div key={response.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <Badge className={getProviderColor(response.ai_provider)}>
                                                {response.ai_provider?.toUpperCase()}
                                            </Badge>
                                            <span className="text-sm font-medium">{response.model_name}</span>
                                            <Badge variant={response.status === 'completed' ? 'default' : 'destructive'}>
                                                {response.status}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {formatCurrency(response.cost)} • {response.tokens_used} tokens • {response.response_time}ms
                                        </div>
                                    </div>

                                    {response.status === 'failed' && response.error_message && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                            <p className="text-red-700 text-sm">{response.error_message}</p>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="font-medium text-sm text-gray-700 mb-2">Prompt</h4>
                                            <div className="bg-gray-50 p-3 rounded-md text-sm">
                                                {response.prompt}
                                            </div>
                                        </div>

                                        {response.response && (
                                            <div>
                                                <h4 className="font-medium text-sm text-gray-700 mb-2">Response</h4>
                                                <div className="bg-white border p-3 rounded-md text-sm whitespace-pre-wrap">
                                                    {response.response}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3 text-xs text-gray-500">
                                        Generated: {formatDate(response.created_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Aggregated Results */}
                {(analysis.industry_mentions || analysis.top_sources || analysis.sentiment_scores) && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Industry Mentions */}
                        {analysis.industry_mentions && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Industry Mentions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {Object.entries(analysis.industry_mentions).map(([industry, count]) => (
                                            <div key={industry} className="flex justify-between items-center">
                                                <span className="text-sm">{industry}</span>
                                                <Badge variant="secondary">{count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Top Sources */}
                        {analysis.top_sources && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Top Sources</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {Object.entries(analysis.top_sources).map(([source, score]) => (
                                            <div key={source} className="flex justify-between items-center">
                                                <span className="text-sm truncate">{source}</span>
                                                <Badge variant="outline">{score}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Sentiment Scores */}
                        {analysis.sentiment_scores && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {Object.entries(analysis.sentiment_scores).map(([sentiment, score]) => (
                                            <div key={sentiment} className="flex justify-between items-center">
                                                <span className="text-sm capitalize">{sentiment}</span>
                                                <Badge 
                                                    variant={
                                                        sentiment === 'positive' ? 'default' : 
                                                        sentiment === 'negative' ? 'destructive' : 
                                                        'secondary'
                                                    }
                                                >
                                                    {typeof score === 'number' ? score.toFixed(2) : score}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
