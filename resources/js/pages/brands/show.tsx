import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { 
    Building2, 
    Globe, 
    MessageSquare, 
    Users, 
    Settings,
    Edit,
    ArrowLeft,
    ExternalLink
} from 'lucide-react';

type Brand = {
    id: number;
    name: string;
    website?: string;
    description: string;
    monthly_posts: number;
    status: 'active' | 'inactive' | 'pending';
    created_at: string;
    prompts: Array<{ id: number; prompt: string; order: number; is_active: boolean }>;
    subreddits: Array<{ id: number; subreddit_name: string; description?: string; status: string }>;
    user: {
        id: number;
        name: string;
        email: string;
    };
};

type Props = {
    brand: Brand;
};

const breadcrumbs = (brand: Brand): BreadcrumbItem[] => [
    {
        title: 'Brands',
        href: '/brands',
    },
    {
        title: brand.name,
        href: `/brands/${brand.id}`,
    },
];

export default function BrandShow({ brand }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs(brand)}>
            <Head title={`${brand.name} - Brand Details`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/brands">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Brands
                            </Link>
                        </Button>
                        <div>
                            <HeadingSmall 
                                title={brand.name}
                                description="Brand details and content strategy overview" 
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={`/brands/${brand.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Brand
                            </Link>
                        </Button>
                        <Badge variant={brand.status === 'active' ? 'default' : 'secondary'} className="px-3 py-1">
                            {brand.status}
                        </Badge>
                    </div>
                </div>

                {/* Brand Overview */}
                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Basic Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Brand Name</label>
                                <p className="text-lg font-semibold">{brand.name}</p>
                            </div>
                            {brand.website && (
                                <div>
                                    <label className="text-sm font-medium">Website</label>
                                    <a 
                                        href={brand.website} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-primary hover:underline"
                                    >
                                        <Globe className="h-4 w-4" />
                                        {new URL(brand.website).hostname}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <p className="text-sm text-muted-foreground">{brand.description}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Created</label>
                                <p className="text-sm">{new Date(brand.created_at).toLocaleDateString()}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Content Strategy
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-muted/30 rounded-lg">
                                    <div className="text-2xl font-bold text-primary">{brand.prompts?.length || 0}</div>
                                    <div className="text-sm text-muted-foreground">Content Prompts</div>
                                </div>
                                <div className="text-center p-4 bg-muted/30 rounded-lg">
                                    <div className="text-2xl font-bold text-primary">{brand.subreddits?.length || 0}</div>
                                    <div className="text-sm text-muted-foreground">Target Subreddits</div>
                                </div>
                            </div>
                            <div className="text-center p-4 bg-primary/10 rounded-lg">
                                <div className="text-2xl font-bold text-primary">{brand.monthly_posts}</div>
                                <div className="text-sm text-muted-foreground">Posts per Month</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Brand Account
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Account Holder</label>
                                <p className="font-semibold">{brand.user.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Email</label>
                                <p className="text-sm text-muted-foreground">{brand.user.email}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Account Status</label>
                                <Badge variant="outline" className="mt-1">
                                    Active
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Content Prompts */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Content Prompts ({brand.prompts?.length || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {brand.prompts && brand.prompts.length > 0 ? (
                            <div className="space-y-3">
                                {brand.prompts.map((prompt, index) => (
                                    <div key={prompt.id} className="p-4 border rounded-lg">
                                        <div className="flex items-start justify-between mb-2">
                                            <Badge variant="outline">Prompt {index + 1}</Badge>
                                            <Badge variant={prompt.is_active ? 'default' : 'secondary'}>
                                                {prompt.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm">{prompt.prompt}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No content prompts configured yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Target Subreddits */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Target Subreddits ({brand.subreddits?.length || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {brand.subreddits && brand.subreddits.length > 0 ? (
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {brand.subreddits.map((subreddit) => (
                                    <div key={subreddit.id} className="p-3 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="secondary">r/{subreddit.subreddit_name}</Badge>
                                            <Badge variant={subreddit.status === 'approved' ? 'default' : 'outline'}>
                                                {subreddit.status}
                                            </Badge>
                                        </div>
                                        {subreddit.description && (
                                            <p className="text-sm text-muted-foreground">{subreddit.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No target subreddits configured yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
