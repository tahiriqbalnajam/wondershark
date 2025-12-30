import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import HeadingSmall from '@/components/heading-small';
import { Building2, Plus, Trash2, Users, Pencil } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

type Agency = {
    id: number;
    name: string;
    email: string;
    created_at: string;
    brands_count: number;
};

type Props = {
    agencies: Agency[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Agencies', href: '/admin/agencies' },
];

export default function AgenciesIndex({ agencies }: Props) {
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this agency? This action cannot be undone.')) {
            setDeletingId(id);
            router.delete(`/admin/agencies/${id}`, {
                onFinish: () => setDeletingId(null),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agencies" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <HeadingSmall 
                        title="Agencies" 
                        description="Manage all agency accounts"
                    />
                    <Button asChild style={{ backgroundColor: 'var(--orange-1)' }} className="hover:opacity-90">
                        <Link href="/admin/agencies/create">
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Agency
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            All Agencies ({agencies.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {agencies.length > 0 ? (
                            <Table className="default-table">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Brands</TableHead>
                                        <TableHead>Created At</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agencies.map((agency) => (
                                        <TableRow key={agency.id}>
                                            <TableCell className="font-medium">
                                                {agency.name}
                                            </TableCell>
                                            <TableCell>{agency.email}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    {agency.brands_count}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(agency.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                        style={{ backgroundColor: 'var(--orange-1)' }}
                                                        className="hover:opacity-90 text-white"
                                                    >
                                                        <Link href={`/admin/agencies/${agency.id}/edit`}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(agency.id)}
                                                        disabled={deletingId === agency.id}
                                                        style={{ backgroundColor: 'var(--orange-1)' }}
                                                        className="hover:opacity-90 text-white"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-12">
                                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">No agencies found</p>
                                <Button asChild className="mt-4" style={{ backgroundColor: 'var(--orange-1)' }}>
                                    <Link href="/admin/agencies/create">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Your First Agency
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
