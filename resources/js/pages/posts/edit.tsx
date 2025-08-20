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
import AppLayout from '@/layouts/app-layout';
import { ArrowLeft, FileText, ExternalLink } from 'lucide-react';

type Brand = {
    id: number;
    name: string;
};

type Post = {
    id: number;
    title: string;
    url: string;
    description?: string;
    status: 'published' | 'draft' | 'archived';
    posted_at: string;
    brand_id: number;
    brand: {
        id: number;
        name: string;
    };
};

type Props = {
    post: Post;
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

const breadcrumbs = (post: Post): BreadcrumbItem[] => [
    {
        title: 'Posts',
        href: '/posts',
    },
    {
        title: post.title || 'Untitled Post',
        href: `/posts/${post.id}`,
    },
    {
        title: 'Edit',
        href: `/posts/${post.id}/edit`,
    },
];

export default function PostsEdit({ post, brands }: Props) {
    const { data, setData, put, processing, errors } = useForm<FormData>({
        title: post.title || '',
        url: post.url || '',
        description: post.description || '',
        brand_id: post.brand_id.toString(),
        status: post.status,
        posted_at: post.posted_at.split('T')[0], // Convert to YYYY-MM-DD format
    });

    const [urlPreview, setUrlPreview] = useState(post.url || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/posts/${post.id}`);
    };

    const handleUrlChange = (url: string) => {
        setData('url', url);
        setUrlPreview(url);
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
        <AppLayout breadcrumbs={breadcrumbs(post)}>
            <Head title={`Edit ${post.title || 'Post'}`} />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/posts/${post.id}`}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Post
                        </Link>
                    </Button>
                    
                    <HeadingSmall 
                        title="Edit Post"
                        description="Update post information and settings"
                    />
                </div>

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
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-sm font-medium">
                                        Post Title
                                    </Label>
                                    <Input
                                        id="title"
                                        placeholder="Enter post title"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className={errors.title ? 'border-destructive' : ''}
                                    />
                                    {errors.title && (
                                        <p className="text-sm text-destructive">{errors.title}</p>
                                    )}
                                </div>

                                {/* Description Field */}
                                <div className="space-y-2">
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
                                </div>

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
                                        {processing ? 'Updating...' : 'Update Post'}
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <Link href={`/posts/${post.id}`}>Cancel</Link>
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
