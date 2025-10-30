import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
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
    MessageSquare, 
    Building2, 
    MoreVertical, 
    Trash2, 
    Eye, 
    EyeOff,
    ThumbsUp,
    ThumbsDown,
    Minus,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';

type Brand = {
    id: number;
    name: string;
    website?: string;
    description: string;
};

type BrandPrompt = {
    id: number;
    prompt: string;
    position: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    visibility: 'public' | 'private' | 'draft';
    country_code: string;
    is_active: boolean;
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

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedPrompts(prompts.map(p => p.id));
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

    const handleBulkAction = async (action: string, value?: string) => {
        if (selectedPrompts.length === 0) return;

        setIsLoading(true);
        try {
            await router.post(`/brands/${brand.id}/prompts/bulk-update`, {
                prompt_ids: selectedPrompts,
                action,
                value,
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

    const handleDeletePrompt = async (promptId: number) => {
        if (confirm('Are you sure you want to delete this prompt?')) {
            await router.delete(`/brands/${brand.id}/prompts/${promptId}`, {
                preserveScroll: true,
            });
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

    const getSentimentIcon = (sentiment: string) => {
        switch (sentiment) {
            case 'positive':
                return <ThumbsUp className="h-4 w-4 text-green-600" />;
            case 'negative':
                return <ThumbsDown className="h-4 w-4 text-red-600" />;
            case 'neutral':
                return <Minus className="h-4 w-4 text-gray-600" />;
            default:
                return null;
        }
    };

    const getSentimentVariant = (sentiment: string) => {
        switch (sentiment) {
            case 'positive':
                return 'default' as const;
            case 'negative':
                return 'destructive' as const;
            case 'neutral':
                return 'secondary' as const;
            default:
                return 'outline' as const;
        }
    };

    const getVisibilityIcon = (visibility: string) => {
        switch (visibility) {
            case 'public':
                return <Eye className="h-4 w-4 text-green-600" />;
            case 'private':
                return <EyeOff className="h-4 w-4 text-yellow-600" />;
            case 'draft':
                return <Clock className="h-4 w-4 text-gray-600" />;
            default:
                return null;
        }
    };

    const getVisibilityVariant = (visibility: string) => {
        switch (visibility) {
            case 'public':
                return 'default' as const;
            case 'private':
                return 'secondary' as const;
            case 'draft':
                return 'outline' as const;
            default:
                return 'outline' as const;
        }
    };

    const allSelected = selectedPrompts.length === prompts.length && prompts.length > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${brand.name} - Prompts`} />

            <TooltipProvider>
                <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <HeadingSmall 
                            title={`${brand.name} Prompts`}
                            description={`Manage all prompts for ${brand.name}`}
                        />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>{prompts.length} total prompts</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {selectedPrompts.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" disabled={isLoading}>
                                        Bulk Actions ({selectedPrompts.length})
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Activate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Deactivate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleBulkAction('set_visibility', 'public')}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Set Public
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkAction('set_visibility', 'private')}>
                                        <EyeOff className="h-4 w-4 mr-2" />
                                        Set Private
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkAction('set_visibility', 'draft')}>
                                        <Clock className="h-4 w-4 mr-2" />
                                        Set Draft
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleBulkAction('set_sentiment', 'positive')}>
                                        <ThumbsUp className="h-4 w-4 mr-2" />
                                        Set Positive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkAction('set_sentiment', 'neutral')}>
                                        <Minus className="h-4 w-4 mr-2" />
                                        Set Neutral
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkAction('set_sentiment', 'negative')}>
                                        <ThumbsDown className="h-4 w-4 mr-2" />
                                        Set Negative
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        onClick={() => handleBulkAction('delete')}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Selected
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        
                        <Button asChild>
                            <Link href={`/brands/${brand.id}`}>
                                <Building2 className="h-4 w-4 mr-2" />
                                Back to Brand
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Brand Prompts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {prompts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">No prompts found</h3>
                                <p className="text-sm">
                                    This brand doesn't have any prompts yet. Add some prompts to get started.
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Prompt</TableHead>
                                        <TableHead className="w-20">Position</TableHead>
                                        <TableHead className="w-24">Sentiment</TableHead>
                                        <TableHead className="w-24">Visibility</TableHead>
                                        <TableHead className="w-32">Location</TableHead>
                                        <TableHead className="w-20">Created</TableHead>
                                        <TableHead className="w-16">Status</TableHead>
                                        <TableHead className="w-16"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {prompts.map((prompt) => {
                                        const countryData = getCountryData(prompt.country_code);
                                        return (
                                            <TableRow key={prompt.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedPrompts.includes(prompt.id)}
                                                        onCheckedChange={(checked) => 
                                                            handleSelectPrompt(prompt.id, checked as boolean)
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-md">
                                                        <p className="text-sm text-foreground line-clamp-2">
                                                            {prompt.prompt}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-mono text-sm">
                                                        {prompt.position}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge 
                                                        variant={getSentimentVariant(prompt.sentiment)}
                                                        className="flex items-center gap-1 w-fit"
                                                    >
                                                        {getSentimentIcon(prompt.sentiment)}
                                                        {prompt.sentiment}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge 
                                                        variant={getVisibilityVariant(prompt.visibility)}
                                                        className="flex items-center gap-1 w-fit"
                                                    >
                                                        {getVisibilityIcon(prompt.visibility)}
                                                        {prompt.visibility}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center gap-2 cursor-help">
                                                                <span className="text-lg select-none">
                                                                    {countryData.flag}
                                                                </span>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs text-muted-foreground truncate max-w-20">
                                                                        {countryData.name}
                                                                    </span>
                                                                </div>
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
                                                <TableCell>
                                                    <Badge variant={prompt.is_active ? 'default' : 'secondary'}>
                                                        {prompt.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem 
                                                                onClick={() => handleUpdatePrompt(prompt.id, 'is_active', !prompt.is_active)}
                                                            >
                                                                {prompt.is_active ? (
                                                                    <>
                                                                        <XCircle className="h-4 w-4 mr-2" />
                                                                        Deactivate
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                                        Activate
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem 
                                                                onClick={() => handleDeletePrompt(prompt.id)}
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
            </TooltipProvider>
        </AppLayout>
    );
}
