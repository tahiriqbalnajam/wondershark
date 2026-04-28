import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import {
    FileText,
    Plus,
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    ExternalLink,
    Calendar,
    Building2,
    MessageSquare,
    Upload,
    CirclePlus,
    BarChart3,
    Bot,
    User,
    Globe
} from 'lucide-react';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type Post = {
    id: number;
    title: string;
    url: string;
    description?: string;
    status: 'Published' | 'Draft' | 'Archived';
    posted_at: string;
    created_at: string;
    post_type: string;
    brand: {
        id: number;
        name: string;
    };
    user: {
        id: number;
        name: string;
    };
    citations_count: number;
    mentioned_in_ai: number;
    citation_urls: string[];
    citations?: Array<{
        id: number;
        ai_model: string;
        ai_model_details: any;
        is_mentioned: boolean;
        metadata: any;
        prompt_results: Array<{
            id: number;
            prompt_text: string;
            is_mentioned: boolean;
            citation_url: string | null;
            resources: string[];
            raw_response: string;
            confidence: number;
            checked_at: string;
        }>;
    }>;
};

type FormData = {
    title: string;
    url: string;
    description: string;
    brand_id: string;
    status: string;
    posted_at: string;
    post_type: string;
};

type Props = {
    posts: {
        data: Post[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    brand?: {
        id: number;
        name: string;
    };
};

const getBreadcrumbs = (brand?: { id: number; name: string }): BreadcrumbItem[] => {
    if (brand) {
        return [
            {
                title: 'Brands',
                href: '/brands',
            },
            {
                title: brand.name,
                href: `/brands/${brand.id}`,
            },
            {
                title: 'Posts',
                href: `/brands/${brand.id}/posts`,
            },
        ];
    }
    return [
        {
            title: 'Posts',
            href: '/posts',
        },
    ];
};

export default function PostsIndex({ posts, brand }: Props) {
    const { url } = usePage();
    const { auth } = usePage().props as any;
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const isSubscribed: boolean = !!(auth?.user?.activeSubscription);
    const isAdmin: boolean = !!(auth?.roles?.includes('admin'));
    const canCreatePost = isAdmin || isSubscribed;
    const brandId = urlParams.get('brand_id');

    // Construct the create post URL - use brand-specific route if brand prop exists
    const createPostUrl = brand ? `/brands/${brand.id}/posts/create` : (brandId ? `/posts/create?brand_id=${brandId}` : '/posts/create');
    const storeUrl = brand ? `/brands/${brand.id}/posts` : '/posts';

    const { data, setData, post, processing, errors } = useForm<FormData>({
        title: '',
        url: '',
        description: '',
        brand_id: brandId || '',
        status: 'draft',
        posted_at: new Date().toISOString().split('T')[0],
        post_type: 'blog',
    });

    // Helper to get favicon URL from citation URL
    const getFaviconUrl = (citationUrl: string) => {
        try {
            const urlObj = new URL(citationUrl);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=16`;
        } catch (e) {
            return '';
        }
    };

    const [selectedCitation, setSelectedCitation] = useState<any | null>(null);
    const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
    const [isCreatePostOpen, setIsCreatePostOpenRaw] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Wrap setIsCreatePostOpen to clear messages when closing
    const setIsCreatePostOpen = (open: boolean) => {
        if (!open) {
            setSubmitMessage(null);
            setSubmitError(null);
            // Reset form fields to initial values
            setData({
                title: '',
                url: '',
                description: '',
                brand_id: brandId || '',
                status: 'draft',
                posted_at: new Date().toISOString().split('T')[0],
                post_type: 'blog',
            });
        }
        setIsCreatePostOpenRaw(open);
    };

    const handleCitationClick = (citation: any) => {
        setSelectedCitation(citation);
        setIsCitationModalOpen(true);
    };

    // Helper: clean raw response for display
    const cleanAiResponse = (response: string | undefined): string => {
        if (!response) return '';
        // Strip markdown code fences
        let cleaned = response
            .replace(/HTML_RESPONSE_START/gi, '')
            .replace(/HTML_RESPONSE_END/gi, '')
            .replace(/^```(?:json)?\s*/gm, '')
            .replace(/^```\s*$/gm, '');
        // If it looks like raw JSON, try to extract a meaningful string field, otherwise hide it
        const trimmed = cleaned.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                const text = parsed.search_context || parsed.citation_text || parsed.referrer_url || null;
                return text ? `<p>${text}</p>` : '<p class="italic text-muted-foreground">Response was a structured data object.</p>';
            } catch {
                return '<p class="italic text-muted-foreground">Response could not be displayed.</p>';
            }
        }
        return `<p class="whitespace-pre-wrap">${cleaned.trim()}</p>`;
    };

    // Helper: render citations cell
    const renderCitationsCell = (post: Post) => {
        const hasCitations = post.citations && post.citations.length > 0;
        if (!hasCitations) {
            return <span className="text-xs text-muted-foreground">No citations</span>;
        }

        const validCitations = post.citations!.filter((citation) => {
            const resources = citation.metadata?.resources || [];
            if (!resources || resources.length === 0) return false;

            // Post is a resource if its URL is in the resources
            // Strip scheme and query string for loose match
            const postMatchPattern = post.url.replace(/^https?:\/\//, '').split('?')[0].replace(/\/$/, '');
            return resources.some((r: string) => r.includes(postMatchPattern));
        });

        if (validCitations.length === 0) {
            return <span className="text-xs text-muted-foreground">No AI model matches</span>;
        }

        return (
            <div className="flex items-center gap-2 flex-wrap">
                {validCitations.map((citation, index) => {
                    const aiDetails = citation.ai_model_details;
                    return (
                        <div
                            key={index}
                            onClick={() => handleCitationClick({ ...citation, post })}
                            className="cursor-pointer hover:opacity-80 transition-opacity border rounded shadow-sm px-2 py-1 flex items-center gap-1.5 bg-white"
                            title={aiDetails?.display_name || citation.ai_model}
                        >
                            {aiDetails?.icon ? (
                                <img src={`/storage/${aiDetails.icon}`} alt={aiDetails.display_name} className="w-5 h-5 object-contain" />
                            ) : (
                                <Bot className="h-5 w-5 text-gray-500" />
                            )}
                          {/*   <span className="text-xs font-medium text-gray-700">
                                {aiDetails?.display_name || citation.ai_model}
                            </span> */}
                        </div>
                    );
                })}
            </div>
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-800';
            case 'draft':
                return 'bg-yellow-100 text-yellow-800';
            case 'archived':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleDelete = (postId: number) => {
        if (confirm('Are you sure you want to delete this post?')) {
            router.delete(`/posts/${postId}`, {
                preserveScroll: true,
            });
        }
    };

    const handleStartAnalysis = async (postId: number) => {
        try {
            const response = await fetch('/search-analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    post_id: postId,
                    country: 'US'
                })
            });

            if (response.ok) {
                const data = await response.json();
                alert('Industry analysis started successfully! You can view progress in Search Analytics.');
                // Optionally redirect to search analytics
                router.visit('/search-analytics');
            } else {
                const error = await response.json();
                alert('Error starting analysis: ' + (error.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error starting analysis:', error);
            alert('Error starting analysis. Please try again.');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitMessage(null);
        setSubmitError(null);
        post(storeUrl, {
            onSuccess: (response: any) => {
                setSubmitMessage('Post created successfully!');
                setIsCreatePostOpen(false);
                // Assuming the response has the post data, redirect to post page
                if (response.props?.post?.id) {
                    //router.visit(`/posts/${response.props.post.id}`);

                      setSubmitMessage('Post created successfully!');
                        //setIsCreatePostOpen(false);
                        router.visit(storeUrl);
                        //setTimeout(() => router.visit(storeUrl), 2000);

                } else {
                    router.reload();
                }
            },
            onError: (errors: any) => {
                const errorMessages = Object.values(errors).flat().join(', ');
                setSubmitError(errorMessages || 'Failed to create post. Please try again.');
            },
        });
    };

    // Pagination handlers
    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(window.location.search);
        params.set('page', String(page));
        router.visit(window.location.pathname + '?' + params.toString(), { preserveScroll: true });
    };

    // Pagination summary helpers
    const startIdx = (posts.current_page - 1) * posts.per_page + 1;
    const endIdx = Math.min(posts.current_page * posts.per_page, posts.total);

    return (
        <AppLayout breadcrumbs={getBreadcrumbs(brand)}>
            <Head title={brand ? `${brand.name} - Posts` : "Posts"} />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <HeadingSmall
                        title="Posts"
                        description="Manage posts and track their AI citations"
                    />

                    <div className="flex gap-3">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <Button
                                            onClick={() => canCreatePost && setIsCreatePostOpen(true)}
                                            className='primary-btn'
                                            disabled={!canCreatePost}
                                        >
                                            <CirclePlus className="h-4 w-4 mr-2" />
                                            Create Post
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                {!canCreatePost && (
                                    <TooltipContent>
                                        <p>Add Post is a premium feature. Subscribe to a plan to create posts.</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            All Posts ({posts.total})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {posts.data.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                                <p className="text-sm mb-4">
                                    Get started by creating your first post.
                                </p>
                                {/* <div className="inline-block">
                                    <Button asChild className='primary-btn'>
                                        <Link href={createPostUrl}>
                                            <CirclePlus className="h-4 w-4 mr-2" />
                                            Add Post
                                        </Link>
                                    </Button>
                                </div> */}
                            </div>
                        ) : (
                            <Tabs defaultValue="all-posts">
                                <TabsList className='add-prompt-lists border inline-flex mb-3'>
                                    <TabsTrigger value="all-posts">All Posts</TabsTrigger>
                                    <TabsTrigger value="blogs">Blogs</TabsTrigger>
                                    <TabsTrigger value="forums">Forums</TabsTrigger>
                                    <TabsTrigger value="ugc">UGC</TabsTrigger>
                                </TabsList>

                                <TabsContent value="all-posts">
                                    <Table className="default-table table-fixed">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className='text-center'>#</TableHead>
                                                <TableHead>Publication</TableHead>
                                                {/* <TableHead>Brand</TableHead> */}
                                                <TableHead>Status</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>AI Citations</TableHead>
                                                <TableHead>Posted Date</TableHead>
                                                {/* <TableHead className="w-5"></TableHead> */}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {posts.data.map((post, index) => (
                                                <TableRow key={post.id}>
                                                    <TableCell className='text-center'>{(posts.current_page - 1) * posts.per_page + index + 1}</TableCell>
                                                    {/* <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="font-medium">
                                                                {post.title || 'Untitled Post'}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                <ExternalLink className="h-3 w-3" />
                                                                <a 
                                                                    href={post.url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="hover:text-primary truncate max-w-60"
                                                                >
                                                                    {post.url}
                                                                </a>
                                                            </div>
                                                            {post.description && (
                                                                <div className="text-xs text-muted-foreground line-clamp-1">
                                                                    {post.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell> */}
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div>
                                                                <span className="font-medium">{post.title}</span>
                                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                    <ExternalLink className="h-3 w-3" />
                                                                    <a
                                                                        href={post.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="hover:text-primary truncate max-w-60"
                                                                    >
                                                                        {post.url}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7em' }}>
                                                            <Badge className={getStatusColor(post.status)}>
                                                                {post.status === 'draft' ? (
                                                                    'Processing'
                                                                ) : (
                                                                    post.status
                                                                )}
                                                            </Badge>
                                                            {post.status === 'draft' && (
                                                                <span className="inline-block align-middle" style={{ width: 18, height: 18, position: 'relative', verticalAlign: 'middle' }}>
                                                                    {[...Array(12)].map((_, i) => (
                                                                        <span
                                                                            key={i}
                                                                            style={{
                                                                                position: 'absolute',
                                                                                left: '50%',
                                                                                top: '50%',
                                                                                width: 3,
                                                                                height: 8,
                                                                                background: '#000',
                                                                                borderRadius: 1,
                                                                                transform: `rotate(${i * 30}deg) translate(0, -7px)`,
                                                                                opacity: 0.2,
                                                                                animation: `fade-spinner 1.2s linear infinite`,
                                                                                animationDelay: `${i * 0.1}s`,
                                                                            }}
                                                                        />
                                                                    ))}
                                                                    <style>{`
                                                                        @keyframes fade-spinner {
                                                                            0% { opacity: 1; }
                                                                            100% { opacity: 0.2; }
                                                                        }
                                                                    `}</style>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {post.post_type === 'ugc' ? 'UGC' : post.post_type === 'blog' ? 'Blog' : post.post_type === 'forum' ? 'Forum' : post.post_type}
                                                    </TableCell>

                                                    <TableCell>
                                                        {renderCitationsCell(post)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDate(post.created_at)}
                                                        </div>
                                                    </TableCell>
                                                    {/* <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/posts/${post.id}`}>
                                                                        <Eye className="h-4 w-4 mr-2" />
                                                                        View Details
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/posts/${post.id}/edit`}>
                                                                        <Edit className="h-4 w-4 mr-2" />
                                                                        Edit
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/posts/${post.id}/manage-prompts`}>
                                                                        <MessageSquare className="h-4 w-4 mr-2" />
                                                                        Manage Prompts
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStartAnalysis(post.id)}>
                                                                    <BarChart3 className="h-4 w-4 mr-2" />
                                                                    Industry Analysis
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem 
                                                                    onClick={() => handleDelete(post.id)}
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell> */}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                <TabsContent value="blogs">
                                    <Table className="default-table table-fixed">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className='text-center'>#</TableHead>
                                                <TableHead>Publication</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>AI Citations</TableHead>
                                                <TableHead>Posted Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {posts.data
                                                .filter(post => post.post_type === 'blog')
                                                .map((post, index) => (
                                                    <TableRow key={post.id}>
                                                        <TableCell className='text-center'>{(posts.current_page - 1) * posts.per_page + index + 1}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div>
                                                                    <span className="font-medium">{post.title}</span>
                                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                        <ExternalLink className="h-3 w-3" />
                                                                        <a
                                                                            href={post.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="hover:text-primary truncate max-w-60"
                                                                        >
                                                                            {post.url}
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7em' }}>
                                                                <Badge className={getStatusColor(post.status)}>
                                                                    {post.status === 'draft' ? (
                                                                        'Processing'
                                                                    ) : (
                                                                        post.status
                                                                    )}
                                                                </Badge>
                                                                {post.status === 'draft' && (
                                                                    <span className="inline-block align-middle" style={{ width: 18, height: 18, position: 'relative', verticalAlign: 'middle' }}>
                                                                        {[...Array(12)].map((_, i) => (
                                                                            <span
                                                                                key={i}
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    left: '50%',
                                                                                    top: '50%',
                                                                                    width: 3,
                                                                                    height: 8,
                                                                                    background: '#000',
                                                                                    borderRadius: 1,
                                                                                    transform: `rotate(${i * 30}deg) translate(0, -7px)`,
                                                                                    opacity: 0.2,
                                                                                    animation: `fade-spinner 1.2s linear infinite`,
                                                                                    animationDelay: `${i * 0.1}s`,
                                                                                }}
                                                                            />
                                                                        ))}
                                                                        <style>{`
                                                                            @keyframes fade-spinner {
                                                                                0% { opacity: 1; }
                                                                                100% { opacity: 0.2; }
                                                                            }
                                                                        `}</style>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {post.post_type}
                                                        </TableCell>
                                                        <TableCell>
                                                            {renderCitationsCell(post)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                <Calendar className="h-3 w-3" />
                                                                {formatDate(post.created_at)}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                <TabsContent value="forums">
                                    <Table className="default-table table-fixed">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className='text-center'>#</TableHead>
                                                <TableHead>Publication</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>AI Citations</TableHead>
                                                <TableHead>Posted Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {posts.data
                                                .filter(post => post.post_type === 'forum')
                                                .map((post, index) => (
                                                    <TableRow key={post.id}>
                                                        <TableCell className='text-center'>{(posts.current_page - 1) * posts.per_page + index + 1}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div>
                                                                    <span className="font-medium">{post.title}</span>
                                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                        <ExternalLink className="h-3 w-3" />
                                                                        <a
                                                                            href={post.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="hover:text-primary truncate max-w-60"
                                                                        >
                                                                            {post.url}
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7em' }}>
                                                                <Badge className={getStatusColor(post.status)}>
                                                                    {post.status === 'draft' ? (
                                                                        'Processing'
                                                                    ) : (
                                                                        post.status
                                                                    )}
                                                                </Badge>
                                                                {post.status === 'draft' && (
                                                                    <span className="inline-block align-middle" style={{ width: 18, height: 18, position: 'relative', verticalAlign: 'middle' }}>
                                                                        {[...Array(12)].map((_, i) => (
                                                                            <span
                                                                                key={i}
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    left: '50%',
                                                                                    top: '50%',
                                                                                    width: 3,
                                                                                    height: 8,
                                                                                    background: '#000',
                                                                                    borderRadius: 1,
                                                                                    transform: `rotate(${i * 30}deg) translate(0, -10px)`,
                                                                                    opacity: 0.2,
                                                                                    animation: `fade-spinner 1.2s linear infinite`,
                                                                                    animationDelay: `${i * 0.1}s`,
                                                                                }}
                                                                            />
                                                                        ))}
                                                                        <style>{`
                                                                            @keyframes fade-spinner {
                                                                                0% { opacity: 1; }
                                                                                100% { opacity: 0.2; }
                                                                            }
                                                                        `}</style>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {post.post_type}
                                                        </TableCell>
                                                        <TableCell>
                                                            {renderCitationsCell(post)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                <Calendar className="h-3 w-3" />
                                                                {formatDate(post.created_at)}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                <TabsContent value="ugc">
                                    <Table className="default-table table-fixed">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className='text-center'>#</TableHead>
                                                <TableHead>Publication</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>AI Citations</TableHead>
                                                <TableHead>Posted Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {posts.data
                                                .filter(post => post.post_type === 'ugc')
                                                .map((post, index) => (
                                                    <TableRow key={post.id}>
                                                        <TableCell className='text-center'>{(posts.current_page - 1) * posts.per_page + index + 1}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div>
                                                                    <span className="font-medium">{post.title}</span>
                                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                        <ExternalLink className="h-3 w-3" />
                                                                        <a
                                                                            href={post.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="hover:text-primary truncate max-w-60"
                                                                        >
                                                                            {post.url}
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7em' }}>
                                                                <Badge className={getStatusColor(post.status)}>
                                                                    {post.status === 'draft' ? 'Processing' : post.status}
                                                                </Badge>
                                                                {post.status === 'draft' && (
                                                                    <span className="inline-block align-middle" style={{ width: 18, height: 18, position: 'relative', verticalAlign: 'middle' }}>
                                                                        {[...Array(12)].map((_, i) => (
                                                                            <span
                                                                                key={i}
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    left: '50%',
                                                                                    top: '50%',
                                                                                    width: 3,
                                                                                    height: 8,
                                                                                    background: '#000',
                                                                                    borderRadius: 1,
                                                                                    transform: `rotate(${i * 30}deg) translate(0, -7px)`,
                                                                                    opacity: 0.2,
                                                                                    animation: `fade-spinner 1.2s linear infinite`,
                                                                                    animationDelay: `${i * 0.1}s`,
                                                                                }}
                                                                            />
                                                                        ))}
                                                                        <style>{`
                                                                            @keyframes fade-spinner {
                                                                                0% { opacity: 1; }
                                                                                100% { opacity: 0.2; }
                                                                            }
                                                                        `}</style>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>UGC</TableCell>
                                                        <TableCell>
                                                            {renderCitationsCell(post)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                <Calendar className="h-3 w-3" />
                                                                {formatDate(post.created_at)}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            {posts.data.filter(post => post.post_type === 'ugc').length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                        No UGC posts found
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination Controls (Admin Style) */}
                {posts.last_page > 1 && (
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 px-2 py-4 mt-6">
                        <div className="text-sm text-muted-foreground mb-2 md:mb-0">
                            Showing {startIdx} to {endIdx} of {posts.total} posts
                        </div>
                        <div className="flex items-center space-x-2">
                            {posts.current_page > 1 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(posts.current_page - 1)}
                                >
                                    Previous
                                </Button>
                            )}
                            {posts.current_page < posts.last_page && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(posts.current_page + 1)}
                                >
                                    Next
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>


            {/* Citation Details Modal */}
            <Dialog open={isCitationModalOpen} onOpenChange={setIsCitationModalOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ width: '90vw', maxWidth: '90vw' }}>
                    {selectedCitation && (
                        <>
                            {/* AI Model Header */}
                            {selectedCitation.ai_model_details && (
                                <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                                    {selectedCitation.ai_model_details.icon ? (
                                        <img
                                            src={`/storage/${selectedCitation.ai_model_details.icon}`}
                                            alt={selectedCitation.ai_model_details.display_name}
                                            className="w-5 h-5 object-contain rounded"
                                            onError={(e) => e.currentTarget.style.display = 'none'}
                                        />
                                    ) : (
                                        <Bot className="h-5 w-5 text-primary" />
                                    )}
                                    <span className="font-medium text-sm">
                                        Analyzed by {selectedCitation.ai_model_details.display_name}
                                    </span>
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {selectedCitation.prompt_results?.length || 0} prompt(s) analyzed
                                    </span>
                                </div>
                            )}

                            {/* Post URL highlight */}
                            <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                                <Globe className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                <a
                                    href={selectedCitation.post.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-700 font-medium truncate hover:underline"
                                    title={selectedCitation.post.url}
                                >
                                    {selectedCitation.post.url}
                                </a>
                            </div>

                            {/* Individual Prompt Results */}
                            <div className="space-y-6">
                                {(selectedCitation.prompt_results || []).map((pr: any, idx: number) => {
                                    const postMatchPattern = selectedCitation.post.url
                                        .replace(/^https?:\/\//, '').split('?')[0].replace(/\/$/, '');
                                    const isPostInResources = (pr.resources || []).some((r: string) => r.includes(postMatchPattern));

                                    return (
                                        <div key={pr.id || idx} className="border rounded-xl overflow-hidden shadow-sm">
                                            {/* Prompt header */}
                                            <div className="flex items-start justify-between gap-2 bg-muted/40 px-4 py-3 border-b">
                                                <div className="flex items-start gap-2">
                                                    <User className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                                    <p className="text-sm font-medium text-foreground">{pr.prompt_text || 'No prompt text'}</p>
                                                </div>
                                                {pr.is_mentioned ? (
                                                    <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 border border-green-300 rounded-full px-2 py-0.5">
                                                        ✓ Cited
                                                    </span>
                                                ) : (
                                                    <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                                                        Not cited
                                                    </span>
                                                )}
                                            </div>

                                            {/* AI Response */}
                                            <div className="flex items-start gap-3 px-4 py-4">
                                                <div className="flex-shrink-0">
                                                    {selectedCitation.ai_model_details?.icon ? (
                                                        <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center p-1">
                                                            <img
                                                                src={`/storage/${selectedCitation.ai_model_details.icon}`}
                                                                alt={selectedCitation.ai_model_details.display_name}
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <Bot className="h-4 w-4 text-primary" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 text-sm text-muted-foreground">
                                                    {pr.raw_response ? (
                                                        <div
                                                            className="prose prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: cleanAiResponse(pr.raw_response) }}
                                                        />
                                                    ) : (
                                                        <p className="italic">No AI response recorded.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Resources for this prompt */}
                                            {pr.resources && pr.resources.length > 0 && (
                                                <div className="border-t bg-gray-50 px-4 py-3">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-2">Resources</p>
                                                    <div className="space-y-1">
                                                        {pr.resources.map((url: string, rIdx: number) => {
                                                            const cleanDomain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
                                                            const isHighlighted = url.includes(postMatchPattern);
                                                            return (
                                                                <div
                                                                    key={rIdx}
                                                                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                                                    className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 cursor-pointer hover:bg-gray-100 transition-colors ${isHighlighted ? 'bg-blue-50 ring-1 ring-blue-300 font-semibold text-blue-700' : 'text-gray-600'
                                                                        }`}
                                                                >
                                                                    <img
                                                                        src={`https://img.logo.dev/${cleanDomain}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`}
                                                                        alt={cleanDomain}
                                                                        className="w-4 h-4 object-contain flex-shrink-0"
                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    />
                                                                    <span className="truncate" title={url}>{isHighlighted ? '★ ' : ''}{cleanDomain}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {(!selectedCitation.prompt_results || selectedCitation.prompt_results.length === 0) && (
                                    <p className="text-sm text-muted-foreground text-center py-6">No individual prompt results available yet.</p>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Post Drawer */}
            <Drawer open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen} direction="right">
                <DrawerContent className="!inset-auto !right-0 !top-0 !bottom-0 !left-auto w-[500px] !rounded-l-lg !rounded-r-none">
                    <DrawerHeader>
                        <DrawerTitle>Create Post</DrawerTitle>
                        <DrawerDescription>
                            Fill in the details to create a new post.
                        </DrawerDescription>
                    </DrawerHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 p-6">
                        {submitError && (
                            <Alert variant="destructive">
                                <AlertDescription>{submitError}</AlertDescription>
                            </Alert>
                        )}
                        {submitMessage && (
                            <Alert>
                                <AlertDescription>{submitMessage}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="url">URL *</Label>
                            <Input
                                id="url"
                                type="url"
                                value={data.url}
                                onChange={(e) => setData('url', e.target.value)}
                                placeholder="https://example.com/post"
                                className={errors.url ? 'border-red-500' : ''}
                            />
                            {errors.url && <p className="text-sm text-red-500">{errors.url}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="post_type">Post Type *</Label>
                            <Select
                                value={data.post_type}
                                onValueChange={(v) => setData('post_type', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select post type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="blog">Blog</SelectItem>
                                    <SelectItem value="forum">Forum</SelectItem>
                                    <SelectItem value="ugc">User Generated Content (UGC)</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.post_type && <p className="text-sm text-red-500">{errors.post_type}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Title (optional)</Label>
                            <Input
                                id="title"
                                type="text"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                placeholder="Post title"
                                className={errors.title ? 'border-red-500' : ''}
                            />
                            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="posted_at">Posted Date</Label>
                            <Input
                                id="posted_at"
                                type="date"
                                value={data.posted_at}
                                onChange={(e) => setData('posted_at', e.target.value)}
                            />
                        </div>

                        <DrawerFooter>
                            <Button type="submit" disabled={processing} className="primary-btn">
                                Create Post
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </form>
                </DrawerContent>
            </Drawer>

        </AppLayout>
    );
}
