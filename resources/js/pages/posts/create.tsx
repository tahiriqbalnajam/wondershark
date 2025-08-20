import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { ArrowLeft, FileText, ExternalLink, Filter, X } from 'lucide-react';

type Brand = {
    id: number;
    name: string;
};

type Props = {
    brands: Brand[];
};

type FormData = {
    title: string;
    url: string;
    description: string;
    brand_id: string;
    status: string;
    posted_at: string;
};

type FilterData = {
    dateRange: '7days' | '14days' | '30days' | 'custom' | '';
    dateFrom: string;
    dateTo: string;
    brandId: string;
    aiModel: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Posts',
        href: '/posts',
    },
    {
        title: 'Create Post',
        href: '/posts/create',
    },
];

export default function PostsCreate({ brands }: Props) {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        title: '',
        url: '',
        description: '',
        brand_id: '',
        status: 'draft',
        posted_at: new Date().toISOString().split('T')[0],
    });

    const [urlPreview, setUrlPreview] = useState('');
    const [filters, setFilters] = useState<FilterData>({
        dateRange: '',
        dateFrom: '',
        dateTo: '',
        brandId: '',
        aiModel: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    // AI Models options
    const aiModels = [
        { value: 'openai', label: 'OpenAI' },
        { value: 'gemini', label: 'Gemini' },
        { value: 'perplexity', label: 'Perplexity' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/posts');
    };

    const handleDateRangeChange = (range: string) => {
        const today = new Date();
        let from = '';
        let to = today.toISOString().split('T')[0];

        if (range === '7days') {
            from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        } else if (range === '14days') {
            from = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        } else if (range === '30days') {
            from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        setFilters(prev => ({
            ...prev,
            dateRange: range as FilterData['dateRange'],
            dateFrom: from,
            dateTo: to
        }));
    };

    const clearFilters = () => {
        setFilters({
            dateRange: '',
            dateFrom: '',
            dateTo: '',
            brandId: '',
            aiModel: '',
        });
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.dateRange) count++;
        if (filters.brandId) count++;
        if (filters.aiModel) count++;
        return count;
    };

    const handleUrlChange = (url: string) => {
        setData('url', url);
        setUrlPreview(url);
        
        // Auto-generate title from URL if title is empty
        if (!data.title && url) {
            try {
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/').filter(Boolean);
                const lastPart = pathParts[pathParts.length - 1] || urlObj.hostname;
                const title = lastPart
                    .replace(/[-_]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                setData('title', title);
            } catch {
                // Invalid URL, ignore auto-title generation
            }
        }
    };

    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Post" />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/posts">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Posts
                        </Link>
                    </Button>
                    
                    <HeadingSmall 
                        title="Create New Post"
                        description="Add a new post to track AI citations"
                    />

                    <div className="ml-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowFilters(!showFilters)}
                            className="relative"
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                            {getActiveFiltersCount() > 0 && (
                                <Badge 
                                    variant="secondary" 
                                    className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                                >
                                    {getActiveFiltersCount()}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Filters Section */}
                {showFilters && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Filter className="h-5 w-5" />
                                    Filters
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    disabled={getActiveFiltersCount() === 0}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Clear All
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Date Range Filter */}
                                <div className="space-y-2">
                                    <Label>Date Range</Label>
                                    <Select 
                                        value={filters.dateRange} 
                                        onValueChange={handleDateRangeChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select date range" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7days">Last 7 days</SelectItem>
                                            <SelectItem value="14days">Last 14 days</SelectItem>
                                            <SelectItem value="30days">Last 30 days</SelectItem>
                                            <SelectItem value="custom">Custom range</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Brand Filter */}
                                <div className="space-y-2">
                                    <Label>Brand</Label>
                                    <Select 
                                        value={filters.brandId} 
                                        onValueChange={(value) => setFilters(prev => ({ ...prev, brandId: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select brand" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All brands</SelectItem>
                                            {brands.map((brand) => (
                                                <SelectItem key={brand.id} value={brand.id.toString()}>
                                                    {brand.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* AI Model Filter */}
                                <div className="space-y-2">
                                    <Label>AI Model</Label>
                                    <Select 
                                        value={filters.aiModel} 
                                        onValueChange={(value) => setFilters(prev => ({ ...prev, aiModel: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select AI model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All models</SelectItem>
                                            {aiModels.map((model) => (
                                                <SelectItem key={model.value} value={model.value}>
                                                    {model.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Custom Date Range */}
                            {filters.dateRange === 'custom' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-2">
                                        <Label>From Date</Label>
                                        <Input
                                            type="date"
                                            value={filters.dateFrom}
                                            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>To Date</Label>
                                        <Input
                                            type="date"
                                            value={filters.dateTo}
                                            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Active Filters Display */}
                            {getActiveFiltersCount() > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                                    {filters.dateRange && (
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            {filters.dateRange === '7days' && 'Last 7 days'}
                                            {filters.dateRange === '14days' && 'Last 14 days'}
                                            {filters.dateRange === '30days' && 'Last 30 days'}
                                            {filters.dateRange === 'custom' && 'Custom date range'}
                                            <X 
                                                className="h-3 w-3 cursor-pointer" 
                                                onClick={() => setFilters(prev => ({ ...prev, dateRange: '', dateFrom: '', dateTo: '' }))}
                                            />
                                        </Badge>
                                    )}
                                    {filters.brandId && (
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            Brand: {brands.find(b => b.id.toString() === filters.brandId)?.name}
                                            <X 
                                                className="h-3 w-3 cursor-pointer" 
                                                onClick={() => setFilters(prev => ({ ...prev, brandId: '' }))}
                                            />
                                        </Badge>
                                    )}
                                    {filters.aiModel && (
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            AI: {aiModels.find(m => m.value === filters.aiModel)?.label}
                                            <X 
                                                className="h-3 w-3 cursor-pointer" 
                                                onClick={() => setFilters(prev => ({ ...prev, aiModel: '' }))}
                                            />
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Post Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* URL Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="url" className="text-sm font-medium">
                                        Post URL *
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="url"
                                            type="url"
                                            placeholder="https://example.com/article"
                                            value={data.url}
                                            onChange={(e) => handleUrlChange(e.target.value)}
                                            className={errors.url ? 'border-destructive' : ''}
                                        />
                                        {data.url && isValidUrl(data.url) && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    {errors.url && (
                                        <p className="text-sm text-destructive">{errors.url}</p>
                                    )}
                                    {urlPreview && isValidUrl(urlPreview) && (
                                        <div className="text-sm text-muted-foreground">
                                            <a 
                                                href={urlPreview} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="hover:text-primary flex items-center gap-1"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                Preview URL
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Title Field */}
                                {/* <div className="space-y-2">
                                    <Label htmlFor="title" className="text-sm font-medium">
                                        Post Title
                                    </Label>
                                    <Input
                                        id="title"
                                        placeholder="Enter post title (auto-generated from URL if empty)"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className={errors.title ? 'border-destructive' : ''}
                                    />
                                    {errors.title && (
                                        <p className="text-sm text-destructive">{errors.title}</p>
                                    )}
                                </div> */}

                                {/* Description Field */}
                                {/* <div className="space-y-2">
                                    <Label htmlFor="description" className="text-sm font-medium">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Brief description of the post content"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={3}
                                        className={errors.description ? 'border-destructive' : ''}
                                    />
                                    {errors.description && (
                                        <p className="text-sm text-destructive">{errors.description}</p>
                                    )}
                                </div> */}

                                {/* Brand Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="brand_id" className="text-sm font-medium">
                                        Brand *
                                    </Label>
                                    <Select 
                                        value={data.brand_id} 
                                        onValueChange={(value) => setData('brand_id', value)}
                                    >
                                        <SelectTrigger className={errors.brand_id ? 'border-destructive' : ''}>
                                            <SelectValue placeholder="Select a brand" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {brands.map((brand) => (
                                                <SelectItem key={brand.id} value={brand.id.toString()}>
                                                    {brand.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.brand_id && (
                                        <p className="text-sm text-destructive">{errors.brand_id}</p>
                                    )}
                                </div>

                                {/* Status and Date Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="status" className="text-sm font-medium">
                                            Status
                                        </Label>
                                        <Select 
                                            value={data.status} 
                                            onValueChange={(value) => setData('status', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">Draft</SelectItem>
                                                <SelectItem value="published">Published</SelectItem>
                                                <SelectItem value="archived">Archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.status && (
                                            <p className="text-sm text-destructive">{errors.status}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="posted_at" className="text-sm font-medium">
                                            Posted Date
                                        </Label>
                                        <Input
                                            id="posted_at"
                                            type="date"
                                            value={data.posted_at}
                                            onChange={(e) => setData('posted_at', e.target.value)}
                                            className={errors.posted_at ? 'border-destructive' : ''}
                                        />
                                        {errors.posted_at && (
                                            <p className="text-sm text-destructive">{errors.posted_at}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex items-center gap-3 pt-4">
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Creating...' : 'Create Post'}
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <Link href="/posts">Cancel</Link>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
