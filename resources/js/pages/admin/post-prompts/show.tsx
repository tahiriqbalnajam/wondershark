import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

import FormattedDate from '@/components/FormattedDate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import {
    ArrowLeft,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    ExternalLink,
    Brain,
} from 'lucide-react';

type AiModelOption = {
    id: number;
    name: string;
    display_name: string;
};

type Prompt = {
    id: number;
    prompt: string;
    source: string;
    ai_provider: string | null;
    ai_model: AiModelOption | null;
    order: number;
    is_selected: boolean;
    is_active: boolean;
    status: string;
    visibility: string | number | null;
    position: number | null;
    sentiment: string | number | null;
    volume: string | null;
    analysis_completed_at: string | null;
    analysis_failed_at: string | null;
    analysis_error: string | null;
    created_at: string;
};

type Post = {
    id: number;
    title: string;
    url: string;
    description: string | null;
    status: string;
    created_at: string;
    brand: {
        id: number;
        name: string;
        agency?: {
            id: number;
            name: string;
        } | null;
    };
};

type Summary = {
    total: number;
    analyzed: number;
    failed: number;
    never_analyzed: number;
};

type Props = {
    post: Post;
    prompts: Prompt[];
    summary: Summary;
    aiModels: AiModelOption[];
};

export default function PostPromptsShow({ post, prompts, summary, aiModels }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Post Prompts', href: '/admin/post-prompts' },
        { title: post.title || `Post #${post.id}`, href: '#' },
    ];

    const getSourceBadge = (source: string) => {
        const config: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
            ai_generated: { variant: 'default', label: 'AI Generated' },
            user_added: { variant: 'secondary', label: 'User Added' },
            fallback: { variant: 'outline', label: 'Fallback' },
            post_title: { variant: 'default', label: 'Post Title' },
        };
        const c = config[source] || { variant: 'secondary', label: source };
        return <Badge variant={c.variant}>{c.label}</Badge>;
    };

    const handleAiModelChange = (promptId: number, aiModelId: string) => {
        router.put(`/admin/post-prompts/prompts/${promptId}/ai-model`, {
            ai_model_id: Number(aiModelId),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('AI model updated');
            },
            onError: () => {
                toast.error('Failed to update AI model');
            },
        });
    };

    const getStatusBadge = (promptStatus: string, postStatus: string) => {
        // Show as Active when the parent post is published
        if (postStatus === 'published') {
            return <Badge variant="default">Active</Badge>;
        }
        const config: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
            suggested: { variant: 'secondary', label: 'Suggested' },
            active: { variant: 'default', label: 'Active' },
            inactive: { variant: 'outline', label: 'Inactive' },
        };
        const c = config[promptStatus] || { variant: 'secondary', label: promptStatus };
        return <Badge variant={c.variant}>{c.label}</Badge>;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${post.title || 'Post'} - Prompt Analytics`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/post-prompts">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                {post.title || 'Untitled Post'}
                            </h1>
                            <p className="text-muted-foreground">
                                {post.brand.name}
                                {post.brand.agency && ` / ${post.brand.agency.name}`}
                            </p>
                        </div>
                    </div>
                    <a href={post.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open Post
                        </Button>
                    </a>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Prompts</p>
                                    <p className="text-3xl font-bold">{summary.total}</p>
                                </div>
                                <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Analyzed</p>
                                    <p className="text-3xl font-bold text-green-600">{summary.analyzed}</p>
                                </div>
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Failed</p>
                                    <p className="text-3xl font-bold text-red-600">{summary.failed}</p>
                                </div>
                                <XCircle className="w-8 h-8 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Never Analyzed</p>
                                    <p className="text-3xl font-bold text-amber-600">{summary.never_analyzed}</p>
                                </div>
                                <Clock className="w-8 h-8 text-amber-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Prompts Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            Prompts ({prompts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Prompt</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>AI Provider</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Stats</TableHead>
                                    <TableHead>Analyzed At</TableHead>
                                    <TableHead>Failed At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {prompts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                            No prompts found for this post.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {prompts.map((prompt, idx) => (
                                    <TableRow key={prompt.id}>
                                        <TableCell className="text-muted-foreground">
                                            {idx + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-md truncate font-medium" title={prompt.prompt}>
                                                {prompt.prompt}
                                            </div>
                                            {prompt.analysis_error && (
                                                <div className="flex items-start gap-1 mt-1 text-xs text-red-600">
                                                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                                    <span className="line-clamp-2">{prompt.analysis_error}</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{getSourceBadge(prompt.source)}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={String(prompt.ai_model?.id ?? prompt.ai_provider ?? '')}
                                                onValueChange={(value) => handleAiModelChange(prompt.id, value)}
                                            >
                                                <SelectTrigger className="w-36 h-8 text-xs">
                                                    <SelectValue placeholder="Select model" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {aiModels.map((model) => (
                                                        <SelectItem key={model.id} value={String(model.id)}>
                                                            {model.display_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(prompt.status, post.status)}</TableCell>
                                        <TableCell>
                                            <div className="text-xs space-y-0.5">
                                                {prompt.visibility !== null && prompt.visibility !== '' && (
                                                    <div>Vis: <span className="font-medium">{prompt.visibility}</span></div>
                                                )}
                                                {prompt.position !== null && prompt.position !== 0 && (
                                                    <div>Pos: <span className="font-medium">{prompt.position}</span></div>
                                                )}
                                                {prompt.sentiment !== null && prompt.sentiment !== '' && (
                                                    <div>Sent: <span className="font-medium">{prompt.sentiment}</span></div>
                                                )}
                                                {prompt.volume && (
                                                    <div>Vol: <span className="font-medium capitalize">{prompt.volume}</span></div>
                                                )}
                                                {prompt.visibility === null && prompt.position === null && prompt.sentiment === null && !prompt.volume && (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {prompt.analysis_completed_at ? (
                                                <FormattedDate date={prompt.analysis_completed_at} format="datetime" />
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {prompt.analysis_failed_at ? (
                                                <div className="flex items-center gap-1 text-red-600">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    <FormattedDate date={prompt.analysis_failed_at} format="datetime" />
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
