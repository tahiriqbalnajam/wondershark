import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { FileText, FolderOpen, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Docs & Files',
        href: '/docs-files',
    },
];

type Props = {
    title: string;
};

export default function DocsFilesIndex({ title }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <HeadingSmall 
                        title="Docs & Files"
                        description="Manage your documents and files"
                    />
                    
                    <div className="flex gap-3">
                        <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Button>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FolderOpen className="h-5 w-5" />
                                Documents
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p className="text-sm">No documents yet</p>
                                <p className="text-xs mt-2">Upload your first document to get started</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FolderOpen className="h-5 w-5" />
                                Images
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p className="text-sm">No images yet</p>
                                <p className="text-xs mt-2">Upload your first image to get started</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FolderOpen className="h-5 w-5" />
                                Other Files
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p className="text-sm">No files yet</p>
                                <p className="text-xs mt-2">Upload your first file to get started</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Recent Files
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-20 w-20 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">No files uploaded</h3>
                            <p className="text-sm mb-4">
                                Start by uploading your documents, images, or other files.
                            </p>
                            <Button>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Your First File
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
