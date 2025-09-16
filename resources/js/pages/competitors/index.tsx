import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Shield } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Brand {
    id: number;
    name: string;
    website: string;
}

interface Props {
    brands: Brand[];
}

export default function CompetitorsIndex({ brands }: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Competitors', href: '' }
            ]}
        >
            <Head title="Competitor Analysis" />

            <div className="max-w-7xl mx-auto py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Competitor Analysis</h2>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Select a Brand to Analyze Competitors
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {brands.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {brands.map((brand) => (
                                    <Card key={brand.id} className="hover:shadow-md transition-shadow">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                {brand.name}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-gray-600 mb-4">{brand.website}</p>
                                            <Button asChild className="w-full">
                                                <Link href={route('competitors.index', { brand: brand.id })}>
                                                    Analyze Competitors
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 mb-4">No brands available for competitor analysis.</p>
                                <Button asChild>
                                    <Link href="/brands/create">
                                        Create Your First Brand
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
