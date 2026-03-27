import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

import { AddPromptDialog } from '@/components/brand/add-prompt-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { countries } from '@/data/countries';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';
import {
    Building2,
    Trophy,
    MapPin,
    Power,
    CircleAlert,
    CircleCheckBig,
    Sparkles,
    Info,
    Calendar,
    Loader2
} from 'lucide-react';

type Brand = {
    id: number;
    name: string;
    website?: string;
    description: string;
    country?: string;
};

type BrandPrompt = {
    id: number;
    prompt: string;
    position: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    visibility: 'public' | 'private' | 'draft';
    country_code: string;
    region?: string;
    is_active: boolean;
    status?: 'suggested' | 'active' | 'inactive';
    session_id?: string | null;
    created_at: string;
    days_ago: number;
    mentions_count?: number | null;
};

type Props = {
    brand: Brand;
    prompts: BrandPrompt[];
};

export default function BrandPromptsIndex({ brand, prompts }: Props) {
    const { auth, errors, flash } = usePage().props as any;
    const userRoles = auth?.roles || [];
    const isAdmin = userRoles.includes('admin');
    const isBrandOrAgency = userRoles.includes('brand') || userRoles.includes('agency');
    const isAgencyMember = userRoles.includes('agency_member');

    const [selectedPrompts, setSelectedPrompts] = useState<number[]>([]);
    // Sorting state for volume column in suggested tab
    const [suggestedVolumeSort, setSuggestedVolumeSort] = useState<'asc' | 'desc'>('desc');
    const [isLoading, setIsLoading] = useState(false);
    const [currentTab, setCurrentTab] = useState<'suggested' | 'active' | 'inactive'>(() => {
        if (typeof window !== 'undefined') {
            const savedTab = localStorage.getItem('brand-prompts-currentTab');
            if (savedTab === 'suggested' || savedTab === 'active' || savedTab === 'inactive') {
                return savedTab;
            }
        }
        return 'active';
    });
        // Persist tab state to localStorage
        useEffect(() => {
            if (typeof window !== 'undefined') {
                localStorage.setItem('brand-prompts-currentTab', currentTab);
            }
        }, [currentTab]);
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);

    useEffect(() => {
        if (errors?.error) {
            setErrorMessage(Array.isArray(errors.error) ? errors.error[0] : errors.error);
            // Auto-clear error after 5 seconds
            const timeout = setTimeout(() => setErrorMessage(null), 5000);
            return () => clearTimeout(timeout);
        }

        // Check for success message that indicates analysis is running
        if (flash?.success) {
            if (String(flash.success).includes('System is re-analyzing')) {
                setAnalysisMessage(String(flash.success));
                // Keep this message for 60 seconds to let user know it takes time
                const timeout = setTimeout(() => setAnalysisMessage(null), 60000);
                return () => clearTimeout(timeout);
            }
        }
    }, [errors, flash]);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Brands',
            href: '/brands',
        },
        {
            title: brand.name,
            href: `/brands/${brand.id}`,
        },
        {
            title: 'Prompts',
            href: `/brands/${brand.id}/prompts`,
        },
    ];

    // Categorize prompts by their status field (with fallback to old logic)
    const activePrompts = prompts.filter(p => p.status === 'active' || (p.is_active && !p.status));
    const suggestedPrompts = prompts.filter(p => p.status === 'suggested' || (!p.is_active && p.session_id && !p.status));
    const inactivePrompts = prompts.filter(p => p.status === 'inactive' || (!p.is_active && !p.session_id && !p.status));

    // Handle manual prompt addition from dialog
    const handleManualPromptAdd = (promptText: string) => {
        router.post(`/brands/${brand.id}/prompts`, {
            prompt: promptText,
            is_active: true,
        }, {
            preserveScroll: true,
        });
    };

    // Handle AI prompt generation
    const handleGeneratePrompts = () => {
        setIsGeneratingPrompts(true);
        router.post(`/brands/${brand.id}/prompts/generate-ai`, {}, {
            preserveScroll: false, // Allow scroll to see success message
            preserveState: false, // Reload to get fresh data
            onSuccess: () => {
                console.log('Prompts generated successfully');
            },
            onFinish: () => {
                setIsGeneratingPrompts(false);
            },
            onError: (errors) => {
                console.error('Error generating prompts:', errors);
                if (errors && Object.keys(errors).length > 0) {
                    alert(`Error: ${Object.values(errors).join(', ')}`);
                } else {
                    alert('Failed to generate prompts. Please refresh the page and try again.');
                }
                setIsGeneratingPrompts(false);
            },
        });
    };

    const handleDeletePrompt = async (promptId: number) => {
        if (confirm('Are you sure you want to delete this prompt?')) {
            await router.delete(`/brands/${brand.id}/prompts/${promptId}`, {
                preserveScroll: true,
                preserveState: false,
            });
        }
    };

    const handleSelectAll = (checked: boolean) => {
        let currentPrompts: BrandPrompt[] = [];
        switch (currentTab) {
            case 'active':
                currentPrompts = activePrompts;
                break;
            case 'suggested':
                currentPrompts = suggestedPrompts;
                break;
            case 'inactive':
                currentPrompts = inactivePrompts;
                break;
        }

        if (checked) {
            setSelectedPrompts(currentPrompts.map(p => p.id));
        } else {
            setSelectedPrompts([]);
        }
    };

    const handleSelectPrompt = (promptId: number, checked: boolean) => {
        if (checked) {
            setSelectedPrompts(prev => [...prev, promptId]);
        } else {
            setSelectedPrompts(prev => prev.filter(id => id !== promptId));
        }
    };

    const handleBulkActivate = async () => {
        if (selectedPrompts.length === 0) return;
        setIsLoading(true);
        try {
            await router.post(`/brands/${brand.id}/prompts/bulk-update`, {
                prompt_ids: selectedPrompts,
                action: 'activate',
            }, {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    setSelectedPrompts([]);
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkDeactivate = async () => {
        if (selectedPrompts.length === 0) return;
        setIsLoading(true);
        try {
            await router.post(`/brands/${brand.id}/prompts/bulk-update`, {
                prompt_ids: selectedPrompts,
                action: 'deactivate',
            }, {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    setSelectedPrompts([]);
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedPrompts.length === 0) return;
        if (!confirm('Are you sure you want to delete the selected prompts?')) return;

        setIsLoading(true);
        try {
            await router.post(`/brands/${brand.id}/prompts/bulk-update`, {
                prompt_ids: selectedPrompts,
                action: 'delete',
            }, {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    setSelectedPrompts([]);
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePrompt = async (promptId: number, field: string, value: string | number | boolean) => {
        await router.put(`/brands/${brand.id}/prompts/${promptId}`, {
            [field]: value,
        }, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    const getCountryData = (countryCode: string) => {
        const countryInfo = countries.find(c => c.code === countryCode) || { flag: '🏳️', name: 'Unknown', code: countryCode };
        let flagIcon;
        try {
            flagIcon = getUnicodeFlagIcon(countryCode) || countryInfo.flag || '🏳️';
        } catch {
            flagIcon = countryInfo.flag || '🏳️';
        }
        return { ...countryInfo, flag: flagIcon };
    };

    let currentPrompts: BrandPrompt[] = [];
    switch (currentTab) {
        case 'active':
            currentPrompts = activePrompts;
            break;
        case 'suggested':
            currentPrompts = suggestedPrompts;
            break;
        case 'inactive':
            currentPrompts = inactivePrompts;
            break;
    }
    const allSelected = selectedPrompts.length === currentPrompts.length && currentPrompts.length > 0;

    // Export active prompts to CSV
    const handleExportActivePrompts = () => {
        // Helper to format date as 'Feb 20, 2026' using UTC
        const formatDate = (isoString: string) => {
            const date = new Date(isoString);
            const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
            const day = date.getUTCDate();
            const year = date.getUTCFullYear();
            return `${month} ${day}, ${year}`;
        };
        // Prepare data for export
        const exportData = activePrompts.map(prompt => ({
            Prompt: prompt.prompt,
            Mentions: prompt.mentions_count ?? 'N/A',
            Country: getCountryData(prompt.country_code).name,
            Region: brand.region || '-',
            //Created: Math.floor(prompt.days_ago) === 0 ? 'Today' : Math.floor(prompt.days_ago) === 1 ? '1 day' : `${Math.floor(prompt.days_ago)} days`,
            //Created_at: "'" + formatDate(prompt.created_at),
            Created: formatDate(prompt.created_at),
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        // Create a blob and trigger download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${brand.name}-active-prompts.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <AppLayout title={`${brand.name} Prompts`}>
            <Head title={`${brand.name} - Prompts`} />

            <TooltipProvider>
                <div className="space-y-6 relative mt-15">
                    {errorMessage && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                            <CircleAlert className="h-5 w-5 text-red-600" />
                            <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                        </div>
                    )}

                    {analysisMessage && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="relative">
                                <Info className="h-5 w-5 text-blue-600" />
                                <div className="absolute top-0 right-0 -mr-1 -mt-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-blue-800">Analysis in Progress</h4>
                                <p className="text-sm text-blue-700">
                                    The system is re-analyzing prompts and recalculating visibility. This may take a few minutes to complete.
                                </p>
                            </div>
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin ml-auto" />
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold">{brand.name} Prompts <small className="text-gray-400 text-sm"> - {prompts.length} Total</small></h3>
                            <p className="text-gray-400 text-sm">Manage all prompts for {brand.name}</p>
                        </div>
                        {isAdmin && (
                            <Button asChild>
                                <Link href={`/brands/${brand.id}`}>
                                    <Building2 className="h-4 w-4 mr-2" />
                                    Back to Brand
                                </Link>
                            </Button>
                        )}
                    </div>

                    <Tabs value={currentTab} defaultValue="active" className="add-prompts-wrapp" onValueChange={(value) => setCurrentTab(value as 'suggested' | 'active' | 'inactive')}>
                        <div className="flex justify-between items-center mb-10">
                            <TabsList className="add-prompt-lists border">
                                <TabsTrigger value="active">Active ({activePrompts.length})</TabsTrigger>
                                {(isAdmin || isBrandOrAgency || isAgencyMember) && (
                                    <TabsTrigger value="suggested">Suggested ({suggestedPrompts.length})</TabsTrigger>
                                )}
                                <TabsTrigger value="inactive">Inactive ({inactivePrompts.length})</TabsTrigger>
                            </TabsList>
                            <div className="flex items-center gap-2">
                                {(isAdmin || isBrandOrAgency || isAgencyMember) && (
                                    <AddPromptDialog brandId={brand.id} className="add-prompt-btn" onPromptAdd={handleManualPromptAdd} />
                                )}
                                { /* currentTab === 'active' && (  }
                                    <button
                                        type="button"
                                        className="export-prompts-btn border px-2 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-blue-600 hover:text-white"
                                        title="Export Active Prompts"
                                        onClick={handleExportActivePrompts}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-8m0 8l-4-4m4 4l4-4M4 20h16" /></svg>
                                    </button>
                                ) */}
                            </div>
                        </div>

                        <TabsContent value="active" className="active-table-prompt">
                            <Table className="flexible-table">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[20px] text-center p-0">
                                            <Checkbox
                                                id="active-select-all"
                                                checked={allSelected}
                                                onCheckedChange={(val) => handleSelectAll(!!val)}
                                            />
                                        </TableHead>
                                        <TableHead>Prompt</TableHead>
                                        <TableHead><div className="flex items-center"><Trophy className="w-4 mr-2" /> Mentions</div></TableHead>
                                        <TableHead><div className="flex items-center"><MapPin className="w-4 mr-2" /> Country</div></TableHead>
                                        <TableHead><div className="flex items-center"><MapPin className="w-4 mr-2" /> Region</div></TableHead>
                                        <TableHead>Created</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activePrompts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12">
                                                <CircleCheckBig className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                                <p className="text-gray-500 mb-2">No active prompts</p>
                                                <p className="text-gray-400 text-sm">Activate prompts to see them here</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        activePrompts.map((prompt) => {
                                            const countryData = getCountryData(prompt.country_code);
                                            return (
                                                <TableRow key={prompt.id}>
                                                    <TableHead className="w-[70px] text-center p-0">
                                                        <Checkbox
                                                            id={`active-${prompt.id}`}
                                                            checked={selectedPrompts.includes(prompt.id)}
                                                            onCheckedChange={(val) => handleSelectPrompt(prompt.id, !!val)}
                                                        />
                                                    </TableHead>
                                                    <TableCell>
                                                        <div className="max-w-md">
                                                            <p className="text-sm text-foreground line-clamp-2">
                                                                {prompt.prompt}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {prompt.mentions_count != null ? prompt.mentions_count : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-2 cursor-help">
                                                                   {/* <span className="text-lg select-none">
                                                                        {countryData.flag}
                                                                    </span> 
                                                                    */}
                                                                    <span className="text-sm">
                                                                        {countryData.name}
                                                                    </span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{countryData.name} ({prompt.country_code})</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            {brand.region || '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            {/* Math.floor(prompt.days_ago) === 0 ? 'Today' :
                                                                Math.floor(prompt.days_ago) === 1 ? '1 day' :
                                                                    `${Math.floor(prompt.days_ago)} days`} */}
                                                            <Calendar className="h-3 w-3" />
                                                            {(() => {
                                                                // Format date as 'Feb 20, 2026' (use UTC to avoid timezone issues)
                                                                const date = new Date(prompt.created_at);
                                                                const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
                                                                const day = date.getUTCDate();
                                                                const year = date.getUTCFullYear();
                                                                return `${month} ${day}, ${year}`;
                                                            })()}

                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>


                        <div className="flex items-center justify-end gap-2 mt-4">
                                {currentTab === 'active' && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="export-prompts-btn border px-2 py-1 rounded-sm text-gray-950 hover:bg-gray-600 hover:text-white mr-3"
                                                    onClick={handleExportActivePrompts}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5
                                                            M8.5 8.5l3.5-3.5 3.5 3.5
                                                            M12 5v10" />
                                                    </svg>
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Export CSV
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>

                        <TabsContent value="inactive" className="active-table-prompt">
                            <Table className="flexible-table">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[70px] text-center p-0">
                                            <Checkbox
                                                id="inactive-select-all"
                                                checked={allSelected}
                                                onCheckedChange={(val) => handleSelectAll(!!val)}
                                            />
                                        </TableHead>
                                        <TableHead>Prompt</TableHead>
                                        <TableHead><div className="flex items-center"><MapPin className="w-4 mr-2" /> Location</div></TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inactivePrompts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12">
                                                <CircleAlert className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                                <p className="text-gray-500 mb-2">No inactive prompts</p>
                                                <p className="text-gray-400 text-sm">Deactivated prompts will appear here</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        inactivePrompts.map((prompt) => {
                                            const countryData = getCountryData(prompt.country_code);
                                            return (
                                                <TableRow key={prompt.id}>
                                                    <TableHead className="w-[70px] text-center p-0">
                                                        <Checkbox
                                                            id={`inactive-${prompt.id}`}
                                                            checked={selectedPrompts.includes(prompt.id)}
                                                            onCheckedChange={(val) => handleSelectPrompt(prompt.id, !!val)}
                                                        />
                                                    </TableHead>
                                                    <TableCell>
                                                        <div className="max-w-md">
                                                            <p className="text-sm text-foreground line-clamp-2">
                                                                {prompt.prompt}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">{countryData.flag}</span>
                                                            <span className="text-sm">{countryData.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm text-muted-foreground">
                                                            {Math.floor(prompt.days_ago) === 0 ? 'Today' :
                                                                Math.floor(prompt.days_ago) === 1 ? '1 day' :
                                                                    `${Math.floor(prompt.days_ago)} days`}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdatePrompt(prompt.id, 'is_active', true)}
                                                                className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white"
                                                            >
                                                                Activate
                                                            </button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>

                        {(isAdmin || isBrandOrAgency || isAgencyMember) && (
                            <TabsContent value="suggested" className="active-table-prompt">
                                <div className="suggested-prompts-box flex justify-between items-center p-4 border rounded-sm mb-5">
                                    <p className='flex items-center gap-3 text-sm'><Sparkles className='text-orange-600' /><b>Suggested prompts.</b> Expand your brand's presence with suggested prompts.</p>
                                    <button
                                        onClick={handleGeneratePrompts}
                                        disabled={isGeneratingPrompts}
                                        className='py-2 px-4 bg-gray-200 text-gray-950 rounded-sm text-sm hover:bg-orange-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                                    >
                                        {isGeneratingPrompts ? (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2 inline-block animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            'Suggest More'
                                        )}
                                    </button>
                                </div>
                                {suggestedPrompts.length === 0 && !isGeneratingPrompts ? (
                                    <div className="text-center py-12 border rounded-lg">
                                        <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-500 mb-2">No suggested prompts yet</p>
                                        <p className="text-gray-400 text-sm">Click "Suggest More" to generate AI-powered prompts</p>
                                    </div>
                                ) : (
                                    <Table className="flexible-table">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[70px] text-center p-0">
                                                    <Checkbox
                                                        id="suggested-select-all"
                                                        checked={allSelected}
                                                        onCheckedChange={(val) => handleSelectAll(!!val)}
                                                    />
                                                </TableHead>
                                                <TableHead>Prompt</TableHead>
                                                {/* <TableHead><div className="flex items-center"><Eye className="w-4 mr-2" /> Visibility</div></TableHead>
                                                <TableHead><div className="flex items-center"><Smile className="w-4 mr-2" /> Sentiment</div></TableHead>
                                                <TableHead><div className="flex items-center"><ChevronsUpDown className="w-4 mr-2" /> Position</div></TableHead> */}
                                                <TableHead>
                                                    <button
                                                        type="button"
                                                        className="flex items-center focus:outline-none"
                                                        onClick={() => setSuggestedVolumeSort(suggestedVolumeSort === 'asc' ? 'desc' : 'asc')}
                                                    >
                                                        <Trophy className="w-4 mr-2" /> Volume
                                                        <span className="ml-1">
                                                            {suggestedVolumeSort === 'asc' ? '▲' : '▼'}
                                                        </span>
                                                    </button>
                                                </TableHead>
                                                <TableHead><div className="flex items-center"><MapPin className="w-4 mr-2" /> Location</div></TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {[...suggestedPrompts]
                                                .sort((a, b) => {
                                                    const aCount = a.mentions_count ?? 0;
                                                    const bCount = b.mentions_count ?? 0;
                                                    return suggestedVolumeSort === 'asc'
                                                        ? aCount - bCount
                                                        : bCount - aCount;
                                                })
                                                .map((prompt) => {
                                                const countryData = getCountryData(prompt.country_code);
                                                return (
                                                    <TableRow key={prompt.id}>
                                                        <TableHead className="w-[70px] text-center p-0">
                                                            <Checkbox
                                                                id={`suggested-${prompt.id}`}
                                                                checked={selectedPrompts.includes(prompt.id)}
                                                                onCheckedChange={(val) => handleSelectPrompt(prompt.id, !!val)}
                                                            />
                                                        </TableHead>
                                                        <TableCell>{prompt.prompt}</TableCell>
                                                        {/* <TableCell>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <Eye className="w-4 h-4" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Visibility data will be available after tracking</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className="sentiment-td">
                                                                <span></span> --
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className="position-td">
                                                                <span>#</span> --
                                                            </Badge>
                                                        </TableCell> */}
                                                        <TableCell>
                                                            { /* prompt.mentions_count != null ? prompt.mentions_count : '--' */}
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <div style={{ display: 'flex', alignItems: 'flex-end', height: '22px' }}>
                                                                    {[...Array(5)].map((_, i) => {
                                                                        // Heights for wifi-like bars: 6, 10, 14, 18, 22px
                                                                        const heights = [6, 10, 14, 18, 22];
                                                                        return (
                                                                            <span
                                                                                key={i}
                                                                                style={{ height: `${heights[i]}px` }}
                                                                                className={`inline-block w-1 mx-0.5 rounded bg-gray-300 ${prompt.mentions_count && prompt.mentions_count > i ? 'bg-orange-600' : 'bg-gray-200'}`}
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                              { /*   <span className="text-lg">{countryData.flag}</span>*/}
                                                                <span className="text-sm">{countryData.name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUpdatePrompt(prompt.id, 'is_active', true)}
                                                                    className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-green-600 hover:text-white"
                                                                >
                                                                    Track
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeletePrompt(prompt.id)}
                                                                    className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-red-600 hover:text-white"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </TabsContent>
                        )}
                    </Tabs>

                    <div className={`prompts-action ${selectedPrompts.length > 0 ? "active" : ""}`}>
                        <p>{selectedPrompts.length > 0
                            ? `${selectedPrompts.length} Selected`
                            : "0 Select"}</p>
                        <div className="prompts-action-btns">
                            {currentTab !== 'active' && (
                                <button
                                    type="button"
                                    onClick={handleBulkActivate}
                                    disabled={isLoading}
                                    className="active-ch"
                                >
                                    <CircleCheckBig /> {currentTab === 'suggested' ? 'Track' : 'Active'}
                                </button>
                            )}
                            {currentTab === 'active' && (
                                <button
                                    type="button"
                                    onClick={handleBulkDeactivate}
                                    disabled={isLoading}
                                    className="deactive-ch"
                                >
                                    <CircleAlert />Deactive
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleBulkDelete}
                                disabled={isLoading}
                                className="delete-ch"
                            >
                                <Power />{currentTab === 'suggested' ? 'Reject' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            </TooltipProvider>
        </AppLayout>
    );
}