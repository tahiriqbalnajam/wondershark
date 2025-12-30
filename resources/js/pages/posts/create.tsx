import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { ArrowLeft, FileText, ExternalLink, Check } from 'lucide-react';

import { Calendar } from "@/components/ui/calendar";

type Brand = {
    id: number;
    name: string;
    can_create_posts: boolean;
    post_creation_note?: string;
    monthly_posts: number;
};

type Props = {
    brands: Brand[];
    canCreatePosts: boolean;
    adminEmail: string;
    userCanCreatePosts: boolean;
    userPostCreationNote?: string;
    brand?: Brand;
    selectedBrandId?: number;
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

export default function PostsCreate({ 
    brands, 
    canCreatePosts, 
    adminEmail, 
    userCanCreatePosts, 
    userPostCreationNote,
    brand,
    selectedBrandId
}: Props) {
    const { url } = usePage();
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const brandIdFromUrl = urlParams.get('brand_id') || selectedBrandId?.toString() || '';

    // Dynamic breadcrumbs based on whether we're creating for a specific brand
    const breadcrumbs: BreadcrumbItem[] = brand ? [
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
        {
            title: 'Create Post',
            href: `/brands/${brand.id}/posts/create`,
        },
    ] : [
        {
            title: 'Posts',
            href: '/posts',
        },
        {
            title: 'Create Post',
            href: '/posts/create',
        },
    ];

    const { data, setData, post, processing, errors } = useForm<FormData>({
        title: '',
        url: '',
        description: '',
        brand_id: brandIdFromUrl,
        status: 'draft',
        posted_at: new Date().toISOString().split('T')[0],
        post_type: 'blog',
    });

    const [urlPreview, setUrlPreview] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Use brand-specific route if brand is present, otherwise generic route
        const submitRoute = brand ? `/brands/${brand.id}/posts` : '/posts';
        post(submitRoute);
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
    
    const [date, setDate] = useState<Date | undefined>(new Date());
    const handleDateSelect = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
    };

    // Check if user or brand can create posts
    if (!userCanCreatePosts || !canCreatePosts) {
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
                            title="Post Creation Not Available" 
                            description="Contact administrator for permissions"
                        />
                    </div>

                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            {!userCanCreatePosts && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                                    <h3 className="font-semibold text-red-800 mb-2">User Permission Required</h3>
                                    <p className="text-red-700 mb-2">
                                        You don't have permission to create posts.
                                    </p>
                                    {userPostCreationNote && (
                                        <p className="text-red-600 text-sm mb-2">
                                            Note: {userPostCreationNote}
                                        </p>
                                    )}
                                    <p className="text-red-700">
                                        Please contact the administrator at{' '}
                                        <a 
                                            href={`mailto:${adminEmail}`} 
                                            className="text-blue-600 hover:underline"
                                        >
                                            {adminEmail}
                                        </a>
                                        {' '}to request post creation permissions.
                                    </p>
                                </div>
                            )}

                            {!canCreatePosts && (
                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
                                    <h3 className="font-semibold text-orange-800 mb-2">Brand Permission Required</h3>
                                    <p className="text-orange-700 mb-2">
                                        Your brand doesn't have permission to create posts.
                                    </p>
                                    <p className="text-orange-700">
                                        Please contact the administrator at{' '}
                                        <a 
                                            href={`mailto:${adminEmail}`} 
                                            className="text-blue-600 hover:underline"
                                        >
                                            {adminEmail}
                                        </a>
                                        {' '}to request post creation permissions for your brand.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* <Head title="Create Post" /> */}
            

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={brand ? `/brands/${brand.id}/posts` : '/posts'}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Posts
                        </Link>
                    </Button>
                    
                    <HeadingSmall 
                        title="Create New Post"
                        description="Add a new post to track AI citations"
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

                                {/* Post Type Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="post_type" className="text-sm font-medium">
                                        Post Type *
                                    </Label>
                                    <Select 
                                        value={data.post_type} 
                                        onValueChange={(value) => setData('post_type', value)}
                                    >
                                        <SelectTrigger className={errors.post_type ? 'border-destructive' : ''}>
                                            <SelectValue placeholder="Select post type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="blog">Blog</SelectItem>
                                            <SelectItem value="forum">Forum</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.post_type && (
                                        <p className="text-sm text-destructive">{errors.post_type}</p>
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
                                        <Link href={brand ? `/brands/${brand.id}/posts` : '/posts'}>Cancel</Link>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            <div className="anwser-ai">
                <h2>Unlock visibility in AI answers for your brand/agency with wondershark.ai​</h2>
                <div className="ai-answer-img">
                    <img src="/images/graph1.png" alt="" />
                </div>
                <h3>Turn AI search into a predictable source of customers with done-for-you  prompts, content, and optimization tailored to your brand.​ </h3>
                <ul>
                    <li><span><Check/></span> Wondershark.ai researches the exact prompts your ideal customers are asking tools like ChatGPT and Gemini, then builds content that positions your brand as  the default answer.​ </li>
                    <li><span><Check/></span> You get performance-focused posts every month, with a dedicated creative  strategist, scriptwriting, and full transparency on content and  creators.​</li>
                    <li><span><Check/></span> Campaign performance is tracked and optimized, and you can receive updates and scheduling notifications by SMS if enabled in your account.​ </li>
                </ul>
                <div className="ai-answer-heading">
                    <h4>Ready to see what AI visibility could do for your brand?</h4>
                </div>
                <h5>“Pick a time on the calendar below and our team will walk you through how  Wondershark.ai can grow your brand with AI-driven visibility and  content.” </h5>
                <div className="anwser-ai-calendar">
                    <Calendar mode="single" selected={date} onSelect={handleDateSelect} />
                </div>
            </div>
        </AppLayout>
    );
}
