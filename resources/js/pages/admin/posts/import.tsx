import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { 
    Upload, 
    Download, 
    FileSpreadsheet, 
    Info
} from 'lucide-react';

type Brand = {
    id: number;
    name: string;
    agency_id: number;
    can_create_posts: boolean;
    monthly_posts: number | null;
};

type Agency = {
    id: number;
    name: string;
};

type Props = {
    brands: Brand[];
    agencies: Agency[];
    success?: string;
    error?: string;
    import_errors?: string[];
    imported_count?: number;
};

const breadcrumbItems: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Posts', href: '/admin/posts' },
    { title: 'Import from CSV', href: '/posts/admin-import' },
];

export default function AdminPostImport({ brands = [], agencies = [], success, error, import_errors, imported_count }: Props) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedAgency, setSelectedAgency] = useState<string>('all');
    
    const { data, setData, post, processing, errors } = useForm({
        csv_file: null as File | null,
        default_brand_id: 'none',
        default_status: 'published' as 'published' | 'draft' | 'archived',
    });

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
        setData('csv_file', file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('posts.admin-import.store'), {
            forceFormData: true,
        });
    };

    const downloadTemplate = () => {
        window.open(route('posts.admin-import.template'), '_blank');
    };

    const filteredBrands = selectedAgency && selectedAgency !== 'all'
        ? brands.filter(brand => brand.agency_id.toString() === selectedAgency)
        : brands;

    return (
        <AppLayout breadcrumbs={breadcrumbItems}>
            <Head title="Admin - Import Posts from CSV" />

            <div className="space-y-6">
                {success && (
                    <Alert className="border-green-200 bg-green-50">
                        <AlertDescription className="text-green-800">
                            {success}
                            {imported_count && <span className="font-medium ml-2">({imported_count} posts imported)</span>}
                        </AlertDescription>
                    </Alert>
                )}
                
                {error && (
                    <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-800">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}
                
                {import_errors && import_errors.length > 0 && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertDescription className="text-yellow-800">
                            <strong>Import Errors/Warnings:</strong>
                            <ul className="list-disc list-inside mt-2">
                                {import_errors.slice(0, 5).map((err, index) => (
                                    <li key={index} className="text-sm">{err}</li>
                                ))}
                                {import_errors.length > 5 && (
                                    <li className="text-sm font-medium">... and {import_errors.length - 5} more errors</li>
                                )}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                <HeadingSmall
                    title="Import Posts from CSV (Admin)"
                    description="Upload a CSV file to import multiple posts for any brand (admin privileges)"
                />

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="h-5 w-5" />
                                    Upload CSV File
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="csv_file">CSV File *</Label>
                                        <Input
                                            id="csv_file"
                                            type="file"
                                            accept=".csv,.txt"
                                            onChange={handleFileSelect}
                                            className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                                        />
                                        {errors.csv_file && (
                                            <div className="text-sm text-red-600">{errors.csv_file}</div>
                                        )}
                                        {selectedFile && (
                                            <div className="text-sm text-gray-600 flex items-center gap-2">
                                                <FileSpreadsheet className="h-4 w-4" />
                                                {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="agency_filter">Filter by Agency (optional)</Label>
                                            <Select value={selectedAgency} onValueChange={(value) => setSelectedAgency(value === 'all' ? '' : value)}>
                                                <SelectTrigger>
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
                                            <Label htmlFor="default_brand_id">Default Brand (optional)</Label>
                                            <Select value={data.default_brand_id} onValueChange={(value) => setData('default_brand_id', value === 'none' ? '' : value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a default brand" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No default brand</SelectItem>
                                                    {filteredBrands.map((brand) => (
                                                        <SelectItem key={brand.id} value={brand.id.toString()}>
                                                            {brand.name}
                                                            {!brand.can_create_posts && (
                                                                <span className="text-red-500 ml-2">(No permission)</span>
                                                            )}
                                                            {brand.monthly_posts && (
                                                                <span className="text-gray-500 ml-2">
                                                                    (Limit: {brand.monthly_posts}/month)
                                                                </span>
                                                            )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <div className="text-sm text-gray-600">
                                                Used for rows without brand_id
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="default_status">Default Status</Label>
                                        <Select value={data.default_status} onValueChange={(value: 'published' | 'draft' | 'archived') => setData('default_status', value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="published">Published</SelectItem>
                                                <SelectItem value="draft">Draft</SelectItem>
                                                <SelectItem value="archived">Archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="text-sm text-gray-600">
                                            Used for rows without status
                                        </div>
                                    </div>

                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <div className="text-sm text-yellow-800">
                                            <strong>Admin Note:</strong> You can import posts even if brands don't have post creation 
                                            permissions or have exceeded monthly limits. Warnings will be shown but imports will proceed.
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={processing || !selectedFile}
                                        className="w-full"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {processing ? 'Importing...' : 'Import Posts'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Download className="h-5 w-5" />
                                    CSV Template
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 mb-4">
                                    Download a template CSV file to see the required format and example data.
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={downloadTemplate}
                                    className="w-full"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Template
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    CSV Format
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <strong>Required Columns:</strong>
                                        <ul className="list-disc list-inside ml-2 mt-1 text-gray-600">
                                            <li>url - The post URL</li>
                                        </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <strong>Brand Selection (choose one):</strong>
                                        <ul className="list-disc list-inside ml-2 mt-1 text-gray-600">
                                            <li>brand_id - Brand ID number</li>
                                            <li>brand_name - Brand name (exact match)</li>
                                            <li>Leave both empty to use default brand</li>
                                        </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <strong>Optional Columns:</strong>
                                        <ul className="list-disc list-inside ml-2 mt-1 text-gray-600">
                                            <li>title - Auto-generated if empty</li>
                                            <li>description - Can be empty</li>
                                            <li>status - published/draft/archived</li>
                                            <li>posted_at - Date (YYYY-MM-DD)</li>
                                        </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <strong>Brand IDs:</strong>
                                        <div className="max-h-32 overflow-y-auto mt-2 text-xs bg-gray-50 rounded p-2">
                                            {brands.slice(0, 10).map((brand) => (
                                                <div key={brand.id} className="flex justify-between py-1">
                                                    <span>{brand.name}</span>
                                                    <span className="font-mono">ID: {brand.id}</span>
                                                </div>
                                            ))}
                                            {brands.length > 10 && (
                                                <div className="text-center text-gray-500 py-1">
                                                    ... and {brands.length - 10} more brands
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
