import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    BarChart3
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
                        {/* <Button variant="outline" asChild>
                            <Link href="/posts/agency-import">
                                <Upload className="h-4 w-4 mr-2" />
                                Import CSV
                            </Link>
                        </Button> */}
                        {/* <Button asChild>
                            <Link href={createPostUrl} className='primary-btn'>
                                <CirclePlus className="h-4 w-4 mr-2" />
                                Add Post
                            </Link>
                        </Button> */}
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
                                <div className="inline-block">
                                    <Button asChild className='primary-btn'>
                                        <Link href={createPostUrl}>
                                            <CirclePlus className="h-4 w-4 mr-2" />
                                            Add Post
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Tabs defaultValue="all-posts">
                                <TabsList className='add-prompt-lists border inline-flex mb-3'>
                                    <TabsTrigger value="all-posts">All Posts</TabsTrigger>
                                    <TabsTrigger value="blogs">Blogs</TabsTrigger>
                                    <TabsTrigger value="forums">Forums</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="all-posts">
                                    <Table className="default-table">
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
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {post.citation_urls && post.citation_urls.length > 0 ? (
                                                                <>
                                                                    {post.citation_urls.slice(0, 8).map((citationUrl, index) => (
                                                                        <a
                                                                            key={index}
                                                                            href={citationUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            title={citationUrl}
                                                                            className="hover:opacity-70 transition-opacity"
                                                                        >
                                                                            <img
                                                                                src={getFaviconUrl(citationUrl)}
                                                                                alt={`Citation ${index + 1}`}
                                                                                className="h-4 w-4"
                                                                                onError={(e) => {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        </a>
                                                                    ))}
                                                                    {post.citation_urls.length > 8 && (
                                                                        <span className="text-xs text-muted-foreground">...</span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">No citations</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDate(post.posted_at)}
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
                                    <Table className="default-table">
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
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {post.citation_urls && post.citation_urls.length > 0 ? (
                                                                <>
                                                                    {post.citation_urls.slice(0, 8).map((citationUrl, index) => (
                                                                        <a
                                                                            key={index}
                                                                            href={citationUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            title={citationUrl}
                                                                            className="hover:opacity-70 transition-opacity"
                                                                        >
                                                                            <img
                                                                                src={getFaviconUrl(citationUrl)}
                                                                                alt={`Citation ${index + 1}`}
                                                                                className="h-4 w-4"
                                                                                onError={(e) => {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        </a>
                                                                    ))}
                                                                    {post.citation_urls.length > 8 && (
                                                                        <span className="text-xs text-muted-foreground">...</span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">No citations</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDate(post.posted_at)}
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
                                    <Table className="default-table">
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
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {post.citation_urls && post.citation_urls.length > 0 ? (
                                                                <>
                                                                    {post.citation_urls.slice(0, 8).map((citationUrl, index) => (
                                                                        <a
                                                                            key={index}
                                                                            href={citationUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            title={citationUrl}
                                                                            className="hover:opacity-70 transition-opacity"
                                                                        >
                                                                            <img
                                                                                src={getFaviconUrl(citationUrl)}
                                                                                alt={`Citation ${index + 1}`}
                                                                                className="h-4 w-4"
                                                                                onError={(e) => {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        </a>
                                                                    ))}
                                                                    {post.citation_urls.length > 8 && (
                                                                        <span className="text-xs text-muted-foreground">...</span>
                                                                    )}\n                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">No citations</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDate(post.posted_at)}
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
        </AppLayout>
    );
}
