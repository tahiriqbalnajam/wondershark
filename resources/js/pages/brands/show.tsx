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
    Edit,
    ArrowLeft,
    ExternalLink,
    Shield,
    Trophy
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
    competitors?: Array<{
        id: number;
        name: string;
        domain: string;
        rank: number;
        sentiment: number;
        visibility: number;
    }>;
    user?: {
        id: number;
        name: string;
        email: string;
    } | null;
};

type Props = {
    brand: Brand | null;
};

const breadcrumbs = (brand: Brand | null): BreadcrumbItem[] => [
    {
        title: 'Brands',
        href: '/brands',
    },
    {
        title: brand?.name || 'Brand Details',
        href: `/brands/${brand?.id || ''}`,
    },
];

export default function BrandShow({ brand }: Props) {
    if (!brand) {
        return (
            <AppLayout>
                <Head title="Brand Not Found" />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold text-gray-900">Brand Not Found</h1>
                        <p className="mt-2 text-gray-600">The brand you're looking for doesn't exist.</p>
                        <Button className="mt-4" asChild>
                            <Link href="/brands">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Brands
                            </Link>
                        </Button>
                    </div>
                </div>
            </AppLayout>
        );
    }

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
                            <Link href={route('competitors.index', { brand: brand.id })}>
                                <Shield className="h-4 w-4 mr-2" />
                                Competitors
                            </Link>
                        </Button>
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
                <div className="grid gap-6 lg:grid-cols-4">
                    <Card className="lg:col-span-1">
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

                    <Card className="lg:col-span-3">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="h-5 w-5" />
                                Industry Ranking
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {brand.competitors && brand.competitors.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="pb-3 text-sm font-medium text-muted-foreground w-12">#</th>
                                                <th className="pb-3 text-sm font-medium text-muted-foreground">Brand</th>
                                                <th className="pb-3 text-sm font-medium text-muted-foreground text-center w-24">Position</th>
                                                <th className="pb-3 text-sm font-medium text-muted-foreground text-center w-24">Sentiment</th>
                                                <th className="pb-3 text-sm font-medium text-muted-foreground text-center w-24">Visibility</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {brand.competitors.map((competitor, index) => {
                                                // Clean domain for display - remove protocol and www
                                                const cleanDomain = competitor.domain
                                                    .replace(/^https?:\/\//, '') // Remove http:// or https://
                                                    .replace(/^www\./, ''); // Remove www.
                                                
                                                const logoUrl = `https://img.logo.dev/${cleanDomain}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`;
                                                const fallbackLogo = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`;
                                                
                                                return (
                                                    <tr key={competitor.id} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                                                        <td className="py-4 text-sm font-medium">{index + 1}</td>
                                                        <td className="py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg border bg-white flex items-center justify-center p-1">
                                                                    <img 
                                                                        src={logoUrl}
                                                                        alt={`${competitor.name} logo`}
                                                                        className="w-full h-full object-contain"
                                                                        onError={(e) => {
                                                                            e.currentTarget.src = fallbackLogo;
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <span className="font-medium text-sm">{competitor.name}</span>
                                                                    <p className="text-xs text-muted-foreground">{cleanDomain}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <Badge variant="secondary" className="font-mono">
                                                                #{competitor.rank}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <Badge 
                                                                variant={
                                                                    competitor.sentiment >= 0.7 ? 'default' : 
                                                                    competitor.sentiment >= 0.4 ? 'secondary' : 
                                                                    'destructive'
                                                                }
                                                                className="font-mono"
                                                            >
                                                                {(competitor.sentiment * 100).toFixed(0)}%
                                                            </Badge>
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <Badge variant="outline" className="font-mono">
                                                                {(competitor.visibility * 100).toFixed(0)}%
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <h3 className="font-medium mb-1">No competitor data available</h3>
                                    <p className="text-sm">Add competitors to track industry rankings and performance.</p>
                                </div>
                            )}
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
