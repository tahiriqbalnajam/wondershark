import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';

import { CheckCircle, XCircle, Building2, ExternalLink } from 'lucide-react';

type Resource = {
    url: string;
    type: string;
    title: string;
    domain: string;
    is_matching: boolean;
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
        'google-ai-overview': 'google-ai-overview.svg',
        anthropic: 'claude.svg',
        claude: 'claude.svg',
        xai: 'grok.svg',
        deepseek: 'deepseek.svg',
        mistral: 'mistral.svg',
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

type Props = {
    brand: { id: number; name: string };
    results: Result[];
};

export default function GapAnalysisIndex({ brand, results }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: brand.name, href: `/brands/${brand.id}` },
        { title: 'Gap Analysis', href: `/brands/${brand.id}/gap-analysis` },
    ];
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
                                                        <Badge variant="outline" className="text-xs inline-flex items-center gap-1.5 overflow-hidden [&_svg]:hidden border-0">
                                                            {modelIcon(result.ai_model.name) && (
                                                                <img
                                                                    src={`/images/ai-models/New folder/${modelIcon(result.ai_model.name)}`}
                                                                    alt=""
                                                                    className="h-5 w-5 rounded-sm shrink-0"
                                                                    title={result.ai_model.display_name}
                                                                />
                                                            )}
                                                            {/* {result.ai_model.display_name} */}
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
                                                                className={`inline-flex items-center gap-1.5 mr-1.5 mb-1 ${resource.is_matching ? '' : 'opacity-50'}`}
                                                                title={(resource.is_matching ? 'Matched — ' : '') + (resource.domain || resource.url)}
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
                                                            {result.competitor_mentions.map((comp, i) => (
                                                                <span
                                                                    key={i}
                                                                    title={comp.entity_name + (comp.entity_domain ? ` (${comp.entity_domain})` : '')}
                                                                >
                                                                    {comp.entity_domain ? (
                                                                        <img
                                                                            src={`https://www.google.com/s2/favicons?domain=${comp.entity_domain}&sz=32`}
                                                                            alt=""
                                                                            className="h-5 w-5 rounded-sm"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <Building2 className="h-4 w-4" />
                                                                    )}
                                                                </span>
                                                            ))}
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
