import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { FileText, FolderOpen, Upload, Download, CirclePlus, Ellipsis,ArrowUpFromLine,Folder,Trash2,Archive,SquarePen,Copy,Redo, MoreVertical, List, Grid3x3, ArrowUpDown } from 'lucide-react';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { router, usePage } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { COLORS, type ColorKey, getColorClasses } from '@/utils/colorUtils';

type FileModel = {
    id: number;
    name: string;
    original_name: string;
    path: string;
    mime_type: string;
    size: number;
    size_for_humans: string;
    folder: string | null;
    url: string;
    color?: string;
    user: {
        name: string;
    };
    brand: {
        name: string;
    } | null;
    created_at: string;
};

type FolderModel = {
    id: number;
    name: string;
    parent: string | null;
    color?: string;
    user: {
        name: string;
    };
    brand: {
        name: string;
    } | null;
};

type Brand = {
    id: number;
    name: string;
};

type Props = {
    title: string;
    files: FileModel[];
    folders: FolderModel[];
    allFiles: FileModel[]; 
    allFolders: FolderModel[];
    brands: Brand[];
    currentBrand?: number;
    currentFolder?: string;
    userPreferences?: {
        viewMode: 'grid' | 'list';
        sortBy: 'name' | 'date' | 'size';
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Docs & Files',
        href: '/docs-files',
    },
];

/**
 * Get all descendant folder paths for a given folder
 */
function getDescendantFolders(folders: FolderModel[], parentId: number | null, targetPath: string | null): Set<string> {
    const descendants = new Set<string>();
    
    function collectDescendants(path: string) {
        folders.forEach(folder => {
            if (folder.parent === path) {
                const folderPath = folder.name;
                const fullPath = path ? `${path}/${folderPath}` : folderPath;
                descendants.add(fullPath);
                collectDescendants(fullPath);
            }
        });
    }
    
    if (targetPath) {
        collectDescendants(targetPath);
    }
    
    return descendants;
}

