import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import { Plus, Building2, Globe, Calendar, MoreVertical, CheckCircle, XCircle, Clock } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Brands',
        href: '/brands',
    },
];

type Brand = {
    id: number;
    name: string;
    website?: string;
    description: string;
    monthly_posts: number;
    status: 'active' | 'inactive' | 'pending';
    created_at: string;
    prompts?: Array<{ id: number; prompt: string }>;
    subreddits?: Array<{ id: number; subreddit_name: string }>;
};

type Props = {
    brands: Brand[];
};

export default function BrandsIndex({ brands }: Props) {
    const handleStatusChange = (brandId: number, newStatus: string) => {
        router.put(route('brands.status', brandId), {
            status: newStatus,
        }, {
            preserveScroll: true,
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <CheckCircle className="h-3 w-3" />;
            case 'inactive':
                return <XCircle className="h-3 w-3" />;
            case 'pending':
                return <Clock className="h-3 w-3" />;
            default:
                return null;
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'active':
                return 'default' as const;
            case 'inactive':
                return 'destructive' as const;
            case 'pending':
                return 'secondary' as const;
            default:
                return 'outline' as const;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Brands" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <HeadingSmall 
                        title="Brand Management" 
                        description="Manage all your brands and their content strategies" 
                    />
                    
                    <Button asChild>
                        <Link href="/brands/create">
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Brand
                        </Link>
                    </Button>
                </div>

                {brands.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold mb-2">No brands yet</h3>
                            <p className="text-muted-foreground mb-6 max-w-md">
                                Get started by adding your first brand. Each brand can have its own content strategy, 
                                prompts, and targeted subreddits.
                            </p>
                            <Button asChild>
                                <Link href="/brands/create">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Your First Brand
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {brands.map((brand) => (
                            <Card key={brand.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Building2 className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{brand.name}</CardTitle>
                                                {brand.website && (
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <Globe className="h-3 w-3" />
                                                        <a 
                                                            href={brand.website} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="hover:underline"
                                                        >
                                                            {new URL(brand.website).hostname}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-auto p-0">
                                                    <Badge variant={getStatusVariant(brand.status)} className="cursor-pointer hover:opacity-80">
                                                        <div className="flex items-center gap-1">
                                                            {getStatusIcon(brand.status)}
                                                            {brand.status}
                                                            <MoreVertical className="h-3 w-3 ml-1" />
                                                        </div>
                                                    </Badge>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem 
                                                    onClick={() => handleStatusChange(brand.id, 'active')}
                                                    className="flex items-center gap-2"
                                                >
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                    Active
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handleStatusChange(brand.id, 'pending')}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Clock className="h-4 w-4 text-yellow-600" />
                                                    Pending
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handleStatusChange(brand.id, 'inactive')}
                                                    className="flex items-center gap-2"
                                                >
                                                    <XCircle className="h-4 w-4 text-red-600" />
                                                    Inactive
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {brand.description}
                                    </p>
                                    
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="space-y-1">
                                            <div className="text-lg font-semibold text-primary">
                                                {brand.prompts?.length || 0}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Prompts</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-lg font-semibold text-primary">
                                                {brand.subreddits?.length || 0}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Subreddits</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-lg font-semibold text-primary">
                                                {brand.monthly_posts}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Posts/Month</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Created {new Date(brand.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button variant="outline" size="sm" asChild className="flex-1">
                                            <Link href={`/brands/${brand.id}`}>
                                                View Details
                                            </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild className="flex-1">
                                            <Link href={`/brands/${brand.id}/edit`}>
                                                Edit
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
