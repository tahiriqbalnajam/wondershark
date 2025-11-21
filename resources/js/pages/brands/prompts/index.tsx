import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

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
    Sparkles
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
    const [selectedPrompts, setSelectedPrompts] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTab, setCurrentTab] = useState<'suggested' | 'active' | 'inactive'>('active');
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);

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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${brand.name} - Prompts`} />

            <TooltipProvider>
                <div className="space-y-6 relative mt-15">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold">{brand.name} Prompts <small className="text-gray-400 text-sm"> - {prompts.length} Total</small></h3>
                            <p className="text-gray-400 text-sm">Manage all prompts for {brand.name}</p>
                        </div>
                        <Button asChild>
                            <Link href={`/brands/${brand.id}`}>
                                <Building2 className="h-4 w-4 mr-2" />
                                Back to Brand
                            </Link>
                        </Button>
                    </div>

                    <Tabs defaultValue="active" className="add-prompts-wrapp" onValueChange={(value) => setCurrentTab(value as 'suggested' | 'active' | 'inactive')}>
                        <div className="flex justify-between items-center mb-10">
                            <TabsList className="add-prompt-lists border">
                                <TabsTrigger value="active">Active ({activePrompts.length})</TabsTrigger>
                                <TabsTrigger value="suggested">Suggested ({suggestedPrompts.length})</TabsTrigger>
                                <TabsTrigger value="inactive">Inactive ({inactivePrompts.length})</TabsTrigger>
                            </TabsList>
                            <AddPromptDialog brandId={brand.id} className="add-prompt-btn" onPromptAdd={handleManualPromptAdd} />
                        </div>

                        <TabsContent value="active" className="active-table-prompt">
                            <Table className="default-table">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[70px] text-center p-0">
                                            <Checkbox 
                                                id="active-select-all" 
                                                checked={allSelected} 
                                                onCheckedChange={(val) => handleSelectAll(!!val)} 
                                            />
                                        </TableHead>
                                        <TableHead>Prompt</TableHead>
                                        <TableHead><div className="flex items-center"><Eye className="w-4 mr-2"/> Visibility</div></TableHead>
                                        <TableHead><div className="flex items-center"><Smile className="w-4 mr-2"/> Sentiment</div></TableHead>
                                        <TableHead><div className="flex items-center"><ChevronsUpDown className="w-4 mr-2"/> Position</div></TableHead>
                                        <TableHead><div className="flex items-center"><Trophy className="w-4 mr-2"/> Mentions</div></TableHead>
                                        <TableHead><div className="flex items-center"><MapPin className="w-4 mr-2"/> Location</div></TableHead>
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
                            <Table className="default-table">
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
                                        <TableHead><div className="flex items-center"><MapPin className="w-4 mr-2"/> Location</div></TableHead>
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

                        <TabsContent value="suggested" className="active-table-prompt">
                            <div className="suggested-prompts-box flex justify-between items-center p-4 border rounded-sm mb-5">
                                <p className='flex items-center gap-3 text-sm'><Sparkles className='text-orange-600'/><b>Suggested prompts.</b> Expand your brand's presence with suggested prompts.</p>
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
                                <Table className="default-table">
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
                                            <TableHead><div className="flex items-center"><Eye className="w-4 mr-2"/> Visibility</div></TableHead>
                                            <TableHead><div className="flex items-center"><Smile className="w-4 mr-2"/> Sentiment</div></TableHead>
                                            <TableHead><div className="flex items-center"><ChevronsUpDown className="w-4 mr-2"/> Position</div></TableHead>
                                            <TableHead><div className="flex items-center"><Trophy className="w-4 mr-2"/> Mentions</div></TableHead>
                                            <TableHead><div className="flex items-center"><MapPin className="w-4 mr-2"/> Location</div></TableHead>
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
                                                    <TableCell>
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
                                                    </TableCell>
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
                                    <CircleCheckBig/> {currentTab === 'suggested' ? 'Track' : 'Active'}
                                </button>
                            )}
                            {currentTab === 'active' && (
                                <button 
                                    type="button"
                                    onClick={handleBulkDeactivate}
                                    disabled={isLoading}
                                    className="deactive-ch"
                                >
                                    <CircleAlert/>Deactive
                                </button>
                            )}
                            <button 
                                type="button"
                                onClick={handleBulkDelete}
                                disabled={isLoading}
                                className="delete-ch"
                            >
                                <Power/>{currentTab === 'suggested' ? 'Reject' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            </TooltipProvider>
        </AppLayout>
    );
}