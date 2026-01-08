import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import AppLayout from '@/layouts/app-layout';
import { 
    Shield, 
    Filter,
    Building2,
    Users,
    Plus,
    Trash2,
    ExternalLink,
    Eye,
    Pencil
} from 'lucide-react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

type Competitor = {
    id: number;
    name: string;
    domain?: string;
    description?: string;
    status: string;
    created_at: string;
    brand: {
        id: number;
        name: string;
        agency?: {
            id: number;
            name: string;
        } | null;
    };
};

type Agency = {
    id: number;
    name: string;
};

type Brand = {
    id: number;
    name: string;
    agency_id: number;
};

type Filters = {
    agency_id?: string;
    brand_id?: string;
};

type Props = {
    competitors: {
        data: Competitor[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: Filters;
    agencies: Agency[];
    brands: Brand[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin',
        href: '/admin',
    },
    {
        title: 'Competitors',
        href: '/admin/competitors',
    },
];

export default function AdminCompetitorsIndex({ competitors, filters, agencies, brands }: Props) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
    
    const { data, setData, processing } = useForm<Filters>({
        agency_id: filters.agency_id || 'all',
        brand_id: filters.brand_id || 'all',
    });

    const { data: competitorData, setData: setCompetitorData, post, reset } = useForm({
        brand_id: '',
        name: '',
        trackedName: '',
        domain: '',
        description: '',
    });

    const { data: editCompetitorData, setData: setEditCompetitorData, put, reset: resetEdit } = useForm({
        brand_id: '',
        name: '',
        trackedName: '',
        domain: '',
        description: '',
    });

    const handleViewCompetitor = (competitor: Competitor) => {
        setSelectedCompetitor(competitor);
        setViewDrawerOpen(true);
    };

    const handleEditCompetitor = (competitor: Competitor) => {
        setSelectedCompetitor(competitor);
        setEditCompetitorData({
            brand_id: competitor.brand.id.toString(),
            name: competitor.name,
            trackedName: competitor.name,
            domain: competitor.domain || '',
            description: competitor.description || '',
        });
        setEditDrawerOpen(true);
    };

    const handleDelete = (competitorId: number) => {
        if (confirm('Are you sure you want to delete this competitor?')) {
            router.delete(`/admin/competitors/${competitorId}`, {
                preserveScroll: true,
            });
        }
    };

    const handleFilter = () => {
        const filterData = {
            agency_id: data.agency_id === 'all' ? '' : data.agency_id,
            brand_id: data.brand_id === 'all' ? '' : data.brand_id,
        };
        
        router.get('/admin/competitors', filterData, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setData({
            agency_id: 'all',
            brand_id: 'all',
        });
        router.get('/admin/competitors');
    };

    const handleSubmitCompetitor = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/competitors', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setDrawerOpen(false);
            },
        });
    };

    const handleUpdateCompetitor = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompetitor) return;
        
        put(`/admin/competitors/${selectedCompetitor.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                resetEdit();
                setEditDrawerOpen(false);
                setSelectedCompetitor(null);
            },
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const filteredBrands = data.agency_id && data.agency_id !== 'all'
        ? brands.filter(brand => brand.agency_id.toString() === data.agency_id)
        : brands;

    const filteredBrandsForForm = competitorData.brand_id || brands;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Competitors" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
                        <DrawerTrigger asChild>
                            <Button style={{ backgroundColor: 'var(--orange-1)' }}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Competitor
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent className="h-screen w-[400px] ml-auto fixed top-0 bottom-0 right-0 flex flex-col mt-0 rounded-none" style={{ width: '35%' }}>
                            <form onSubmit={handleSubmitCompetitor}>
                                <DrawerHeader>
                                    <DrawerTitle>Add New Competitor</DrawerTitle>
                                </DrawerHeader>
                                <div className="px-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="brand_id">Brand *</Label>
                                        <Select 
                                            value={competitorData.brand_id} 
                                            onValueChange={(value) => setCompetitorData('brand_id', value)}
                                            required
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a brand" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {brands.map((brand) => (
                                                    <SelectItem key={brand.id} value={brand.id.toString()}>
                                                        {brand.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="name">Competitor Name *</Label>
                                        <Input
                                            id="name"
                                            value={competitorData.name}
                                            onChange={(e) => {
                                                setCompetitorData('name', e.target.value);
                                                // Auto-fill trackedName if it's empty
                                                if (!competitorData.trackedName) {
                                                    setCompetitorData('trackedName', e.target.value);
                                                }
                                            }}
                                            placeholder="Enter competitor name"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="trackedName">Tracked Name *</Label>
                                        <Input
                                            id="trackedName"
                                            value={competitorData.trackedName}
                                            onChange={(e) => setCompetitorData('trackedName', e.target.value)}
                                            placeholder="Name used for tracking"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="domain">Domain *</Label>
                                        <Input
                                            id="domain"
                                            type="url"
                                            value={competitorData.domain}
                                            onChange={(e) => setCompetitorData('domain', e.target.value)}
                                            placeholder="https://example.com"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            value={competitorData.description}
                                            onChange={(e) => setCompetitorData('description', e.target.value)}
                                            placeholder="Brief description"
                                        />
                                    </div>
                                </div>
                                <DrawerFooter>
                                    <Button type="submit" disabled={processing} style={{ backgroundColor: 'var(--orange-1)' }}>
                                        Add Competitor
                                    </Button>
                                    <DrawerClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                    </DrawerClose>
                                </DrawerFooter>
                            </form>
                        </DrawerContent>
                    </Drawer>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent>
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-2">
                                <Label>Agency</Label>
                                <Select value={data.agency_id} onValueChange={(value) => {
                                    setData('agency_id', value);
                                    setData('brand_id', 'all');
                                }}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="All agencies" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All agencies</SelectItem>
                                        {agencies.map((agency) => (
                                            <SelectItem key={agency.id} value={agency.id.toString()}>
                                                {agency.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Brand</Label>
                                <Select value={data.brand_id} onValueChange={(value) => setData('brand_id', value)}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="All brands" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All brands</SelectItem>
                                        {filteredBrands.map((brand) => (
                                            <SelectItem key={brand.id} value={brand.id.toString()}>
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={handleFilter} disabled={processing} style={{ backgroundColor: 'var(--orange-1)' }}>
                                Apply Filters
                            </Button>
                            <Button variant="outline" onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Edit Competitor Drawer */}
                <Drawer open={editDrawerOpen} onOpenChange={setEditDrawerOpen} direction="right">
                    <DrawerContent className="h-screen w-[400px] ml-auto fixed top-0 bottom-0 right-0 flex flex-col mt-0 rounded-none" style={{ width: '35%' }}>
                        <form onSubmit={handleUpdateCompetitor}>
                            <DrawerHeader>
                                <DrawerTitle>Edit Competitor</DrawerTitle>
                            </DrawerHeader>
                            <div className="px-4 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_brand_id">Brand *</Label>
                                    <Select 
                                        value={editCompetitorData.brand_id} 
                                        onValueChange={(value) => setEditCompetitorData('brand_id', value)}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a brand" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {brands.map((brand) => (
                                                <SelectItem key={brand.id} value={brand.id.toString()}>
                                                    {brand.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit_name">Competitor Name *</Label>
                                    <Input
                                        id="edit_name"
                                        value={editCompetitorData.name}
                                        onChange={(e) => {
                                            setEditCompetitorData('name', e.target.value);
                                            // Auto-fill trackedName if it's empty
                                            if (!editCompetitorData.trackedName) {
                                                setEditCompetitorData('trackedName', e.target.value);
                                            }
                                        }}
                                        placeholder="Enter competitor name"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit_trackedName">Tracked Name *</Label>
                                    <Input
                                        id="edit_trackedName"
                                        value={editCompetitorData.trackedName}
                                        onChange={(e) => setEditCompetitorData('trackedName', e.target.value)}
                                        placeholder="Name used for tracking"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit_domain">Domain *</Label>
                                    <Input
                                        id="edit_domain"
                                        type="url"
                                        value={editCompetitorData.domain}
                                        onChange={(e) => setEditCompetitorData('domain', e.target.value)}
                                        placeholder="https://example.com"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit_description">Description</Label>
                                    <Input
                                        id="edit_description"
                                        value={editCompetitorData.description}
                                        onChange={(e) => setEditCompetitorData('description', e.target.value)}
                                        placeholder="Brief description"
                                    />
                                </div>
                            </div>
                            <DrawerFooter>
                                <Button type="submit" disabled={processing} style={{ backgroundColor: 'var(--orange-1)' }}>
                                    Update Competitor
                                </Button>
                                <DrawerClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </form>
                    </DrawerContent>
                </Drawer>

                {/* View Competitor Drawer */}
                <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen} direction="right">
                    <DrawerContent className="h-screen w-[400px] ml-auto fixed top-0 bottom-0 right-0 flex flex-col">
                        <DrawerHeader>
                            <DrawerTitle>Competitor Details</DrawerTitle>
                        </DrawerHeader>
                        {selectedCompetitor && (
                            <div className="px-4 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-muted-foreground">Name</Label>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-base">{selectedCompetitor.name}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-muted-foreground">Brand</Label>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-base">{selectedCompetitor.brand.name}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-muted-foreground">Agency</Label>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-base">{selectedCompetitor.brand.agency?.name || 'No Agency'}</p>
                                    </div>
                                </div>

                                {selectedCompetitor.domain && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-muted-foreground">Domain</Label>
                                        <a 
                                            href={selectedCompetitor.domain} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            {selectedCompetitor.domain}
                                        </a>
                                    </div>
                                )}

                                {selectedCompetitor.description && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-muted-foreground">Description</Label>
                                        <p className="text-base text-muted-foreground">{selectedCompetitor.description}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-muted-foreground">Status</Label>
                                    <Badge className="bg-green-100 text-green-800">
                                        {selectedCompetitor.status || 'Active'}
                                    </Badge>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-muted-foreground">Created</Label>
                                    <p className="text-base">{formatDate(selectedCompetitor.created_at)}</p>
                                </div>
                            </div>
                        )}
                        <DrawerFooter>
                            <DrawerClose asChild>
                                <Button variant="outline">Close</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>

                {/* Competitors Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Competitors ({competitors.total})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div>
                            <Table className="">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Competitor</TableHead>
                                        <TableHead>Agency</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead>Website</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {competitors.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No competitors found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        competitors.data.map((competitor) => (
                                            <TableRow key={competitor.id}>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium flex items-center gap-2">
                                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                                            {competitor.name}
                                                        </div>
                                                        {competitor.description && (
                                                            <div className="text-sm text-muted-foreground">
                                                                {competitor.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {competitor.brand.agency?.name || 'No Agency'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">{competitor.brand.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {competitor.domain ? (
                                                        <a 
                                                            href={competitor.domain} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 hover:text-blue-600 text-sm"
                                                        >
                                                            {competitor.domain.replace(/^https?:\/\//, '')}
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-green-100 text-green-800">
                                                        {competitor.status || 'Active'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleViewCompetitor(competitor)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEditCompetitor(competitor)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(competitor.id)}
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        
                        {competitors.last_page > 1 && (
                            <div className="flex items-center justify-between px-2 py-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {((competitors.current_page - 1) * competitors.per_page) + 1} to{' '}
                                    {Math.min(competitors.current_page * competitors.per_page, competitors.total)} of{' '}
                                    {competitors.total} competitors
                                </div>
                                <div className="flex items-center space-x-2">
                                    {competitors.current_page > 1 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.get(`/admin/competitors?page=${competitors.current_page - 1}`)}
                                            style={{ backgroundColor: 'var(--orange-1)', color: 'white' }}
                                        >
                                            Previous
                                        </Button>
                                    )}
                                    {competitors.current_page < competitors.last_page && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.get(`/admin/competitors?page=${competitors.current_page + 1}`)}
                                            style={{ backgroundColor: 'var(--orange-1)', color: 'white' }}
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
