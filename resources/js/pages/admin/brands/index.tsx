import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { Building2, ExternalLink } from 'lucide-react';

interface Brand {
    id: number;
    name: string;
    website?: string;
    agency_name?: string;
    agency_email?: string;
    has_agency: boolean;
    status: string;
    created_at?: string;
}

interface Props {
    brands: Brand[];
}

export default function AdminBrands({ brands }: Props) {
    const [brandFilter, setBrandFilter] = useState<'all' | 'with-agency' | 'without-agency'>('all');

    const filteredBrands = brands.filter(b => {
        if (brandFilter === 'with-agency') return b.has_agency;
        if (brandFilter === 'without-agency') return !b.has_agency;
        return true;
    });

    return (
        <AppLayout title="Individual Brands">
            <Head title="Individual Brands" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Individual Brands</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage all brands in the system
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <span className='w-[45px] h-[45px] bg-gray-200 flex items-center justify-center rounded'>
                                    <Building2/>
                                </span>
                                All Brands ({filteredBrands.length})
                            </CardTitle>
                            <div className="flex gap-2">
                                <Select 
                                    value={brandFilter} 
                                    onValueChange={(value: 'all' | 'with-agency' | 'without-agency') => setBrandFilter(value)}
                                >
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Filter brands" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Brands</SelectItem>
                                        <SelectItem value="with-agency">With Agency</SelectItem>
                                        <SelectItem value="without-agency">Without Agency</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredBrands.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4 font-semibold">Brand</th>
                                            <th className="text-left py-3 px-4 font-semibold">Website</th>
                                            <th className="text-left py-3 px-4 font-semibold">Agency</th>
                                            <th className="text-left py-3 px-4 font-semibold">Status</th>
                                            <th className="text-left py-3 px-4 font-semibold">Created</th>
                                            <th className="text-right py-3 px-4 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBrands.map((brand) => (
                                            <tr key={brand.id} className="border-b hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                                                            <img 
                                                                src={`https://img.logo.dev/${brand.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`}
                                                                alt={brand.name}
                                                                className="w-6 h-6 object-contain"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`;
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="font-medium">{brand.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {brand.website ? (
                                                        <a 
                                                            href={brand.website} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline flex items-center gap-1"
                                                        >
                                                            {brand.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {brand.has_agency ? (
                                                        <div>
                                                            <div className="font-medium text-sm">{brand.agency_name}</div>
                                                            {brand.agency_email && (
                                                                <div className="text-xs text-gray-500">{brand.agency_email}</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline">No Agency</Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge variant={brand.status === 'active' ? 'default' : 'secondary'}>
                                                        {brand.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600">
                                                    {brand.created_at || '—'}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link href={`/brands/${brand.id}`}>
                                                            View
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No brands found matching the selected filter.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
