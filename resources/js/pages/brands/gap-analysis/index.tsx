import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useState } from 'react';
import { CheckCircle, XCircle, Building2, ExternalLink } from 'lucide-react';

type Resource = {
    url: string;
    type: string;
    title: string;
    domain: string;
};

type AiModel = {
    id: number;
    display_name: string;
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

type Props = {
    brand: { id: number; name: string };
    results: Result[];
};

export default function GapAnalysisIndex({ brand, results }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: brand.name, href: `/brands/${brand.id}` },
        { title: 'Gap Analysis', href: `/brands/${brand.id}/gap-analysis` },
    ];
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${brand.name} — Gap Analysis`} />
            <div className="space-y-6">
                <HeadingSmall
                    title="Gap Analysis"
                    description="See which prompts cite URLs that match your target website list."
                />

                {/* Results Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {brand.name} — {results.length} prompts with matching resources
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {results.length === 0 ? (
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
                                                        <Badge variant="outline" className="text-xs">
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
