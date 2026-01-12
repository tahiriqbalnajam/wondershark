import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { FileText, FolderOpen, Upload, Download, CirclePlus, Ellipsis,ArrowUpFromLine,Folder,Trash2,Archive,SquarePen,Copy,Redo } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bg } from 'date-fns/locale';

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
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <label htmlFor="">Brand</label>
                        <Select>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Brands" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                <SelectLabel>Brand 1</SelectLabel>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
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

                <Card>
                    <CardHeader className='flex justify-between flex-row items-center'>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild className='rounded-full primary-btn btn-sm border-0'>
                                <Button variant="outline"><CirclePlus/> New ...</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-w-40" align="start">
                                <DropdownMenuLabel className='px-5 py-3 flex items-center gap-3'><Folder/> Make a New Folder</DropdownMenuLabel>
                                <DropdownMenuLabel className='px-5 py-3 flex items-center gap-3'><ArrowUpFromLine/> Upload Files</DropdownMenuLabel>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <CardTitle className='font-bold'>
                            Docs & Files
                        </CardTitle>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild className='rounded-full h-10 w-10'>
                                <Button variant="outline"><Ellipsis/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-w-40" style={{ background:"#FF5B49"}} align="start">
                                <DropdownMenuLabel className='px-5 py-3 flex items-center gap-3 text-white'><Redo/> Move</DropdownMenuLabel>
                                <DropdownMenuLabel className='px-5 py-3 flex items-center gap-3 text-white'><Copy/> Copy</DropdownMenuLabel>
                                <DropdownMenuLabel className='px-5 py-3 flex items-center gap-3 text-white'><SquarePen/> Rename this folder</DropdownMenuLabel>
                                <DropdownMenuLabel className='px-5 py-3 flex items-center gap-3 text-white'><Archive/> Archive</DropdownMenuLabel>
                                <DropdownMenuLabel className='px-5 py-3 flex items-center gap-3 text-white'><Trash2/> Put in The Trash</DropdownMenuLabel>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <hr/>
                    <CardContent>
                        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-5">
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
                    </CardContent>
                
                </Card>
            </div>
        </AppLayout>
    );
}
