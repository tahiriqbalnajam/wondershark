import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useState } from 'react';
import { CheckCircle, XCircle, Building2, ExternalLink, Search } from 'lucide-react';

type Resource = {
    url: string;
    type: string;
    title: string;
    domain: string;
};

type AiModel = {
    id: number;
    display_name: string;
    name: string;
};

const modelIcon = (name: string): string | null => {
    const icons: Record<string, string> = {
        openai: 'openai.svg',
        gemini: 'gemini.svg',
        perplexity: 'perplexity.svg',
        'google-ai-overview': 'google.svg',
        anthropic: 'claude.svg',
        xai: 'grok.svg',
    };
    return icons[name] ?? null;
};

type CompetitorMention = {
    competitor_id: number;
    entity_name: string;
    entity_domain: string | null;
    sentiment: number | null;
};

type Result = {
    id: number;
    prompt: string;
    ai_model: AiModel | null;
    resources: Resource[];
    brand_mentioned: boolean;
    competitor_mentions: CompetitorMention[];
};

type Agency = { id: number; name: string };
type Brand = { id: number; name: string; agency_id: number | null };

type Props = {
    agencies: Agency[];
    brands: Brand[];
    results: Result[];
    selectedBrand: { id: number; name: string } | null;
    filters: { agency_id?: string; brand_id?: string };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Gap Analysis', href: '/admin/gap-analysis' },
];

export default function GapAnalysisIndex({ agencies, brands, results, selectedBrand, filters }: Props) {
    const { data, setData, processing } = useForm({
        agency_id: filters.agency_id || 'all',
        brand_id: filters.brand_id || 'all',
    });

    const filteredBrands = data.agency_id && data.agency_id !== 'all'
        ? brands.filter(b => b.agency_id != null && b.agency_id.toString() === data.agency_id)
        : brands;

    const handleFilter = () => {
        router.get('/admin/gap-analysis', {
            agency_id: data.agency_id === 'all' ? '' : data.agency_id,
            brand_id: data.brand_id === 'all' ? '' : data.brand_id,
        }, { preserveState: true, preserveScroll: true });
    };

    const [toggledItems, setToggledItems] = useState<Set<string>>(new Set());

    const toggleItem = (key: string) => {
        setToggledItems(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const clearFilters = () => {
        setData({ agency_id: 'all', brand_id: 'all' });
        router.get('/admin/gap-analysis');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Gap Analysis" />
            <div className="space-y-6">
                <HeadingSmall
                    title="Gap Analysis"
                    description="See which brand prompts cite URLs that match your target website list."
                />

                {/* Filters */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-2">
                                <Label>Agency</Label>
                                <Select
                                    value={data.agency_id}
                                    onValueChange={v => { setData('agency_id', v); setData('brand_id', 'all'); }}
                                >
                                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="All agencies" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All agencies</SelectItem>
                                        {agencies.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Brand</Label>
                                <Select value={data.brand_id} onValueChange={v => setData('brand_id', v)}>
                                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select a brand" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Select a brand</SelectItem>
                                        {filteredBrands.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleFilter} disabled={processing} style={{ backgroundColor: 'var(--orange-1)' }}>
                                <Search className="mr-2 h-4 w-4" />
                                Load Data
                            </Button>
                            <Button variant="outline" onClick={clearFilters}>Clear</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {selectedBrand
                                ? `${selectedBrand.name} — ${results.length} prompts with matching resources`
                                : 'Select a brand to view results'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedBrand ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">Choose a brand above and click "Load Data".</p>
                        ) : results.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">No prompts found with resources matching the target URL list.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[25%]">Prompt</TableHead>
                                            <TableHead className="w-[12%]">AI Model</TableHead>
                                            <TableHead className="w-[35%]">Matching Resources</TableHead>
                                            <TableHead className="w-[10%]">Brand Mentioned</TableHead>
                                            <TableHead className="w-[18%]">Competitors Mentioned</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map((result) => (
                                            <TableRow key={result.id}>
                                                <TableCell>
                                                    <p className="text-sm line-clamp-3">{result.prompt}</p>
                                                </TableCell>
                                                <TableCell>
                                                    {result.ai_model ? (
                                                        <Badge variant="outline" className="text-xs inline-flex items-center gap-1.5 overflow-hidden">
                                                            {modelIcon(result.ai_model.name) && (
                                                                <img
                                                                    src={`/images/ai-models/New folder/${modelIcon(result.ai_model.name)}`}
                                                                    alt=""
                                                                    className="h-5 w-5 rounded-sm shrink-0"
                                                                />
                                                            )}
                                                            {result.ai_model.display_name}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1.5">
                                                        {result.resources.map((resource, i) => (
                                                            <a
                                                                key={i}
                                                                href={resource.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 mr-1.5 mb-1"
                                                                title={resource.domain || resource.url}
                                                            >
                                                                {resource.domain ? (
                                                                    <img
                                                                        src={`https://www.google.com/s2/favicons?domain=${resource.domain}&sz=32`}
                                                                        alt=""
                                                                        className="h-5 w-5 rounded-sm"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <ExternalLink className="h-4 w-4" />
                                                                )}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {result.brand_mentioned ? (
                                                        <Badge className="bg-green-100 text-green-800 gap-1">
                                                            <CheckCircle className="h-3 w-3" />
                                                            Yes
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-gray-100 text-gray-600 gap-1">
                                                            <XCircle className="h-3 w-3" />
                                                            No
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {result.competitor_mentions.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {result.competitor_mentions.map((comp, i) => {
                                                                const compKey = `comp-${result.id}-${i}`;
                                                                const showDomain = toggledItems.has(compKey);
                                                                return (
                                                                    <Badge
                                                                        key={i}
                                                                        variant="outline"
                                                                        className="text-xs gap-1 cursor-pointer hover:bg-accent"
                                                                        onClick={() => toggleItem(compKey)}
                                                                    >
                                                                        {comp.entity_domain ? (
                                                                            <img
                                                                                src={`https://www.google.com/s2/favicons?domain=${comp.entity_domain}&sz=16`}
                                                                                alt=""
                                                                                className="h-3.5 w-3.5 rounded-sm"
                                                                                onError={(e) => {
                                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <Building2 className="h-3 w-3" />
                                                                        )}
                                                                        {showDomain && comp.entity_domain ? comp.entity_domain : comp.entity_name}
                                                                    </Badge>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">None</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