export default function DocsFilesIndex({ title, files, allFiles, folders, allFolders, brands, currentBrand, currentFolder, userPreferences }: Props) {
    const folderParts = currentFolder ? currentFolder.split('/') : [];
    const dynamicBreadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Docs & Files',
            href: '/docs-files',
        },
        ...folderParts.map((part, index) => ({
            title: part,
            href: '/docs-files?folder=' + folderParts.slice(0, index + 1).join('/')
        }))
    ];
    const [uploading, setUploading] = useState(false);
    const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
    const [showMoveFolderModal, setShowMoveFolderModal] = useState(false);
    const [showCopyFolderModal, setShowCopyFolderModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<FolderModel | null>(null);
    const [showMoveFileModal, setShowMoveFileModal] = useState(false);
    const [showCopyFileModal, setShowCopyFileModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<FileModel | null>(null);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedMoveFolderDestination, setSelectedMoveFolderDestination] = useState('');
    const [selectedCopyFolderDestination, setSelectedCopyFolderDestination] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(userPreferences?.viewMode ?? 'grid');
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>(userPreferences?.sortBy ?? 'date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors } = useForm({
        file: null as File | null,
        brand_id: currentBrand?.toString() || '',
        folder: currentFolder || '',
    });

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setData('file', file);
        }
    };

    const handleUpload = () => {
        if (!data.file) return;

        const formData = new FormData();
        formData.append('file', data.file);
        if (data.brand_id) formData.append('brand_id', data.brand_id);
        if (data.folder) formData.append('folder', data.folder);

        setUploading(true);
        router.post('/docs-files', formData, {
            forceFormData: true,
            onSuccess: () => {
                setData('file', null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setUploading(false);
            },
            onError: () => {
                setUploading(false);
            },
        });
    };

    const handleBrandChange = (brandId: string) => {
        router.get(
            '/docs-files',
            brandId === 'all' ? {} : { brand_id: brandId },
            { preserveState: true }
        );
    };

    const handleDelete = (file: FileModel) => {
        if (confirm('Are you sure you want to delete this file?')) {
            router.delete(`/docs-files/${file.id}`);
        }
    };

    const handleCreateFolder = () => {
        const folderName = window.prompt('Enter folder name:');
        if (folderName) {
            router.post('/docs-files/folders', { name: folderName, parent: currentFolder || '', brand_id: data.brand_id || null });
        }
    };

    const handleUploadFilesClick = () => {
        fileInputRef.current?.click();
    };

    const handleMove = (file: FileModel) => {
        setSelectedFile(file);
        setShowMoveFileModal(true);
    };
    const handleCopy = (file: FileModel) => {
        setSelectedFile(file);
        setShowCopyFileModal(true);
    };

    const handleRenameFolder = (folder: FolderModel) => {
        const newName = window.prompt('Enter new folder name:', folder.name);
        if (newName && newName !== folder.name) {
            router.put(`/docs-files/folders/${folder.id}`, { name: newName }, {
                onSuccess: () => router.reload()
            });
        }
    };

    const handleMoveFolder = (folder: FolderModel) => {
        setSelectedFolder(folder);
        setShowMoveFolderModal(true);
    };

    const handleCopyFolder = (folder: FolderModel) => {
        setSelectedFolder(folder);
        setShowCopyFolderModal(true);
    };

    const handleDeleteFolder = (folder: FolderModel) => {
        if (confirm('Are you sure you want to delete this folder and all its contents?')) {
            router.delete(`/docs-files/folders/${folder.id}`, {
                onSuccess: () => router.reload()
            });
        }
    };

    const handleDownloadFolder = (folder: FolderModel) => {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = `/docs-files/folders/${folder.id}/download`;
        link.download = `${folder.name}.zip`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadFile = (file: FileModel) => {
        setDownloadingFileId(file.id);
        toast.info(`Downloading ${file.original_name}...`);
        
        const link = document.createElement('a');
        link.href = `/docs-files/${file.id}/download`;
        link.download = file.original_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Reset downloading state after a short delay
        setTimeout(() => {
            setDownloadingFileId(null);
            toast.success(`Download started for ${file.original_name}`);
        }, 1000);
    };

    const savePreferences = (view: 'grid' | 'list', sort: 'name' | 'date' | 'size') => {
        router.post('/docs-files/preferences', {
            view_mode: view,
            sort_by: sort,
        }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const handleViewModeChange = (newMode: 'grid' | 'list') => {
        setViewMode(newMode);
        savePreferences(newMode, sortBy);
    };

    const handleSortChange = (newSort: 'name' | 'date' | 'size') => {
        if (sortBy === newSort) {
            // Toggle direction if same sort is clicked
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSort);
            setSortDirection('asc');
            savePreferences(viewMode, newSort);
        }
    };

    const handleUpdateFolderColor = (folder: FolderModel, color: string) => {
        router.put(`/docs-files/folders/${folder.id}/color`, { color }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success(`Folder color updated to ${color}`);
                router.reload();
            },
        });
    };

    const handleUpdateFileColor = (file: FileModel, color: string) => {
        router.put(`/docs-files/files/${file.id}/color`, { color }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success(`File color updated to ${color}`);
                router.reload();
            },
        });
    };

    const handleDrop = (data: string, folder: FolderModel) => {
        const [type, id] = data.split(':');
        const dest = folder.parent ? `${folder.parent}/${folder.name}` : folder.name;
        if (type === 'file') {
            router.put(`/docs-files/${id}/move`, { folder: dest });
        } else if (type === 'folder') {
            router.put(`/docs-files/folders/${id}/move`, { parent: dest });
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType === 'application/pdf') return '📄';
        if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
        return '📄';
    };
    return (
        <AppLayout breadcrumbs={dynamicBreadcrumbs}>
            <Head title={title} />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <HeadingSmall
                        title="Docs & Files"
                        description="Manage your documents and files"
                    />
                </div>
                {currentFolder && (
                    <div className="text-sm text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <a href="/docs-files" className="text-blue-600 hover:underline">Docs & Files</a>
                            {folderParts.map((part, index) => (
                                <span key={index}>
                                    {' > '}
                                    <a href={`/docs-files?folder=${folderParts.slice(0, index + 1).join('/')}`} className="text-blue-600 hover:underline">
                                        {part}
                                    </a>
                                </span>
                            ))}
                        </div>
                        
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <div>
                        <label htmlFor="brand-select" className="text-sm font-medium">Brand</label>
                        <Select value={currentBrand?.toString() || 'all'} onValueChange={handleBrandChange}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Brands" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Brands</SelectItem>
                                {brands.map((brand) => (
                                    <SelectItem key={brand.id} value={brand.id.toString()}>
                                        {brand.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-3">
                        {/* <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button> */}
                        <label htmlFor="file-upload">
                            <Button asChild>
                                <span>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload File
                                </span>
                            </Button>
                        </label>
                        <Input
                            ref={fileInputRef}
                            id="file-upload"
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                            accept="*/*"
                        />
                        {data.file && (
                            <Button onClick={handleUpload} disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Upload'}
                            </Button>
                        )}
                    </div>
                </div>

                <Card className="border-0 shadow-md">
                    <CardHeader className='flex justify-between flex-row items-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white'>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild className='rounded-full primary-btn btn-sm border-0'>
                                <Button variant="outline" className="bg-white hover:bg-gray-100"><CirclePlus className="h-4 w-4 mr-2"/> New ...</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-w-40" align="start">
                                <DropdownMenuItem onClick={handleCreateFolder}><Folder className="mr-2 h-4 w-4" /> Make a New Folder</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleUploadFilesClick} className='px-5 py-3 flex items-center gap-3'><ArrowUpFromLine className="h-4 w-4 mr-2"/> Upload Files</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <CardTitle className='font-bold text-xl'>
                            Docs & Files
                        </CardTitle>
                        <div className="w-20" />
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <ArrowUpDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleSortChange('name')}>
                                        {sortBy === 'name' && '✓ '}Sort by Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSortChange('date')}>
                                        {sortBy === 'date' && '✓ '}Sort by Date {sortBy === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSortChange('size')}>
                                        {sortBy === 'size' && '✓ '}Sort by Size {sortBy === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
                            >
                                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {files.length > 0 || folders.length > 0 ? (
                            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-2"}>
                                {[...folders].sort((a, b) => {
                                    let compareResult = 0;
                                    if (sortBy === 'name') {
                                        compareResult = a.name.localeCompare(b.name);
                                    } else {
                                        // Folders don't have date/size, so just use name for other sorts
                                        compareResult = a.name.localeCompare(b.name);
                                    }
                                    return sortDirection === 'asc' ? compareResult : -compareResult;
                                }).map((folder) => {
                                    const fullPath = folder.parent ? `${folder.parent}/${folder.name}` : folder.name;
                                    
                                    // Get child items for preview
                                    const childFolders = folders.filter(f => f.parent === fullPath);
                                    // const childFiles = files.filter(f => f.folder === fullPath);
                                    const childFiles = allFiles.filter(f => f.folder === fullPath);


                                    // total count
                                    const totalItems = childFolders.length + childFiles.length;

                                    // limit preview to max 3
                                    const previewItems = [
                                    ...childFiles.map(f => ({ type: 'file', name: f.original_name, mime_type: f.mime_type }))
                                    ].slice(0, 4);

                                    
                                    const folderColor = getColorClasses(folder.color);
                                    
                                    return (
                                        <div 
                                            key={folder.id}
                                            className={`group relative flex ${viewMode === 'list' ? 'flex-row' : 'flex-col'} ${folderColor.bg} rounded-lg border-2 transition-all duration-200 ${
                                                dragOverFolder === folder.id.toString() 
                                                    ? 'border-blue-400 shadow-lg' 
                                                    : `${folderColor.border} hover:shadow-md shadow-sm`
                                            }`}
                                        >
                                            {/* Folder Header with Preview */}
                                            <div 
                                                draggable={true}
                                                onDragStart={(e) => {
                                                    setIsDragging(true);
                                                    e.dataTransfer.setData('text/plain', 'folder:' + folder.id.toString());
                                                }}
                                                onDragEnd={() => setIsDragging(false)}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDragEnter={() => setDragOverFolder(folder.id.toString())}
                                                onDragLeave={() => setDragOverFolder(null)}
                                                onDrop={(e) => {
                                                    const data = e.dataTransfer.getData('text/plain');
                                                    handleDrop(data, folder);
                                                    setDragOverFolder(null);
                                                }}
                                                onClick={() => !isDragging && router.get('/docs-files', { folder: fullPath })}
                                                className={`${viewMode === 'list' ? 'w-24 h-24' : 'flex-1'} p-6 flex flex-col items-center justify-center cursor-pointer relative ${viewMode === 'grid' ? 'min-h-48' : ''}`}
                                            >
                                                {/* Folder Icon + Preview */}
                                                {viewMode === 'grid' ? (
                                                    <>
                                                        {childFiles.length === 0 && (
                                                            <div className="text-6xl">
                                                                📁
                                                            </div>
                                                        )}

                                                        {previewItems.length > 0 && (
                                                            <div className="w-full h-full flex flex-wrap gap-2 items-center justify-center">
                                                                {previewItems.map((item, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="flex-1 min-w-16 h-16 bg-white rounded border flex items-center justify-center text-3xl shadow hover:shadow-md transition-shadow"
                                                                        title={item.name}
                                                                    >
                                                                        {getFileIcon(item.mime_type)}
                                                                    </div>
                                                                ))}

                                                                {totalItems > 4 && (
                                                                    <div className="flex-1 min-w-16 h-16 bg-gray-800 text-white text-xl flex items-center justify-center rounded shadow font-semibold">
                                                                        +{totalItems - 4}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="text-4xl">📁</div>
                                                )}

                                                
                                                <h3 className="font-semibold text-gray-900 text-center break-words w-full line-clamp-2 mt-2">{folder.name}</h3>
                                            </div>

                                            {/* Folder Footer */}
                                            <div className={`px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50 ${viewMode === 'list' ? 'rounded-r' : 'rounded-b'} no-drag`}>
                                                {viewMode === 'list' ? (
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <h3 className="font-semibold text-gray-900 text-sm">{folder.name}</h3>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                                            <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                                                            <span>•</span>
                                                            <span>by {folder.user.name}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-medium text-gray-700">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="max-w-40" style={{ background:"#FF5B49"}} align="end">
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder); }}className='px-5 py-3 flex items-center gap-3 text-white'>
                                                            <SquarePen className="h-4 w-4"/>
                                                            Rename
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSub>
                                                            <DropdownMenuSubTrigger className='px-5 py-3 flex items-center gap-3 text-white'>
                                                                <div className="h-4 w-4 rounded-full" style={{backgroundColor: COLORS[(folder.color || 'gray') as ColorKey].hex}}></div>
                                                                Color
                                                            </DropdownMenuSubTrigger>
                                                            <DropdownMenuSubContent>
                                                                {Object.entries(COLORS).map(([key, color]) => (
                                                                    <DropdownMenuItem 
                                                                        key={key}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleUpdateFolderColor(folder, key);
                                                                        }}
                                                                        className='flex items-center gap-3'
                                                                    >
                                                                        <div className={`h-4 w-4 rounded-full ${color.dot}`}></div>
                                                                        {color.name}
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuSub>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMoveFolder(folder); }}className='px-5 py-3 flex items-center gap-3 text-white'>
                                                            <Redo className="h-4 w-4"/>
                                                            Move
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyFolder(folder); }}className='px-5 py-3 flex items-center gap-3 text-white'>
                                                            <Copy className="h-4 w-4"/>
                                                            Copy
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadFolder(folder); }}className='px-5 py-3 flex items-center gap-3 text-white'>
                                                            <Download className="h-4 w-4"/>
                                                            Download 
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}className='px-5 py-3 flex items-center gap-3 text-red-600'>
                                                            <Trash2 className="h-4 w-4"/>
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    );
                                })}
                                {[...files].sort((a, b) => {
                                    let compareResult = 0;
                                    if (sortBy === 'name') {
                                        compareResult = a.original_name.localeCompare(b.original_name);
                                    } else if (sortBy === 'date') {
                                        compareResult = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                    } else if (sortBy === 'size') {
                                        compareResult = b.size - a.size;
                                    }
                                    return sortDirection === 'asc' ? compareResult : -compareResult;
                                }).map((file) => {
                                    const fileColor = getColorClasses(file.color);
                                    return (
                                    <div 
                                        key={file.id}
                                        className={`group relative flex ${viewMode === 'list' ? 'flex-row' : 'flex-col'} ${fileColor.bg} rounded-lg border-2 ${fileColor.border} shadow-sm hover:shadow-md transition-all duration-200`}
                                    >
                                        {/* File Preview/Icon */}
                                        <div
                                            className={`${viewMode === 'list' ? 'w-20 h-20' : 'w-full h-40'} bg-white rounded-t flex items-center justify-center overflow-hidden ${viewMode === 'list' ? 'rounded-l rounded-t-none' : ''}`}
                                            draggable={true}
                                            onDragStart={(e) => {
                                                if (e.target instanceof HTMLElement && e.target.closest('.no-drag')) {
                                                    e.preventDefault();
                                                    return;
                                                }
                                                setIsDragging(true);
                                                e.dataTransfer.setData('text/plain', 'file:' + file.id.toString());
                                            }}
                                            onDragEnd={() => setIsDragging(false)}
                                        >
                                            <span className={`${viewMode === 'list' ? 'text-3xl' : 'text-6xl'}`}>{getFileIcon(file.mime_type)}</span>
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                                        </div>

                                        {/* File Info */}
                                        <div className="flex-1 p-4 flex flex-col">
                                            <h3 className="font-semibold text-gray-900 text-sm break-words line-clamp-2 mb-2">{file.original_name}</h3>
                                            <div className="text-xs text-gray-500 space-y-1">
                                                <p>{file.size_for_humans}</p>
                                                <p>{new Date(file.created_at).toLocaleDateString()}</p>
                                                <p className="text-gray-400">by {file.user.name}</p>
                                            </div>
                                        </div>

                                        {/* File Actions */}
                                        <div
                                            className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-white rounded-b no-drag"
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            draggable={false}
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-2 text-xs"
                                                onClick={() => handleDownloadFile(file)}
                                                disabled={downloadingFileId === file.id}
                                            >
                                                {downloadingFileId === file.id ? (
                                                    <>
                                                        <div className="h-3 w-3 mr-1 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                                                        Downloading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="h-3 w-3 mr-1" />
                                                        Download
                                                    </>
                                                )}
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onDragStart={(e) => e.preventDefault()}
                                                        draggable={false}
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    className="max-w-40"
                                                    style={{ background:"#FF5B49"}}
                                                    align="end"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                >
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger
                                                            className='px-5 py-3 flex items-center gap-3 text-white'
                                                            onClick={(e) => e.stopPropagation()}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                            onDragStart={(e) => e.preventDefault()}
                                                            draggable={false}
                                                        >
                                                            <div className="h-4 w-4 rounded-full" style={{backgroundColor: COLORS[(file.color || 'gray') as ColorKey].hex}}></div>
                                                            Color
                                                        </DropdownMenuSubTrigger>
                                                        <DropdownMenuSubContent>
                                                            {Object.entries(COLORS).map(([key, color]) => (
                                                                <DropdownMenuItem 
                                                                    key={key}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleUpdateFileColor(file, key);
                                                                    }}
                                                                    className='flex items-center gap-3'
                                                                >
                                                                    <div className={`h-4 w-4 rounded-full ${color.dot}`}></div>
                                                                    {color.name}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuSub>
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMove(file); }} className='px-5 py-3 flex items-center gap-3 text-white'>
                                                        <Redo className="h-4 w-4"/>
                                                        Move
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopy(file); }}  className='px-5 py-3 flex items-center gap-3 text-white'>
                                                        <Copy className="h-4 w-4"/>
                                                        Copy
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(file); }}className='px-5 py-3 flex items-center gap-3 text-red-600'>
                                                        <Trash2 className="h-4 w-4"/>
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                );
                                })}

                            </div>
                        ) : (
                            <div className="text-center py-16 text-muted-foreground">
                                <FileText className="h-24 w-24 mx-auto mb-4 opacity-30" />
                                <h3 className="text-lg font-semibold mb-2 text-gray-600">No files uploaded</h3>
                                <p className="text-sm mb-6 text-gray-500">
                                    Start by uploading your documents, images, or other files.
                                </p>
                                <label htmlFor="file-upload-empty">
                                    <Button asChild>
                                        <span>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Your First File
                                        </span>
                                    </Button>
                                </label>
                                <Input
                                    id="file-upload-empty"
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    accept="*/*"
                                />
                                {data.file && (
                                    <div className="mt-6">
                                        <p className="text-sm text-gray-600">Selected: {data.file.name}</p>
                                        <Button onClick={handleUpload} disabled={uploading} className="mt-4">
                                            {uploading ? 'Uploading...' : 'Upload File'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showMoveFileModal} onOpenChange={setShowMoveFileModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Move File to Folder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>Select a destination folder:</p>
                        <select
                            className="border border-gray-300 rounded-md px-3 py-2 w-full"
                            onChange={(e) => {
                                const value = e.target.value;
                                if (selectedFile) {
                                    router.put(`/docs-files/${selectedFile.id}/move`, { folder: value }, {
                                        onSuccess: () => router.reload()
                                    });
                                    setShowMoveModal(false);
                                    setSelectedFile(null);
                                }
                            }}
                        >
                            <option value="">Root</option>
                            {allFolders.map((folder) => {
                                const path = folder.parent ? `${folder.parent}/${folder.name}` : folder.name;
                                return (
                                    <option key={folder.id} value={path}>
                                        {path}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={showCopyFileModal} onOpenChange={setShowCopyFileModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Copy File to Folder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>Select a destination folder:</p>
                        <select
                            className="border border-gray-300 rounded-md px-3 py-2 w-full"
                            onChange={(e) => { 
                                const value = e.target.value;
                                if (selectedFile) {
                                    router.post(`/docs-files/${selectedFile.id}/copy`, { folder: value }, {
                                        onSuccess: () => router.reload()
                                    });
                                    setShowCopyModal(false);
                                    setSelectedFile(null);
                                }
                            }}
                        >
                            <option value="">Root</option>
                            {allFolders.map((folder) => {
                                const path = folder.parent ? `${folder.parent}/${folder.name}` : folder.name;
                                return (
                                    <option key={folder.id} value={path}>
                                        {path}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={showMoveFolderModal} onOpenChange={setShowMoveFolderModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Move Folder to Folder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>Select a destination folder:</p>
                        <select
                            className="border border-gray-300 rounded-md px-3 py-2 w-full"
                            value={selectedMoveFolderDestination}
                            onChange={(e) => {
                                setSelectedMoveFolderDestination(e.target.value);
                            }}
                        >
                            <option value="">Root</option>
                            {allFolders
                                .filter(f => {
                                    // Exclude the folder itself
                                    if (f.id === selectedFolder?.id) {
                                        return false;
                                    }
                                    
                                    // Exclude descendants of the selected folder
                                    const selectedFolderPath = selectedFolder
                                        ? (selectedFolder.parent 
                                            ? `${selectedFolder.parent}/${selectedFolder.name}` 
                                            : selectedFolder.name)
                                        : null;
                                    const descendants = getDescendantFolders(allFolders, selectedFolder?.id || null, selectedFolderPath);
                                    
                                    const folderPath = f.parent ? `${f.parent}/${f.name}` : f.name;
                                    return !descendants.has(folderPath);
                                })
                                .map((folder) => {
                                    const path = folder.parent ? `${folder.parent}/${folder.name}` : folder.name;
                                    return (
                                        <option key={folder.id} value={path}>
                                            {path}
                                        </option>
                                    );
                                })}
                        </select>
                        <Button 
                            onClick={() => {
                                if (selectedFolder) {
                                    router.put(`/docs-files/folders/${selectedFolder.id}/move`, { parent: selectedMoveFolderDestination }, {
                                        onSuccess: () => {
                                            setShowMoveFolderModal(false);
                                            setSelectedFolder(null);
                                            setSelectedMoveFolderDestination('');
                                            router.reload();
                                        },
                                        onError: (errors: any) => {
                                            toast.error(errors.folder || 'Cannot move folder to this location.');
                                        }
                                    });
                                }
                            }}
                            className="w-full"
                        >
                            Move This Folder
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={showCopyFolderModal} onOpenChange={setShowCopyFolderModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Copy Folder to Folder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>Select a destination folder:</p>
                        <select
                            className="border border-gray-300 rounded-md px-3 py-2 w-full"
                            value={selectedCopyFolderDestination}
                            onChange={(e) => {
                                setSelectedCopyFolderDestination(e.target.value);
                            }}
                        >
                            <option value="">Root</option>
                            {allFolders.filter(f => f.id !== selectedFolder?.id).map((folder) => {
                                const path = folder.parent ? `${folder.parent}/${folder.name}` : folder.name;
                                return (
                                    <option key={folder.id} value={path}>
                                        {path}
                                    </option>
                                );
                            })}
                        </select>
                        <Button 
                            onClick={() => {
                                if (selectedFolder) {
                                    router.post(`/docs-files/folders/${selectedFolder.id}/copy`, { parent: selectedCopyFolderDestination }, {
                                        onSuccess: () => {
                                            setShowCopyFolderModal(false);
                                            setSelectedFolder(null);
                                            setSelectedCopyFolderDestination('');
                                            router.reload();
                                        }
                                    });
                                }
                            }}
                            className="w-full"
                        >
                            Copy This Folder
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
