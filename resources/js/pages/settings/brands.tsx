import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Plus, Building2, Trash2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Brands settings',
        href: '/settings/brands',
    },
];

type Brand = {
    id: number;
    name: string;
    website?: string;
    created_at: string;
    status: 'active' | 'inactive';
};

type BrandForm = {
    name: string;
    website: string;
};

export default function Brands({ brands = [] }: { brands?: Brand[] }) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const { data, setData, post, errors, processing, reset } = useForm<BrandForm>({
        name: '',
        website: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('settings.brands.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setIsAddDialogOpen(false);
            },
        });
    };

    const deleteBrand = (brandId: number) => {
        if (confirm('Are you sure you want to remove this brand?')) {
            // Implement delete functionality
            console.log('Delete brand:', brandId);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Brands settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <HeadingSmall title="Brand Management" description="Manage brands associated with your agency" />
                        
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Brand
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Brand</DialogTitle>
                                    <DialogDescription>
                                        Add a new brand to your agency portfolio.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={submit}>
                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="brand_name">Brand Name</Label>
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
                                            <Label htmlFor="brand_website">Website (Optional)</Label>
                                            <Input
                                                id="brand_website"
                                                type="url"
                                                value={data.website}
                                                onChange={(e) => setData('website', e.target.value)}
                                                placeholder="https://example.com"
                                            />
                                            <InputError message={errors.website} />
                                        </div>
                                    </div>

                                    <DialogFooter className="mt-6">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => setIsAddDialogOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={processing}>
                                            {processing ? 'Adding...' : 'Add Brand'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Brands List */}
                    <div className="space-y-4">
                        {brands.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                    <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No brands yet</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Start by adding your first brand to your agency portfolio.
                                    </p>
                                    <Button onClick={() => setIsAddDialogOpen(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Your First Brand
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {brands.map((brand) => (
                                    <Card key={brand.id}>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <Building2 className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg">{brand.name}</CardTitle>
                                                        {brand.website && (
                                                            <CardDescription>
                                                                <a 
                                                                    href={brand.website} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline"
                                                                >
                                                                    {brand.website}
                                                                </a>
                                                            </CardDescription>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={brand.status === 'active' ? 'default' : 'secondary'}>
                                                        {brand.status}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => deleteBrand(brand.id)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">
                                                Added on {new Date(brand.created_at).toLocaleDateString()}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
