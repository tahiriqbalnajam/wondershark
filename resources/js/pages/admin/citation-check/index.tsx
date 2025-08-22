import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Search, 
    Play, 
    Eye, 
    RefreshCw, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ExternalLink,
    Filter,
    MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface Post {
    id: number;
    title: string;
    url: string;
    status: string;
    brand: {
        id: number;
        name: string;
    };
    user: {
        name: string;
    };
    citations: Array<{
        id: number;
        ai_model: string;
        is_mentioned: boolean;
        position: number | null;
        checked_at: string;
        metadata?: {
            success?: boolean;
            prompts_analyzed?: number;
            prompts_mentioning_url?: number;
            search_context?: string;
        };
    }>;
    created_at: string;
}

interface Brand {
    id: number;
    name: string;
}

interface Props {
    posts: {
        data: Post[];
        links?: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
        meta?: {
            total: number;
            current_page: number;
            last_page: number;
        };
    };
    brands: Brand[];
    filters: {
        brand_id?: string;
        status?: string;
        search?: string;
    };
}

export default function CitationCheckIndex({ posts, brands, filters }: Props) {
    const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedBrand, setSelectedBrand] = useState(filters.brand_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');

    const handleSelectPost = (postId: number, checked: boolean) => {
        if (checked) {
            setSelectedPosts(prev => [...prev, postId]);
        } else {
            setSelectedPosts(prev => prev.filter(id => id !== postId));
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedPosts(posts.data.map(post => post.id));
        } else {
            setSelectedPosts([]);
        }
    };

    const handleRunCheck = async () => {
        if (selectedPosts.length === 0) {
            toast.error('Please select at least one post to check');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/admin/citation-check/run-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    post_ids: selectedPosts
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`Citation check completed for ${selectedPosts.length} post(s)`);
                router.reload({ only: ['posts'] });
                setSelectedPosts([]);
            } else {
                toast.error(result.message || 'Citation check failed');
            }
        } catch (error) {
            toast.error('Failed to run citation check');
            console.error('Citation check error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkCheck = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/admin/citation-check/bulk-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    brand_id: selectedBrand !== 'all' ? selectedBrand : null,
                    status: selectedStatus !== 'all' ? selectedStatus : null,
                    limit: 50
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`Bulk citation check completed for ${result.processed_count} posts`);
                router.reload({ only: ['posts'] });
            } else {
                toast.error(result.message || 'Bulk citation check failed');
            }
        } catch (error) {
            toast.error('Failed to run bulk citation check');
            console.error('Bulk citation check error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = () => {
        const params: Record<string, string> = {};
        if (searchTerm) params.search = searchTerm;
        if (selectedBrand && selectedBrand !== 'all') params.brand_id = selectedBrand;
        if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;

        router.get('/admin/citation-check', params);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedBrand('all');
        setSelectedStatus('all');
        router.get('/admin/citation-check');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-800';
            case 'draft':
                return 'bg-yellow-100 text-yellow-800';
            case 'pending':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getCitationStatus = (citations: Post['citations']) => {
        if (!citations || citations.length === 0) {
            return <Badge variant="secondary">Not Checked</Badge>;
        }

        const mentionedCount = citations.filter(c => c.is_mentioned).length;
        const totalCount = citations.length;

        if (mentionedCount > 0) {
            return (
                <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {mentionedCount}/{totalCount} Mentioned
                </Badge>
            );
        }

        return (
            <Badge className="bg-red-100 text-red-800">
                <XCircle className="w-3 h-3 mr-1" />
                Not Found
            </Badge>
        );
    };

    return (
        <AppLayout>
            <Head title="Citation Check" />

            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Citation Check</h1>
                        <p className="text-muted-foreground">
                            Verify post citations across AI models (OpenAI, Gemini, Perplexity)
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleBulkCheck}
                            disabled={isLoading}
                            variant="outline"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Bulk Check
                        </Button>
                        <Button
                            onClick={handleRunCheck}
                            disabled={isLoading || selectedPosts.length === 0}
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Run Check ({selectedPosts.length})
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <Input
                                    placeholder="Search posts..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                                />
                            </div>
                            <div>
                                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Brand" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Brands</SelectItem>
                                        {brands.map((brand) => (
                                            <SelectItem key={brand.id} value={brand.id.toString()}>
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={applyFilters} size="sm">
                                    <Search className="w-4 h-4 mr-2" />
                                    Apply
                                </Button>
                                <Button onClick={clearFilters} variant="outline" size="sm">
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Posts Table */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Posts ({posts?.meta?.total || 0})</CardTitle>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedPosts.length === posts.data.length && posts.data.length > 0}
                                    onCheckedChange={handleSelectAll}
                                />
                                <span className="text-sm text-muted-foreground">Select All</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {posts.data.map((post) => (
                                <div
                                    key={post.id}
                                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                                >
                                    <Checkbox
                                        checked={selectedPosts.includes(post.id)}
                                        onCheckedChange={(checked) => 
                                            handleSelectPost(post.id, checked as boolean)
                                        }
                                    />
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-medium truncate">
                                                    {post.title}
                                                </h3>
                                                <Badge className={getStatusColor(post.status)}>
                                                    {post.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getCitationStatus(post.citations)}
                                                <Link
                                                    href={`/admin/citation-check/${post.id}`}
                                                    className="flex items-center text-blue-600 hover:text-blue-800"
                                                    title="View Citation Results"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/posts/${post.id}/prompts`}
                                                    className="flex items-center text-green-600 hover:text-green-800"
                                                    title="Manage Prompts"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                </Link>
                                                {post.url && (
                                                    <a
                                                        href={post.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center text-gray-600 hover:text-gray-800"
                                                        title="Open Post URL"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="mt-2 text-sm text-muted-foreground">
                                            <div className="flex items-center justify-between">
                                                <span>Brand: {post.brand?.name}</span>
                                                <span>By: {post.user.name}</span>
                                            </div>
                                            {post.url && (
                                                <div className="mt-1 text-xs truncate">
                                                    URL: {post.url}
                                                </div>
                                            )}
                                        </div>

                                        {post.citations.length > 0 && (
                                            <div className="mt-2 space-y-2">
                                                <div className="flex gap-2 flex-wrap">
                                                    {post.citations.map((citation) => (
                                                        <div
                                                            key={citation.id}
                                                            className="flex items-center gap-1 text-xs"
                                                        >
                                                            <span className="font-medium capitalize">
                                                                {citation.ai_model}:
                                                            </span>
                                                            {citation.is_mentioned ? (
                                                                <Badge className="bg-green-100 text-green-800 text-xs">
                                                                    Pos {citation.position || 'N/A'}
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-red-100 text-red-800 text-xs">
                                                                    Not found
                                                                </Badge>
                                                            )}
                                                            {citation.metadata?.prompts_analyzed && (
                                                                <span className="text-muted-foreground text-xs">
                                                                    ({citation.metadata.prompts_analyzed} prompts)
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                {/* Summary of analysis */}
                                                <div className="text-xs text-muted-foreground">
                                                    {(() => {
                                                        const totalPrompts = post.citations[0]?.metadata?.prompts_analyzed || 0;
                                                        const mentioningPrompts = post.citations.reduce((sum, c) => 
                                                            sum + (c.metadata?.prompts_mentioning_url || 0), 0);
                                                        return totalPrompts > 0 ? 
                                                            `${totalPrompts} prompts analyzed, ${mentioningPrompts} total mentions` : 
                                                            'Analysis pending';
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {posts.data.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No posts found matching your criteria.
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {posts.links && posts.links.length > 0 && (
                            <div className="mt-6 flex justify-center gap-2">
                                {posts.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        className={`px-3 py-2 text-sm rounded-md ${
                                            link.active
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
