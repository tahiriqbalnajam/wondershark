import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, Package, ChevronDown, ChevronUp } from 'lucide-react';

interface Brand {
    id: number;
    name: string;
    website: string;
    status: string;
    agency_id: number;
    created_at: string;
}

interface Agency {
    id: number;
    name: string;
    email: string;
    brands_count: number;
    brands: Brand[];
    created_at: string;
}

interface Props {
    agencies: Agency[];
}

const breadcrumbs = [
    { name: 'Admin', href: '/admin', title: 'Admin' },
    { name: 'Agencies', href: '/admin/agencies', title: 'Agencies' },
];

export default function AdminAgencies({ agencies }: Props) {
    const [expandedAgencies, setExpandedAgencies] = useState<Set<number>>(new Set());

    const toggleAgency = (agencyId: number) => {
        const newExpanded = new Set(expandedAgencies);
        if (newExpanded.has(agencyId)) {
            newExpanded.delete(agencyId);
        } else {
            newExpanded.add(agencyId);
        }
        setExpandedAgencies(newExpanded);
    };

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
            <Head title="Admin - Agencies" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <HeadingSmall 
                        title="Agencies Management"
                        description="View and manage all agencies and their brands" 
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/admin/brands">
                                <Package className="h-4 w-4 mr-2" />
                                Individual Brands
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Agencies</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{agencies.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Brands</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {agencies.reduce((sum, agency) => sum + agency.brands_count, 0)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Brands/Agency</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {agencies.length > 0 
                                    ? (agencies.reduce((sum, agency) => sum + agency.brands_count, 0) / agencies.length).toFixed(1)
                                    : '0'
                                }
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Agencies List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Agencies ({agencies.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {agencies.length > 0 ? (
                                agencies.map((agency) => (
                                    <div key={agency.id} className="border rounded-lg">
                                        <div 
                                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                                            onClick={() => toggleAgency(agency.id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <Building2 className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg">{agency.name}</h3>
                                                    <p className="text-sm text-gray-600">{agency.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="secondary">
                                                    {agency.brands_count} {agency.brands_count === 1 ? 'Brand' : 'Brands'}
                                                </Badge>
                                                {expandedAgencies.has(agency.id) ? (
                                                    <ChevronUp className="h-5 w-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Brands List */}
                                        {expandedAgencies.has(agency.id) && (
                                            <div className="border-t bg-gray-50 p-4">
                                                {agency.brands && agency.brands.length > 0 ? (
                                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                                        {agency.brands.map((brand) => (
                                                            <div 
                                                                key={brand.id} 
                                                                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectBrand(brand.id);
                                                                }}
                                                            >
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <div className="flex-1">
                                                                        <h4 className="font-semibold">{brand.name}</h4>
                                                                        <p className="text-xs text-gray-500 truncate">{brand.website}</p>
                                                                    </div>
                                                                    <Badge 
                                                                        variant={brand.status === 'active' ? 'default' : 'secondary'}
                                                                        className="ml-2"
                                                                    >
                                                                        {brand.status}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-gray-400 mt-2">
                                                                    Created {new Date(brand.created_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-center text-gray-500 py-4">No brands yet</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No agencies found.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
