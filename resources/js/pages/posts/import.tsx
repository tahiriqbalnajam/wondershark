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
    Info,
} from 'lucide-react';

type Brand = {
    id: number;
    name: string;
    monthly_posts: number | null;
};

type Flash = {
    success?: string;
    error?: string;
    import_errors?: string[];
    imported_count?: number;
};

type Props = {
    brands: Brand[];
    upgrade_message?: string;
    flash?: Flash;
};

const breadcrumbItems: BreadcrumbItem[] = [
    { title: 'Posts', href: '/posts' },
    { title: 'Import from CSV', href: '/posts/agency-import' },
];

export default function PostImport({
    brands = [],
    upgrade_message,
    flash,
}: Props) {
    const success = flash?.success;
    const error = flash?.error;
    const import_errors = flash?.import_errors;
    const imported_count = flash?.imported_count;
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showAllErrors, setShowAllErrors] = useState(false);

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
        post(route('posts.agency-import.store'), {
            forceFormData: true,
        });
    };

    const downloadTemplate = () => {
        window.open(route('posts.agency-import.template'), '_blank');
    };

    const downloadErrorReport = () => {
        const lines = (import_errors ?? []).map((e) => `ERROR: ${e}`);
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const PREVIEW_LIMIT = 5;
    const hasErrors = (import_errors?.length ?? 0) > 0;
    const visibleErrors = showAllErrors ? (import_errors ?? []) : (import_errors ?? []).slice(0, PREVIEW_LIMIT);

    return (
        <AppLayout breadcrumbs={breadcrumbItems}>
            <Head title="Import Posts from CSV" />

            <div className="space-y-6">
                {upgrade_message && (
                    <Alert className="border-blue-200 bg-blue-50">
                        <AlertDescription className="text-blue-800">
                            <strong>Upgrade Required:</strong> {upgrade_message}
                        </AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="border-green-200 bg-green-50">
                        <AlertDescription className="text-green-800">
                            {success}
                            {imported_count !== undefined && (
                                <span className="font-medium ml-2">
                                    ({imported_count} post{imported_count !== 1 ? 's' : ''} imported)
                                </span>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-800">{error}</AlertDescription>
                    </Alert>
                )}

                {hasErrors && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertDescription className="text-yellow-800">
                            <div className="flex items-center justify-between mb-2">
                                <strong>Import Errors ({import_errors!.length}):</strong>
                                {import_errors!.length > PREVIEW_LIMIT && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={downloadErrorReport}
                                        className="text-xs"
                                    >
                                        <Download className="h-3 w-3 mr-1" />
                                        Download Report
                                    </Button>
                                )}
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                                {visibleErrors.map((err, index) => (
                                    <li key={index} className="text-sm">
                                        {err}
                                    </li>
                                ))}
                            </ul>
                            {import_errors!.length > PREVIEW_LIMIT && (
                                <button
                                    type="button"
                                    onClick={() => setShowAllErrors((v) => !v)}
                                    className="text-sm font-medium mt-2 underline"
                                >
                                    {showAllErrors ? 'Show less' : `Show all ${import_errors!.length} errors`}
                                </button>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <HeadingSmall
                    title="Import Posts from CSV"
                    description="Upload a CSV file to import multiple posts at once"
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
                                    <fieldset disabled={!!upgrade_message || brands.length === 0} className="space-y-6">
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

                                        <div className="space-y-2">
                                            <Label htmlFor="default_brand_id">Default Brand (optional)</Label>
                                            <Select
                                                value={data.default_brand_id}
                                                onValueChange={(value) => setData('default_brand_id', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a default brand" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No default brand</SelectItem>
                                                    {brands.map((brand) => (
                                                        <SelectItem key={brand.id} value={brand.id.toString()}>
                                                            {brand.name}
                                                            {brand.monthly_posts && (
                                                                <span className="text-gray-500 ml-2">
                                                                    (Limit: {brand.monthly_posts}/month)
                                                                </span>
                                                            )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.default_brand_id && (
                                                <div className="text-sm text-red-600">{errors.default_brand_id}</div>
                                            )}
                                            <div className="text-sm text-gray-600">
                                                Used for rows that don't specify a brand_id or brand_name
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="default_status">Default Status</Label>
                                            <Select
                                                value={data.default_status}
                                                onValueChange={(value: 'published' | 'draft' | 'archived') =>
                                                    setData('default_status', value)
                                                }
                                            >
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
                                                Used for rows that don't specify a status
                                            </div>
                                        </div>
                                    </fieldset>

                                    <Button
                                        type="submit"
                                        disabled={processing || !selectedFile || !!upgrade_message || brands.length === 0}
                                        className="w-full"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {processing ? 'Importing…' : 'Import Posts'}
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
                                            <li>
                                                <code>url</code> — The post URL
                                            </li>
                                        </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <strong>Brand Selection (choose one):</strong>
                                        <ul className="list-disc list-inside ml-2 mt-1 text-gray-600">
                                            <li>
                                                <code>brand_id</code> — Brand ID number
                                            </li>
                                            <li>
                                                <code>brand_name</code> — Brand name (exact match)
                                            </li>
                                            <li>Leave both empty to use the default brand above</li>
                                        </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <strong>Optional Columns:</strong>
                                        <ul className="list-disc list-inside ml-2 mt-1 text-gray-600">
                                            <li>
                                                <code>title</code> — Auto-generated from domain if empty
                                            </li>
                                            <li>
                                                <code>description</code> — Can be empty
                                            </li>
                                            <li>
                                                <code>status</code> — published / draft / archived
                                            </li>
                                            <li>
                                                <code>posted_at</code> — Date in YYYY-MM-DD format
                                            </li>
                                            <li>
                                                <code>post_type</code> — e.g. blog, news, article
                                            </li>
                                        </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <strong>Default Values:</strong>
                                        <ul className="list-disc list-inside ml-2 mt-1 text-gray-600">
                                            <li>Title: "Post from domain.com"</li>
                                            <li>Status: as selected above</li>
                                            <li>Date: today's date</li>
                                        </ul>
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
