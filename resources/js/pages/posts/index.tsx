import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type Post = {
    id: number;
    title: string;
    url: string;
    description?: string;
    status: 'Published' | 'Draft' | 'Archived';
    posted_at: string;
    created_at: string;
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
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const brandId = urlParams.get('brand_id');

    // Construct the create post URL - use brand-specific route if brand prop exists
    const createPostUrl = brand ? `/brands/${brand.id}/posts/create` : (brandId ? `/posts/create?brand_id=${brandId}` : '/posts/create');

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
                        <Button asChild>
                           <Link href={createPostUrl} className='primary-btn'>
                                <CirclePlus className="h-4 w-4 mr-2" />
                                Create Post
                            </Link> 
                        </Button>
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
                                </TabsList>

                                <TabsContent value="all-posts">
                                    <Table className="default-table table-fixed">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className='text-center'>#</TableHead>
                                                <TableHead>Publication</TableHead>
                                                {/* <TableHead>Brand</TableHead> */}
                                                <TableHead>Status</TableHead>
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
                                                        <Badge className={getStatusColor(post.status)}>
                                                            {post.status}
                                                        </Badge>
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
                                                {/* <TableHead>Brand</TableHead> */}
                                                <TableHead>Status</TableHead>
                                                <TableHead>AI Citations</TableHead>
                                                <TableHead>Posted Date</TableHead>
                                                <TableHead className="w-5"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {posts.data.map((post) => (
                                                <TableRow key={post.id}>
                                                    <TableCell className='text-center'>1</TableCell>
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
                                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium">{post.brand.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={getStatusColor(post.status)}>
                                                            {post.status}
                                                        </Badge>
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
                                                    <TableCell>
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
                                                {/* <TableHead>Brand</TableHead> */}
                                                <TableHead>Status</TableHead>
                                                <TableHead>AI Citations</TableHead>
                                                <TableHead>Posted Date</TableHead>
                                                <TableHead className="w-5"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {posts.data.map((post) => (
                                                <TableRow key={post.id}>
                                                    <TableCell className='text-center'>1</TableCell>
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
                                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium">{post.brand.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={getStatusColor(post.status)}>
                                                            {post.status}
                                                        </Badge>
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
                                                    <TableCell>
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
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        )}
                    </CardContent>
                </Card>
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

        </AppLayout>
    );
}
