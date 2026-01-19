import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, BarChart3, TrendingUp, Globe, Eye, Calendar, Filter } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Analysis {
    id: number;
    target_url: string;
    country: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    created_at: string;
    post: {
        id: number;
        title?: string;
    };
    user: {
        name: string;
    };
    ai_responses: Array<{
        ai_provider: string;
        status: string;
    }>;
    progress_percentage?: number;
    industry_rankings?: Record<string, number>;
    top_sources?: Record<string, number>;
    metadata?: {
        overall_sentiment: number;
        providers_used: string[];
    };
}

interface PageProps {
    analyses: {
        data: Analysis[];
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
        current_page: number;
        last_page: number;
    };
    filters: {
        status?: string;
        country?: string;
    };
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'completed':
            return 'bg-green-500';
        case 'processing':
            return 'bg-blue-500';
        case 'error':
            return 'bg-red-500';
        default:
            return 'bg-gray-500';
    }
};

const getStatusText = (status: string) => {
    switch (status) {
        case 'pending':
            return 'Pending';
        case 'processing':
            return 'Processing';
        case 'completed':
            return 'Completed';
        case 'error':
            return 'Error';
        default:
            return 'Unknown';
    }
};

export default function Index({ analyses, filters }: PageProps) {
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [countryFilter, setCountryFilter] = useState(filters.country || 'all');
    
    const handleFilterChange = () => {
        const params = new URLSearchParams();
        if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
        if (countryFilter && countryFilter !== 'all') params.append('country', countryFilter);
        
        window.location.href = `/search-analytics?${params.toString()}`;
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Search Analytics', href: '/search-analytics' }
            ]}
        >
            <Head title="Search Analytics" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <BarChart3 className="h-6 w-6" />
                        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                            Search Analytics
                        </h2>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analyses.data.length}</div>
                            <p className="text-xs text-muted-foreground">
                                All time
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {analyses.data.filter(a => a.status === 'completed').length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Ready for review
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Processing</CardTitle>
                            <Globe className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {analyses.data.filter(a => ['pending', 'processing'].includes(a.status)).length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                In progress
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Countries</CardTitle>
                            <Globe className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {new Set(analyses.data.map(a => a.country)).size}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Markets analyzed
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Filter className="h-5 w-5" />
                            <span>Filters</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex flex-col space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="processing">Processing</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="error">Error</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className="text-sm font-medium">Country</label>
                                <Select value={countryFilter} onValueChange={setCountryFilter}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="All Countries" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Countries</SelectItem>
                                        <SelectItem value="US">United States</SelectItem>
                                        <SelectItem value="UK">United Kingdom</SelectItem>
                                        <SelectItem value="CA">Canada</SelectItem>
                                        <SelectItem value="AU">Australia</SelectItem>
                                        <SelectItem value="DE">Germany</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={handleFilterChange} variant="outline">
                                <Search className="h-4 w-4 mr-2" />
                                Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Analysis Results */}
                <div className="space-y-4">
                    {analyses.data.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No analyses found
                                </h3>
                                <p className="text-gray-500 text-center mb-4">
                                    Start analyzing posts to see industry insights and rankings here.
                                </p>
                                <Link href="/posts">
                                    <Button>
                                        View Posts
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        analyses.data.map((analysis) => (
                            <Card key={analysis.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2">
                                            <div className="lg:flex block items-center space-x-3">
                                                <CardTitle className="text-lg card-title">
                                                    {analysis.target_url}
                                                </CardTitle>
                                                <Badge className={getStatusColor(analysis.status)}>
                                                    {getStatusText(analysis.status)}
                                                </Badge>
                                            </div>
                                            <CardDescription>
                                                Post #{analysis.post.id} • Analyzed by {analysis.user.name} • {analysis.country}
                                            </CardDescription>
                                        </div>
                                        <div className="flex space-x-2">
                                            <Link href={`/search-analytics/${analysis.id}`}>
                                                <Button variant="outline" size="sm">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Details
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Progress for processing analyses */}
                                        {['pending', 'processing'].includes(analysis.status) && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium">Analysis Progress</span>
                                                    <span className="text-sm text-gray-500">
                                                        {analysis.progress_percentage || 0}%
                                                    </span>
                                                </div>
                                                <Progress value={analysis.progress_percentage || 0} />
                                                <div className="flex space-x-2">
                                                    {analysis.ai_responses.map((response, index) => (
                                                        <Badge 
                                                            key={index}
                                                            variant={response.status === 'completed' ? 'default' : 'secondary'}
                                                            className="text-xs"
                                                        >
                                                            {response.ai_provider}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Results preview for completed analyses */}
                                        {analysis.status === 'completed' && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium text-sm">Industry Rankings</h4>
                                                    <div className="space-y-1">
                                                        {Object.entries(analysis.industry_rankings || {})
                                                            .slice(0, 3)
                                                            .map(([industry, count]) => (
                                                                <div key={industry} className="flex justify-between text-sm">
                                                                    <span className="capitalize">{industry}</span>
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {count}
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <h4 className="font-medium text-sm">Top Sources</h4>
                                                    <div className="space-y-1">
                                                        {Object.entries(analysis.top_sources || {})
                                                            .slice(0, 3)
                                                            .map(([source, count]) => (
                                                                <div key={source} className="flex justify-between text-sm">
                                                                    <span className="truncate">{source}</span>
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {count}
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <h4 className="font-medium text-sm">Analysis Details</h4>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-sm">
                                                            <span>Sentiment Score</span>
                                                            <Badge 
                                                                variant={
                                                                    (analysis.metadata?.overall_sentiment || 0) > 0.6 
                                                                        ? 'default' 
                                                                        : (analysis.metadata?.overall_sentiment || 0) > 0.4 
                                                                        ? 'secondary' 
                                                                        : 'destructive'
                                                                }
                                                                className="text-xs"
                                                            >
                                                                {((analysis.metadata?.overall_sentiment || 0) * 100).toFixed(0)}%
                                                            </Badge>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span>AI Providers</span>
                                                            <span className="text-xs text-gray-500">
                                                                {analysis.metadata?.providers_used?.length || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-2 border-t text-sm text-gray-500">
                                            <span className="flex items-center space-x-1">
                                                <Calendar className="h-4 w-4" />
                                                <span>
                                                    {new Date(analysis.created_at).toLocaleDateString()}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {analyses.last_page > 1 && (
                    <div className="flex justify-center space-x-2">
                        {analyses.links.map((link, index) => (
                            <Link key={index} href={link.url || '#'}>
                                <Button
                                    variant={link.active ? 'default' : 'outline'}
                                    disabled={!link.url}
                                    size="sm"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
