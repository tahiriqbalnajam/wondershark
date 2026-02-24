import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

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
    Eye,
    Smile,
    ChevronsUpDown,
    Trophy,
    MapPin,
    Power,
    CircleAlert,
    CircleCheckBig,
    Sparkles,
    Info,
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
    is_active: boolean;
    status?: 'suggested' | 'active' | 'inactive'; // Add status field
    session_id?: string | null;
    created_at: string;
    days_ago: number;
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
    const [isLoading, setIsLoading] = useState(false);
    const [currentTab, setCurrentTab] = useState<'suggested' | 'active' | 'inactive'>('active');
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

                    <Tabs defaultValue="active" className="add-prompts-wrapp" onValueChange={(value) => setCurrentTab(value as 'suggested' | 'active' | 'inactive')}>
                        <div className="flex justify-between items-center mb-10">
                            <TabsList className="add-prompt-lists border">
                                <TabsTrigger value="active">Active ({activePrompts.length})</TabsTrigger>
                                {(isAdmin || isBrandOrAgency || isAgencyMember) && (
                                    <TabsTrigger value="suggested">Suggested ({suggestedPrompts.length})</TabsTrigger>
                                )}
                                <TabsTrigger value="inactive">Inactive ({inactivePrompts.length})</TabsTrigger>
                            </TabsList>
                            {(isAdmin || isBrandOrAgency || isAgencyMember) && (
                                <AddPromptDialog brandId={brand.id} className="add-prompt-btn" onPromptAdd={handleManualPromptAdd} />
                            )}
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
                                        <TableHead><div className="flex items-center"><Eye className="w-4 mr-2" /> Visibility</div></TableHead>
                                        <TableHead><div className="flex items-center"><Smile className="w-4 mr-2" /> Sentiment</div></TableHead>
                                        <TableHead><div className="flex items-center"><ChevronsUpDown className="w-4 mr-2" /> Position</div></TableHead>
                                        <TableHead><div className="flex items-center"><Trophy className="w-4 mr-2" /> Mentions</div></TableHead>
                                        <TableHead><div className="flex items-center"><MapPin className="w-4 mr-2" /> Location</div></TableHead>
                                        <TableHead>Created</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activePrompts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12">
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
                                                        <Badge variant="outline">{prompt.visibility}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="sentiment-td">
                                                            <span></span> {prompt.sentiment}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="position-td">
                                                            <span>#</span> {prompt.position}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>N/A</TableCell>
                                                    <TableCell>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-2 cursor-help">
                                                                    <span className="text-lg select-none">
                                                                        {countryData.flag}
                                                                    </span>
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
                                                        <div className="text-sm text-muted-foreground">
                                                            {Math.floor(prompt.days_ago) === 0 ? 'Today' :
                                                                Math.floor(prompt.days_ago) === 1 ? '1 day' :
                                                                    `${Math.floor(prompt.days_ago)} days`}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>

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
                                                <TableHead><div className="flex items-center"><Trophy className="w-4 mr-2" /> Volume</div></TableHead>
                                                <TableHead><div className="flex items-center"><MapPin className="w-4 mr-2" /> Location</div></TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {suggestedPrompts.map((prompt) => {
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
                                                        <TableCell>--</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg">{countryData.flag}</span>
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