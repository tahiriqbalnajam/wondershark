import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import FormattedDate from '@/components/FormattedDate';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import {
    FileText,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    Search,
    Filter,
} from 'lucide-react';

type Prompt = {
    id: number;
    prompt: string;
    source: string;
    ai_provider: string | null;
    ai_model_id: number | null;
    order: number;
    status: string;
    visibility: string | number | null;
    position: number | null;
    sentiment: string | number | null;
    volume: string | null;
    analysis_completed_at: string | null;
    analysis_failed_at: string | null;
    analysis_error: string | null;
};

type PostSummary = {
    id: number;
    title: string;
    url: string;
    status: string;
    created_at: string;
    brand: {
        id: number;
        name: string;
        agency?: {
            id: number;
            name: string;
        } | null;
    };
    prompts: Prompt[];
    prompts_summary: {
        total: number;
        analyzed: number;
        failed: number;
        never_analyzed: number;
    };
    last_analyzed_at: string | null;
    last_failed_at: string | null;
};

type Agency = {
    id: number;
    name: string;
};

type Brand = {
    id: number;
    name: string;
    agency_id: number;
};

type AiModel = {
    id: number;
    name: string;
    display_name: string;
};

type Filters = {
    search?: string;
    status?: string;
    agency_id?: string;
    brand_id?: string;
    has_failed?: boolean;
};

