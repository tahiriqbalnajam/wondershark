import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { Building2, ExternalLink, Plus } from 'lucide-react';

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

type BrandForm = {
    name: string;
    email: string;
    website: string;
    country: string;
    password: string;
};

export default function AdminBrands({ brands }: Props) {
    const [brandFilter, setBrandFilter] = useState<'all' | 'with-agency' | 'without-agency'>('all');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const { data, setData, post, errors, processing, reset } = useForm<BrandForm>({
        name: '',
        email: '',
        website: '',
        country: '',
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('admin.brands.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setIsAddDialogOpen(false);
            },
        });
    };

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
                    <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <SheetTrigger asChild>
                            <Button style={{ backgroundColor: 'var(--orange-1)', borderColor: 'var(--orange-1)' }}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Brand
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="overflow-y-auto sm:max-w-lg p-6">
                            <SheetHeader>
                                <SheetTitle>Add New Brand</SheetTitle>
                                <SheetDescription>
                                    Create a new brand with a user account. Fill in all required fields below.
                                </SheetDescription>
                            </SheetHeader>
                            <form onSubmit={submit} className="mt-6 px-1">
                                {(errors as any).error && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-600">{(errors as any).error}</p>
                                    </div>
                                )}
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="brand_name">Brand Name *</Label>
                                        <Input
                                            id="brand_name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="Enter brand name"
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="brand_email">Email *</Label>
                                        <Input
                                            id="brand_email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="brand@example.com"
                                            required
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="brand_website">Website *</Label>
                                        <Input
                                            id="brand_website"
                                            type="url"
                                            value={data.website}
                                            onChange={(e) => setData('website', e.target.value)}
                                            placeholder="https://example.com"
                                            required
                                        />
                                        <InputError message={errors.website} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="brand_country">Country *</Label>
                                        <Select
                                            value={data.country}
                                            onValueChange={(value) => setData('country', value)}
                                        >
                                            <SelectTrigger id="brand_country">
                                                <SelectValue placeholder="Select a country" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="US">United States</SelectItem>
                                                <SelectItem value="CA">Canada</SelectItem>
                                                <SelectItem value="GB">United Kingdom</SelectItem>
                                                <SelectItem value="AU">Australia</SelectItem>
                                                <SelectItem value="DE">Germany</SelectItem>
                                                <SelectItem value="FR">France</SelectItem>
                                                <SelectItem value="ES">Spain</SelectItem>
                                                <SelectItem value="IT">Italy</SelectItem>
                                                <SelectItem value="NL">Netherlands</SelectItem>
                                                <SelectItem value="SE">Sweden</SelectItem>
                                                <SelectItem value="NO">Norway</SelectItem>
                                                <SelectItem value="DK">Denmark</SelectItem>
                                                <SelectItem value="FI">Finland</SelectItem>
                                                <SelectItem value="IE">Ireland</SelectItem>
                                                <SelectItem value="BE">Belgium</SelectItem>
                                                <SelectItem value="CH">Switzerland</SelectItem>
                                                <SelectItem value="AT">Austria</SelectItem>
                                                <SelectItem value="PL">Poland</SelectItem>
                                                <SelectItem value="PT">Portugal</SelectItem>
                                                <SelectItem value="GR">Greece</SelectItem>
                                                <SelectItem value="NZ">New Zealand</SelectItem>
                                                <SelectItem value="SG">Singapore</SelectItem>
                                                <SelectItem value="JP">Japan</SelectItem>
                                                <SelectItem value="KR">South Korea</SelectItem>
                                                <SelectItem value="IN">India</SelectItem>
                                                <SelectItem value="BR">Brazil</SelectItem>
                                                <SelectItem value="MX">Mexico</SelectItem>
                                                <SelectItem value="AR">Argentina</SelectItem>
                                                <SelectItem value="CL">Chile</SelectItem>
                                                <SelectItem value="ZA">South Africa</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.country} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="brand_password">Password *</Label>
                                        <Input
                                            id="brand_password"
                                            type="password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="Enter password for brand user"
                                            required
                                            minLength={8}
                                        />
                                        <InputError message={errors.password} />
                                        <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                                    </div>
                                </div>

                                <SheetFooter className="mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsAddDialogOpen(false)}
                                        className="w-full sm:w-auto"
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                                        {processing ? 'Creating...' : 'Create Brand'}
                                    </Button>
                                </SheetFooter>
                            </form>
                        </SheetContent>
                    </Sheet>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <span className='w-[45px] h-[45px] bg-gray-200 flex items-center justify-center rounded'>
                                    <Building2 />
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
                                <table className="w-full default-table">
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
                                                        <Badge variant="outline" style={{ borderColor: 'var(--orange-1)', color: 'var(--orange-1)' }}>Individual</Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant={brand.status === 'active' ? 'default' : 'secondary'}
                                                        style={brand.status === 'active' ? { backgroundColor: 'var(--orange-1)', borderColor: 'var(--orange-1)' } : {}}
                                                    >
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
                                                        style={{ borderColor: 'var(--orange-1)', color: 'var(--orange-1)' }}
                                                        className="hover:bg-[var(--orange-1)] hover:text-white"
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
