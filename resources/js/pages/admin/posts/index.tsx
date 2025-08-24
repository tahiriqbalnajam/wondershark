import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    MessageSquare,
    Filter,
    Users
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
        agency?: {
            id: number;
            name: string;
        } | null;
    };
    user: {
        id: number;
        name: string;
    };
    citations_count: number;
    mentioned_in_ai: number;
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
};

type Filters = {
    date_from?: string;
    date_to?: string;
    agency_id?: string;
    brand_id?: string;
    ai_model?: string;
};

type Props = {
    posts: {
        data: Post[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: Filters;
    agencies: Agency[];
    brands: Brand[];
    aiModels: AiModel[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin',
        href: '/admin',
    },
    {
        title: 'Posts',
        href: '/admin/posts',
    },
];

export default function AdminPostsIndex({ posts, filters, agencies, brands, aiModels }: Props) {
    const { data, setData, processing } = useForm<Filters>({
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
        agency_id: filters.agency_id || 'all',
        brand_id: filters.brand_id || 'all',
        ai_model: filters.ai_model || 'all',
    });

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
            router.delete(`/admin/posts/${postId}`, {
                preserveScroll: true,
            });
        }
    };

    const handleFilter = () => {
        // Convert 'all' values back to empty strings for the backend
        const filterData = {
            date_from: data.date_from,
            date_to: data.date_to,
            agency_id: data.agency_id === 'all' ? '' : data.agency_id,
            brand_id: data.brand_id === 'all' ? '' : data.brand_id,
            ai_model: data.ai_model === 'all' ? '' : data.ai_model,
        };
        
        router.get('/admin/posts', filterData, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setData({
            date_from: '',
            date_to: '',
            agency_id: 'all',
            brand_id: 'all',
            ai_model: 'all',
        });
        router.get('/admin/posts');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const filteredBrands = data.agency_id && data.agency_id !== 'all'
        ? brands.filter(brand => brand.agency_id.toString() === data.agency_id)
        : brands;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Posts" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <HeadingSmall
                        title="Post Management"
                        description="Manage posts for all agencies and brands"
                    />
                    <Link href="/admin/posts/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Post
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date_from">Date From</Label>
                                <Input
                                    id="date_from"
                                    type="date"
                                    value={data.date_from}
                                    onChange={(e) => setData('date_from', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_to">Date To</Label>
                                <Input
                                    id="date_to"
                                    type="date"
                                    value={data.date_to}
                                    onChange={(e) => setData('date_to', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Agency</Label>
                                <Select value={data.agency_id} onValueChange={(value) => {
                                    setData('agency_id', value);
                                    setData('brand_id', 'all'); // Clear brand when agency changes
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All agencies" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All agencies</SelectItem>
                                        {agencies.map((agency) => (
                                            <SelectItem key={agency.id} value={agency.id.toString()}>
                                                {agency.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Brand</Label>
                                <Select value={data.brand_id} onValueChange={(value) => setData('brand_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All brands" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All brands</SelectItem>
                                        {filteredBrands.map((brand) => (
                                            <SelectItem key={brand.id} value={brand.id.toString()}>
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>AI Model</Label>
                                <Select value={data.ai_model} onValueChange={(value) => setData('ai_model', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All models" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All models</SelectItem>
                                        {aiModels.map((model) => (
                                            <SelectItem key={model.id} value={model.name}>
                                                {model.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <Button onClick={handleFilter} disabled={processing}>
                                Apply Filters
                            </Button>
                            <Button variant="outline" onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Posts Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Posts ({posts.total})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Post</TableHead>
                                        <TableHead>Agency</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Citations</TableHead>
                                        <TableHead>Posted</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {posts.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                No posts found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        posts.data.map((post) => (
                                            <TableRow key={post.id}>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium">
                                                            {post.title || 'Untitled Post'}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            <a 
                                                                href={post.url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 hover:text-blue-600"
                                                            >
                                                                {post.url.length > 50 ? `${post.url.substring(0, 50)}...` : post.url}
                                                                <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {post.brand.agency?.name || 'No Agency'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">{post.brand.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{post.user.name}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusColor(post.status)}>
                                                        {post.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {post.citations_count} ({post.mentioned_in_ai} mentioned)
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Calendar className="h-4 w-4" />
                                                        {formatDate(post.posted_at)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/admin/posts/${post.id}`}>
                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                    View
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/admin/posts/${post.id}/edit`}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(post.id)}
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        
                        {posts.last_page > 1 && (
                            <div className="flex items-center justify-between px-2 py-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {((posts.current_page - 1) * posts.per_page) + 1} to{' '}
                                    {Math.min(posts.current_page * posts.per_page, posts.total)} of{' '}
                                    {posts.total} posts
                                </div>
                                <div className="flex items-center space-x-2">
                                    {posts.current_page > 1 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.get(`/admin/posts?page=${posts.current_page - 1}`)}
                                        >
                                            Previous
                                        </Button>
                                    )}
                                    {posts.current_page < posts.last_page && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.get(`/admin/posts?page=${posts.current_page + 1}`)}
                                        >
                                            Next
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