type Props = {
    posts: {
        data: PostSummary[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: Filters;
    agencies: Agency[];
    brands: Brand[];
    aiModels: AiModel[];
    flash?: {
        success?: string;
        error?: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'View Prompts Status', href: '/admin/post-prompts' },
];

export default function PostPromptsIndex({ posts, filters, agencies, brands, aiModels, flash }: Props) {
    // Only keep local state for search debounce and expanded rows.
    // All other filters read directly from the `filters` prop since the page reloads on change.
    const [searchInput, setSearchInput] = useState(filters.search || '');
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

    const handleFilter = (updates: Partial<Filters>) => {
        const filterData: Record<string, string | boolean | undefined> = {};

        const nextSearch = updates.search !== undefined ? updates.search : filters.search;
        const nextStatus = updates.status !== undefined ? updates.status : filters.status;
        const nextAgency = updates.agency_id !== undefined ? updates.agency_id : filters.agency_id;
        const nextBrand = updates.brand_id !== undefined ? updates.brand_id : filters.brand_id;
        const nextFailed = updates.has_failed !== undefined ? updates.has_failed : filters.has_failed;

        if (nextSearch) filterData.search = nextSearch;
        if (nextStatus && nextStatus !== 'all') filterData.status = nextStatus;
        if (nextAgency && nextAgency !== 'all') filterData.agency_id = String(nextAgency);
        if (nextBrand && nextBrand !== 'all') filterData.brand_id = String(nextBrand);
        if (nextFailed) filterData.has_failed = true;

        router.get('/admin/post-prompts', filterData, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearch = (value: string) => {
        setSearchInput(value);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            handleFilter({ search: value || undefined });
        }, 300);
    };

    const clearFilters = () => {
        setSearchInput('');
        router.get('/admin/post-prompts', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleAiModelChange = (promptId: number, aiModelId: string) => {
        router.put(`/admin/post-prompts/prompts/${promptId}/ai-model`, {
            ai_model_id: Number(aiModelId),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('AI model updated');
            },
            onError: () => {
                toast.error('Failed to update AI model');
            },
        });
    };

    const togglePost = (postId: number) => {
        setExpandedPosts((prev) => {
            const next = new Set(prev);
            if (next.has(postId)) {
                next.delete(postId);
            } else {
                next.add(postId);
            }
            return next;
        });
    };

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(window.location.search);
        params.set('page', String(page));
        router.visit(window.location.pathname + '?' + params.toString(), { preserveScroll: true });
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
            published: { variant: 'default', label: 'Published' },
            draft: { variant: 'secondary', label: 'Draft' },
            archived: { variant: 'outline', label: 'Archived' },
        };
        const c = config[status] || { variant: 'secondary', label: status };
        return <Badge variant={c.variant}>{c.label}</Badge>;
    };

    const getPromptStatusBadge = (promptStatus: string, postStatus: string) => {
        // Show as Active when the parent post is published
        if (postStatus === 'published') {
            return <Badge variant="default">Active</Badge>;
        }
        const config: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
            suggested: { variant: 'secondary', label: 'Suggested' },
            active: { variant: 'default', label: 'Active' },
            inactive: { variant: 'outline', label: 'Inactive' },
        };
        const c = config[promptStatus] || { variant: 'secondary', label: promptStatus };
        return <Badge variant={c.variant}>{c.label}</Badge>;
    };

    const getAiProviderDisplay = (prompt: Prompt) => {
        if (!prompt.ai_provider) {
            return <span className="text-muted-foreground">—</span>;
        }
        const model = aiModels.find((m) => m.name === prompt.ai_provider || m.id === prompt.ai_model_id);
        const logoPath = `/images/ai-models/${prompt.ai_provider}.svg`;
        return (
            <img
                src={logoPath}
                alt={model?.display_name || prompt.ai_provider}
                title={model?.display_name || prompt.ai_provider}
                className="w-6 h-6 rounded-full bg-white border"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
        );
    };

    const agencyId = filters.agency_id || 'all';
    const filteredBrands = agencyId !== 'all'
        ? brands.filter((b) => String(b.agency_id) === String(agencyId))
        : brands;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Post Prompt Analytics - Admin" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <HeadingSmall
                        title="Post Prompt Analytics"
                        description="View and verify AI-generated prompts and their analysis status for each post."
                    />
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                            {/*!
                            <div className="space-y-2">
                                <Label htmlFor="search">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        placeholder="Search by post"
                                        value={searchInput}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            */}

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={filters.status || 'all'}
                                    onValueChange={(value) => handleFilter({ status: value })}
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="agency_id">Agency</Label>
                                <Select
                                    value={String(filters.agency_id || 'all')}
                                    onValueChange={(value) => handleFilter({ agency_id: value, brand_id: 'all' })}
                                >
                                    <SelectTrigger id="agency_id">
                                        <SelectValue placeholder="All agencies" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All agencies</SelectItem>
                                        {agencies.map((agency) => (
                                            <SelectItem key={agency.id} value={String(agency.id)}>
                                                {agency.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="brand_id">Brand</Label>
                                <Select
                                    value={String(filters.brand_id || 'all')}
                                    onValueChange={(value) => handleFilter({ brand_id: value })}
                                >
                                    <SelectTrigger id="brand_id">
                                        <SelectValue placeholder="All brands" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All brands</SelectItem>
                                        {filteredBrands.map((brand) => (
                                            <SelectItem key={brand.id} value={String(brand.id)}>
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-4">
                                {/*!
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="has_failed"
                                        checked={filters.has_failed || false}
                                        onCheckedChange={(checked) => {
                                            handleFilter({ has_failed: checked === true });
                                        }}
                                    />
                                    <Label htmlFor="has_failed" className="text-sm font-normal cursor-pointer">
                                        Has failed prompts
                                    </Label>
                                </div>
                                */}
                                <Button variant="outline" size="sm" onClick={clearFilters}>
                                    <Filter className="w-4 h-4 mr-1" />
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Posts ({posts.total})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            {/* Table header */}
                            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
                                <div className="col-span-4">Post</div>
                                <div className="col-span-2">Brand / Agency</div>
                                <div className="col-span-1">Status</div>
                                <div className="col-span-1 text-center">Total</div>
                                <div className="col-span-1 text-center">Analyzed</div>
                                <div className="col-span-1 text-center">Failed</div>
                                <div className="col-span-1 text-center">Never Analyzed</div>
                                <div className="col-span-1 text-right">Expand</div>
                            </div>

                            {posts.data.length === 0 && (
                                <div className="px-4 py-8 text-center text-muted-foreground">
                                    No posts found matching your filters.
                                </div>
                            )}

                            {posts.data.map((post) => {
                                const isExpanded = expandedPosts.has(post.id);
                                return (
                                    <div key={post.id} className="border-b last:border-b-0">
                                        {/* Post summary row */}
                                        <div
                                            className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/30 cursor-pointer transition-colors"
                                            onClick={() => togglePost(post.id)}
                                        >
                                            <div className="col-span-4">
                                                <div className="font-medium max-w-sm truncate" title={post.title}>
                                                    {post.title || 'Untitled'}
                                                </div>
                                                <div className="text-xs text-muted-foreground max-w-sm truncate">
                                                    {post.url}
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="font-medium">{post.brand.name}</div>
                                                {post.brand.agency && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {post.brand.agency.name}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-span-1">{getStatusBadge(post.status)}</div>
                                            <div className="col-span-1 text-center font-medium">
                                                {post.prompts_summary.total}
                                            </div>
                                            <div className="col-span-1 text-center">
                                                <span className="inline-flex items-center gap-1 text-green-600">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    {post.prompts_summary.analyzed}
                                                </span>
                                            </div>
                                            <div className="col-span-1 text-center">
                                                {post.prompts_summary.failed > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        {post.prompts_summary.failed}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">0</span>
                                                )}
                                            </div>
                                            <div className="col-span-1 text-center">
                                                {post.prompts_summary.never_analyzed > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-amber-600">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {post.prompts_summary.never_analyzed}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">0</span>
                                                )}
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePost(post.id);
                                                    }}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Expanded prompts detail */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 bg-muted/20">
                                                <div className="border rounded-md bg-background overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/40">
                                                                <TableHead className="w-10">#</TableHead>
                                                                <TableHead>Prompt</TableHead>
                                                                <TableHead>AI Provider</TableHead>
                                                                <TableHead>Status</TableHead>
                                                                <TableHead>Analyzed</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {post.prompts.length === 0 && (
                                                                <TableRow>
                                                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                                                                        No prompts found.
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                            {post.prompts.map((prompt, idx) => (
                                                                <TableRow key={prompt.id}>
                                                                    <TableCell className="text-muted-foreground">
                                                                        {idx + 1}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="max-w-md truncate font-medium" title={prompt.prompt}>
                                                                            {prompt.prompt}
                                                                        </div>
                                                                        {prompt.analysis_error && (
                                                                            <div className="flex items-start gap-1 mt-1 text-xs text-red-600">
                                                                                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                                                                <span className="line-clamp-2">{prompt.analysis_error}</span>
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Select
                                                                            value={String(prompt.ai_model_id ?? prompt.ai_provider ?? '')}
                                                                            onValueChange={(value) => handleAiModelChange(prompt.id, value)}
                                                                        >
                                                                            <SelectTrigger className="w-36 h-8 text-xs">
                                                                                <SelectValue placeholder="Select model" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {aiModels.map((model) => (
                                                                                    <SelectItem key={model.id} value={String(model.id)}>
                                                                                        {model.display_name}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </TableCell>
                                                                    <TableCell>{getPromptStatusBadge(prompt.status, post.status)}</TableCell>
                                                                    <TableCell>
                                                                        {prompt.analysis_completed_at ? (
                                                                            <FormattedDate date={prompt.analysis_completed_at} format="datetime" />
                                                                        ) : (
                                                                            <span className="text-muted-foreground">—</span>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {posts.last_page > 1 && (
                            <div className="flex items-center justify-between px-2 py-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {((posts.current_page - 1) * posts.per_page) + 1} to{' '}
                                    {Math.min(posts.current_page * posts.per_page, posts.total)} of{' '}
                                    {posts.total} posts
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={posts.current_page <= 1}
                                        onClick={() => handlePageChange(posts.current_page - 1)}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {posts.current_page} of {posts.last_page}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={posts.current_page >= posts.last_page}
                                        onClick={() => handlePageChange(posts.current_page + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
