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
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { ArrowLeft, FileText, Users, Building2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Agency = {
    id: number;
    name: string;
};

type Brand = {
    id: number;
    name: string;
    agency_id: number;
    can_create_posts: boolean;
    post_creation_note?: string;
    monthly_posts: number;
};

type Props = {
    agencies: Agency[];
    brands: Brand[];
    adminEmail: string;
};

type FormData = {
    title: string;
    url: string;
    description: string;
    brand_id: string;
    status: string;
    posted_at: string;
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
    {
        title: 'Create Post',
        href: '/admin/posts/create',
    },
];

export default function AdminPostsCreate({ agencies, brands }: Props) {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        title: '',
        url: '',
        description: '',
        brand_id: '',
        status: 'draft',
        posted_at: new Date().toISOString().split('T')[0],
    });

    const [selectedAgency, setSelectedAgency] = useState('all');
    const [filteredBrands, setFilteredBrands] = useState<Brand[]>(brands);

    // Type assertion for additional error fields
    const formErrors = errors as typeof errors & {
        permission?: string;
        limit?: string;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/posts');
    };

    const handleAgencyChange = (agencyId: string) => {
        setSelectedAgency(agencyId);
        setData('brand_id', ''); // Clear brand selection when agency changes
        
        if (agencyId && agencyId !== 'all') {
            setFilteredBrands(brands.filter(brand => brand.agency_id.toString() === agencyId));
        } else {
            setFilteredBrands(brands);
        }
    };

    const selectedBrand = brands.find(brand => brand.id.toString() === data.brand_id);
    const selectedBrandAgency = selectedBrand ? agencies.find(agency => agency.id === selectedBrand.agency_id) : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Create Post" />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/posts">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Posts
                        </Button>
                    </Link>
                    <HeadingSmall
                        title="Create Post"
                        description="Create a new post for any agency and brand"
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
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
                                            {errors.brand_id && (
                                                <p className="text-sm text-red-500">{errors.brand_id}</p>
                                            )}
                                        </div>
                                    </div>

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
                                        {errors.url && (
                                            <p className="text-sm text-red-500">{errors.url}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="title">Title</Label>
                                        <Input
                                            id="title"
                                            type="text"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Post title (optional)"
                                            className={errors.title ? 'border-red-500' : ''}
                                        />
                                        {errors.title && (
                                            <p className="text-sm text-red-500">{errors.title}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Brief description of the post content"
                                            rows={4}
                                            className={errors.description ? 'border-red-500' : ''}
                                        />
                                        {errors.description && (
                                            <p className="text-sm text-red-500">{errors.description}</p>
                                        )}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="status">Status</Label>
                                            <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="draft">Draft</SelectItem>
                                                    <SelectItem value="published">Published</SelectItem>
                                                    <SelectItem value="archived">Archived</SelectItem>
                                                </SelectContent>
                                            </Select>
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
                                    </div>

                                    {formErrors.permission && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{formErrors.permission}</AlertDescription>
                                        </Alert>
                                    )}

                                    {formErrors.limit && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{formErrors.limit}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex gap-2 pt-4">
                                        <Button type="submit" disabled={processing}>
                                            {processing ? 'Creating...' : 'Create Post'}
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

                    <div className="space-y-6">
                        {selectedBrand && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <Building2 className="h-4 w-4" />
                                        Selected Brand
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <p className="font-medium">{selectedBrand.name}</p>
                                        {selectedBrandAgency && (
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {selectedBrandAgency.name}
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Post Creation:</span>
                                            <Badge variant={selectedBrand.can_create_posts ? "default" : "destructive"}>
                                                {selectedBrand.can_create_posts ? "Allowed" : "Restricted"}
                                            </Badge>
                                        </div>
                                        
                                        {selectedBrand.monthly_posts && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span>Monthly Limit:</span>
                                                <span>{selectedBrand.monthly_posts} posts</span>
                                            </div>
                                        )}
                                        
                                        {selectedBrand.post_creation_note && (
                                            <div className="p-2 bg-muted rounded-md">
                                                <p className="text-xs text-muted-foreground">
                                                    {selectedBrand.post_creation_note}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">How it works</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted-foreground">
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                                    <p>Select an agency to filter brands, or choose from all brands</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                                    <p>Brand post creation permissions and limits are checked</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                                    <p>AI prompts will be generated automatically in the background</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
