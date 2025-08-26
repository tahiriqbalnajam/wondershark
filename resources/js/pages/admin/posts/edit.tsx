import React, { useState, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Save } from 'lucide-react';

interface Brand {
    id: number;
    name: string;
    can_create_posts: boolean;
    post_creation_note?: string;
    monthly_posts: number;
    agency_id: number;
}

interface Agency {
    id: number;
    name: string;
}

interface Post {
    id: number;
    title: string;
    url: string;
    description: string;
    brand_id: number;
    status: string;
    brand: {
        id: number;
        name: string;
        agency_id: number;
        user: {
            id: number;
            name: string;
        };
    };
}

interface Props {
    post: Post;
    agencies: Agency[];
    brands: Brand[];
}

const Edit: React.FC<Props> = ({ post, agencies, brands }) => {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Posts', href: '/admin/posts' },
        { title: 'Edit Post', href: '#' }
    ];

    const { data, setData, patch, processing, errors } = useForm({
        title: post.title,
        url: post.url,
        description: post.description,
        brand_id: post.brand_id.toString(),
        status: post.status,
    });

    const [selectedAgency, setSelectedAgency] = useState('all');
    const [filteredBrands, setFilteredBrands] = useState<Brand[]>(brands);

    // Type assertion for additional error fields
    const formErrors = errors as typeof errors & {
        permission?: string;
        limit?: string;
    };

    useEffect(() => {
        // Set initial agency selection based on post's brand
        if (post.brand) {
            setSelectedAgency(post.brand.agency_id.toString());
            setFilteredBrands(brands.filter(brand => brand.agency_id === post.brand.agency_id));
        } else {
            setFilteredBrands(brands);
        }
    }, [post, brands]);

    const handleAgencyChange = (agencyId: string) => {
        setSelectedAgency(agencyId);
        setData('brand_id', ''); // Clear brand selection when agency changes
        
        if (agencyId && agencyId !== 'all') {
            setFilteredBrands(brands.filter(brand => brand.agency_id.toString() === agencyId));
        } else {
            setFilteredBrands(brands);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(`/admin/posts/${post.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                // Handle success if needed
            },
            onError: () => {
                // Handle errors if needed
            }
        });
    };

    const selectedBrand = brands.find(brand => brand.id.toString() === data.brand_id);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Admin - Edit ${post.title}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/posts">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Posts
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Edit Post</h1>
                            <p className="text-muted-foreground">Update post information and content</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Post Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Agency</Label>
                                    <Select value={selectedAgency} onValueChange={handleAgencyChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select agency (optional)" />
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
                                    <Label htmlFor="brand_id">Brand *</Label>
                                    <Select value={data.brand_id} onValueChange={(value) => setData('brand_id', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select brand" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredBrands.map((brand) => (
                                                <SelectItem key={brand.id} value={brand.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{brand.name}</span>
                                                        {!brand.can_create_posts && (
                                                            <Badge variant="destructive" className="text-xs">
                                                                Restricted
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.brand_id && <p className="text-sm text-red-600">{errors.brand_id}</p>}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title *</Label>
                                    <Input
                                        id="title"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        placeholder="Enter post title"
                                    />
                                    {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="url">URL *</Label>
                                    <Input
                                        id="url"
                                        value={data.url}
                                        onChange={(e) => setData('url', e.target.value)}
                                        placeholder="Enter post URL"
                                    />
                                    {errors.url && <p className="text-sm text-red-600">{errors.url}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && <p className="text-sm text-red-600">{errors.status}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Enter post description..."
                                    className="min-h-[200px]"
                                />
                                {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
                            </div>

                            {/* Brand Info */}
                            {selectedBrand && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-medium text-blue-900 mb-2">Brand Information</h4>
                                    <div className="text-sm text-blue-800">
                                        <p><span className="font-medium">Monthly Posts Limit:</span> {selectedBrand.monthly_posts}</p>
                                        {selectedBrand.post_creation_note && (
                                            <p className="mt-1"><span className="font-medium">Note:</span> {selectedBrand.post_creation_note}</p>
                                        )}
                                        {!selectedBrand.can_create_posts && (
                                            <p className="mt-1 text-red-600">
                                                <span className="font-medium">Warning:</span> This brand is restricted from creating posts.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Error Messages */}
                            {(formErrors.permission || formErrors.limit) && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <h4 className="font-medium text-red-900 mb-2">Cannot Update Post</h4>
                                    <div className="text-sm text-red-800 space-y-1">
                                        {formErrors.permission && <p>{formErrors.permission}</p>}
                                        {formErrors.limit && <p>{formErrors.limit}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="flex items-center gap-4 pt-4">
                                <Button type="submit" disabled={processing}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {processing ? 'Updating...' : 'Update Post'}
                                </Button>
                                <Link href="/admin/posts">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
};

export default Edit;
