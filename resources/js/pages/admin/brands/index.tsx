import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Building2, User, ExternalLink } from 'lucide-react';

interface Brand {
    id: number;
    name: string;
    website: string;
    status: string;
    user_id: number;
    created_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
}

interface Props {
    brands: {
        data: Brand[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

const breadcrumbs = [
    { name: 'Admin', href: '/admin', title: 'Admin' },
    { name: 'Individual Brands', href: '/admin/brands', title: 'Individual Brands' },
];

export default function AdminBrands({ brands }: Props) {
    const handleSelectBrand = (brandId: number) => {
        // Store selected brand in session and redirect to brand dashboard
        router.post('/admin/select-brand', { brand_id: brandId }, {
            onSuccess: () => {
                router.visit('/');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Individual Brands" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <HeadingSmall 
                        title="Individual Brands"
                        description="View and manage all brands not belonging to agencies" 
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/admin/agencies">
                                <Building2 className="h-4 w-4 mr-2" />
                                View Agencies
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Individual Brands</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{brands.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Brands</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {brands.data.filter(b => b.status === 'active').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Current Page</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {brands.current_page} / {brands.last_page}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Brands Grid */}
                <Card>
                    <CardHeader>
                        <CardTitle>Brands ({brands.total})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {brands.data.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {brands.data.map((brand) => (
                                    <div 
                                        key={brand.id} 
                                        className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer bg-white"
                                        onClick={() => handleSelectBrand(brand.id)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                                    <Package className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{brand.name}</h3>
                                                    <Badge 
                                                        variant={brand.status === 'active' ? 'default' : 'secondary'}
                                                        className="mt-1"
                                                    >
                                                        {brand.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <ExternalLink className="h-3 w-3" />
                                                <a 
                                                    href={brand.website} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="truncate hover:text-blue-600"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {brand.website}
                                                </a>
                                            </div>
                                            
                                            {brand.user && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <User className="h-3 w-3" />
                                                    <span className="truncate">{brand.user.name}</span>
                                                </div>
                                            )}

                                            <div className="text-xs text-gray-400 pt-2 border-t">
                                                Created {new Date(brand.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No individual brands found.</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {brands.last_page > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                <div className="text-sm text-gray-600">
                                    Showing {((brands.current_page - 1) * brands.per_page) + 1} to{' '}
                                    {Math.min(brands.current_page * brands.per_page, brands.total)} of{' '}
                                    {brands.total} brands
                                </div>
                                <div className="flex gap-2">
                                    {brands.current_page > 1 && (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => router.visit(`/admin/brands?page=${brands.current_page - 1}`)}
                                        >
                                            Previous
                                        </Button>
                                    )}
                                    {brands.current_page < brands.last_page && (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => router.visit(`/admin/brands?page=${brands.current_page + 1}`)}
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
