import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from "@/components/ui/textarea";
import AppLayout from '@/layouts/app-layout';
import { 
    MessageSquare, 
    Filter,
    Building2,
    Users,
    Calendar,
    Eye,
    Trash2,
    Plus,
    Sparkles
} from 'lucide-react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';

type Prompt = {
    id: number;
    prompt: string;
    type: 'brand' | 'post';
    country_code: string;
    is_active: boolean;
    status?: string;
    created_at: string;
    brand?: {
        id: number;
        name: string;
        agency?: {
            id: number;
            name: string;
        } | null;
    };
    post?: {
        id: number;
        title: string;
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
    type?: string;
};

type Props = {
    prompts: {
        data: Prompt[];
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
        title: 'Prompts',
        href: '/admin/prompts',
    },
];

export default function AdminPromptsIndex({ prompts, filters, agencies, brands }: Props) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [promptMode, setPromptMode] = useState<'manual' | 'ai'>('manual');
    
    const { data, setData, processing } = useForm<Filters>({
        agency_id: filters.agency_id || 'all',
        brand_id: filters.brand_id || 'all',
        type: filters.type || 'all',
    });

    const { data: promptData, setData: setPromptData, post, reset } = useForm({
        brand_id: '',
        prompt: '',
        type: 'brand',
        country_code: 'US',
        generate_with_ai: false,
    });

    const handleDelete = (promptId: number) => {
        if (confirm('Are you sure you want to delete this prompt?')) {
            router.delete(`/admin/prompts/${promptId}`, {
                preserveScroll: true,
            });
        }
    };

    const handleSubmitPrompt = (e: React.FormEvent) => {
        e.preventDefault();
        
        const formData = {
            ...promptData,
            generate_with_ai: promptMode === 'ai',
        };
        
        post('/admin/prompts', {
            data: formData,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setDrawerOpen(false);
                setPromptMode('manual');
            },
        });
    };

    const handleFilter = () => {
        const filterData = {
            agency_id: data.agency_id === 'all' ? '' : data.agency_id,
            brand_id: data.brand_id === 'all' ? '' : data.brand_id,
            type: data.type === 'all' ? '' : data.type,
        };
        
        router.get('/admin/prompts', filterData, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setData({
            agency_id: 'all',
            brand_id: 'all',
            type: 'all',
        });
        router.get('/admin/prompts');
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

    const getTypeColor = (type: string) => {
        return type === 'brand' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-purple-100 text-purple-800';
    };

    const getStatusColor = (isActive: boolean) => {
        return isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Prompts" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
                        <DrawerTrigger asChild>
                            <Button style={{ backgroundColor: 'var(--orange-1)' }}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Prompt
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent className="h-screen w-[500px] ml-auto fixed top-0 bottom-0 right-0 flex flex-col mt-0 rounded-none" style={{ width: '40%' }}>
                            <form onSubmit={handleSubmitPrompt}>
                                <DrawerHeader>
                                    <DrawerTitle>Add New Prompt</DrawerTitle>
                                </DrawerHeader>
                                <div className="px-4 space-y-4 overflow-y-auto flex-1">
                                    {/* Mode Selection */}
                                    <div className="space-y-2">
                                        <Label>Prompt Creation Mode</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant={promptMode === 'manual' ? 'default' : 'outline'}
                                                onClick={() => setPromptMode('manual')}
                                                className="flex-1"
                                                style={promptMode === 'manual' ? { backgroundColor: 'var(--orange-1)' } : {}}
                                            >
                                                Manual
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={promptMode === 'ai' ? 'default' : 'outline'}
                                                onClick={() => setPromptMode('ai')}
                                                className="flex-1"
                                                style={promptMode === 'ai' ? { backgroundColor: 'var(--orange-1)' } : {}}
                                            >
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                AI Generate
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="type">Type *</Label>
                                        <Select 
                                            value={promptData.type} 
                                            onValueChange={(value) => setPromptData('type', value)}
                                            required
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="brand">Brand</SelectItem>
                                                <SelectItem value="post">Post</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="brand_id">Brand *</Label>
                                        <Select 
                                            value={promptData.brand_id} 
                                            onValueChange={(value) => setPromptData('brand_id', value)}
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
                                        <Label htmlFor="country_code">Country Code *</Label>
                                        <Input
                                            id="country_code"
                                            value={promptData.country_code}
                                            onChange={(e) => setPromptData('country_code', e.target.value)}
                                            placeholder="US"
                                            required
                                            maxLength={2}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="prompt">
                                            {promptMode === 'manual' ? 'Prompt Text *' : 'AI Instructions (optional)'}
                                        </Label>
                                        <Textarea
                                            id="prompt"
                                            value={promptData.prompt}
                                            onChange={(e) => setPromptData('prompt', e.target.value)}
                                            placeholder={promptMode === 'manual' 
                                                ? 'Enter the prompt text...' 
                                                : 'Provide additional instructions for AI generation...'}
                                            required={promptMode === 'manual'}
                                            rows={8}
                                            className="resize-none"
                                        />
                                        {promptMode === 'ai' && (
                                            <p className="text-sm text-muted-foreground">
                                                AI will generate a prompt based on the brand and type. You can provide additional context here.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <DrawerFooter>
                                    <Button 
                                        type="submit" 
                                        disabled={processing} 
                                        style={{ backgroundColor: 'var(--orange-1)' }}
                                    >
                                        {promptMode === 'ai' ? (
                                            <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Generate with AI
                                            </>
                                        ) : (
                                            'Add Prompt'
                                        )}
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

                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={data.type} onValueChange={(value) => setData('type', value)}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="All types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All types</SelectItem>
                                        <SelectItem value="brand">Brand</SelectItem>
                                        <SelectItem value="post">Post</SelectItem>
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

                {/* Prompts Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Prompts ({prompts.total})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div>
                            <Table className="">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Prompt</TableHead>
                                        <TableHead className="w-[80px]">Type</TableHead>
                                        <TableHead>Agency</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead className="w-[80px]">Country</TableHead>
                                        <TableHead className="w-[100px]">Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-[80px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {prompts.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                No prompts found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        prompts.data.map((prompt) => (
                                            <TableRow key={`${prompt.type}-${prompt.id}`}>
                                                <TableCell className="max-w-lg">
                                                    <div className="max-w-md">
                                                        <p className="text-sm line-clamp-2">
                                                            {prompt.prompt}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getTypeColor(prompt.type)}>
                                                        {prompt.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {prompt.brand?.agency?.name || 'No Agency'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {prompt.brand?.name || 'N/A'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xl">
                                                        {prompt.country_code ? getUnicodeFlagIcon(prompt.country_code) : '🌐'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusColor(prompt.is_active)}>
                                                        {prompt.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Calendar className="h-4 w-4" />
                                                        {formatDate(prompt.created_at)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setData({
                                                                        agency_id: prompt.brand?.agency?.id?.toString() || 'all',
                                                                        brand_id: prompt.brand?.id?.toString() || 'all',
                                                                        type: prompt.type,
                                                                    });
                                                                    router.get('/admin/prompts', {
                                                                        agency_id: prompt.brand?.agency?.id || '',
                                                                        brand_id: prompt.brand?.id || '',
                                                                        type: prompt.type,
                                                                    }, {
                                                                        preserveState: true,
                                                                        preserveScroll: true,
                                                                    });
                                                                }}
                                                            >
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View Brand Prompts
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(prompt.id)}
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
                        
                        {prompts.last_page > 1 && (
                            <div className="flex items-center justify-between px-2 py-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {((prompts.current_page - 1) * prompts.per_page) + 1} to{' '}
                                    {Math.min(prompts.current_page * prompts.per_page, prompts.total)} of{' '}
                                    {prompts.total} prompts
                                </div>
                                <div className="flex items-center space-x-2">
                                    {prompts.current_page > 1 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.get(`/admin/prompts?page=${prompts.current_page - 1}`)}
                                            style={{ backgroundColor: 'var(--orange-1)', color: 'white' }}
                                        >
                                            Previous
                                        </Button>
                                    )}
                                    {prompts.current_page < prompts.last_page && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.get(`/admin/prompts?page=${prompts.current_page + 1}`)}
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
