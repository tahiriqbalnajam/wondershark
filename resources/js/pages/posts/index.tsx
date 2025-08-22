import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    MessageSquare
} from 'lucide-react';

type Post = {
    id: number;
    title: string;
    url: string;
    description?: string;
    status: 'published' | 'draft' | 'archived';
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
};

type Props = {
    posts: {
        data: Post[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Posts',
        href: '/posts',
    },
];

export default function PostsIndex({ posts }: Props) {
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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Posts" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <HeadingSmall 
                        title="Posts"
                        description="Manage posts and track their AI citations"
                    />
                    
                    <Button asChild>
                        <Link href="/posts/create">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Post
                        </Link>
                    </Button>
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
                                <Button asChild>
                                    <Link href="/posts/create">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Post
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title & URL</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>AI Citations</TableHead>
                                        <TableHead>Posted Date</TableHead>
                                        <TableHead className="w-16"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {posts.data.map((post) => (
                                        <TableRow key={post.id}>
                                            <TableCell>
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
                                            </TableCell>
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
                                                <div className="space-y-1">
                                                    <div className="text-sm font-medium">
                                                        {post.mentioned_in_ai} / {post.citations_count}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Mentioned / Total
                                                    </div>
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
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
