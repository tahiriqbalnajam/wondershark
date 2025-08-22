import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowLeft, 
    Play, 
    CheckCircle2, 
    XCircle, 
    ExternalLink,
    Clock,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Post {
    id: number;
    title: string;
    url: string;
    status: string;
    description: string;
    brand: {
        id: number;
        name: string;
    };
    user: {
        name: string;
    };
    prompts: Array<{
        id: number;
        prompt: string;
        is_selected: boolean;
        source: string;
        ai_provider: string;
    }>;
    citations: Array<{
        id: number;
        ai_model: string;
        is_mentioned: boolean;
        position: number | null;
        citation_text: string | null;
        confidence?: number;
        checked_at: string;
        metadata?: {
            raw_response?: string;
            success?: boolean;
            source_url?: string;
            prompts_analyzed?: number;
            prompts_mentioning_url?: number;
            search_context?: string;
        };
    }>;
    created_at: string;
}

interface Props {
    post: Post;
    combinedPrompts: string;
}

export default function CitationCheckShow({ post, combinedPrompts }: Props) {
    const [isLoading, setIsLoading] = useState(false);

    const handleRecheck = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/admin/citation-check/${post.id}/recheck`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                }
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Citation recheck completed successfully');
                window.location.reload();
            } else {
                toast.error(result.message || 'Citation recheck failed');
            }
        } catch (error) {
            toast.error('Failed to run citation recheck');
            console.error('Citation recheck error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-800';
            case 'draft':
                return 'bg-yellow-100 text-yellow-800';
            case 'pending':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const getConfidenceColor = (confidence?: number) => {
        if (!confidence) return 'text-gray-500';
        if (confidence >= 0.8) return 'text-green-600';
        if (confidence >= 0.6) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <AppLayout>
            <Head title={`Citation Check - ${post.title}`} />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/citation-check"
                            className="flex items-center text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Back to Citation Check
                        </Link>
                    </div>
                    <Button
                        onClick={handleRecheck}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Recheck Citations
                    </Button>
                </div>

                {/* Post Information */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <CardTitle className="flex items-center gap-2">
                                    {post.title}
                                    <Badge className={getStatusColor(post.status)}>
                                        {post.status}
                                    </Badge>
                                </CardTitle>
                                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                                    <div>Brand: <span className="font-medium">{post.brand.name}</span></div>
                                    <div>Created by: <span className="font-medium">{post.user.name}</span></div>
                                    <div>Created: <span className="font-medium">{formatDate(post.created_at)}</span></div>
                                </div>
                            </div>
                            {post.url && (
                                <a
                                    href={post.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View Post
                                </a>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {post.description && (
                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Description</h4>
                                <p className="text-muted-foreground">{post.description}</p>
                            </div>
                        )}
                        {post.url && (
                            <div>
                                <h4 className="font-medium mb-2">URL</h4>
                                <code className="bg-gray-100 px-2 py-1 rounded text-sm break-all">
                                    {post.url}
                                </code>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Post Prompts */}
                <Card>
                    <CardHeader>
                        <CardTitle>Post Prompts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {post.prompts && post.prompts.length > 0 ? (
                            <div className="space-y-3">
                                <div className="bg-blue-50 p-3 rounded-md">
                                    <h4 className="font-medium mb-2">Combined Prompts (Used for Citation Check):</h4>
                                    <p className="text-sm text-blue-800">{combinedPrompts}</p>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium mb-3">Individual Selected Prompts:</h4>
                                    <div className="space-y-2">
                                        {post.prompts
                                            .filter(prompt => prompt.is_selected)
                                            .map((prompt, index) => (
                                            <div key={prompt.id} className="border-l-4 border-blue-500 pl-3 py-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">Prompt #{index + 1} - {prompt.source}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {prompt.ai_provider}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm mt-1">{prompt.prompt}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                {post.prompts.some(p => !p.is_selected) && (
                                    <div>
                                        <h4 className="font-medium mb-3">Other Available Prompts:</h4>
                                        <div className="space-y-2">
                                            {post.prompts
                                                .filter(prompt => !prompt.is_selected)
                                                .map((prompt, index) => (
                                                <div key={prompt.id} className="border-l-4 border-gray-300 pl-3 py-2 opacity-60">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-500">Prompt #{index + 1} - {prompt.source}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {prompt.ai_provider}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm mt-1">{prompt.prompt}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-muted-foreground mb-2">No prompts found for this post.</p>
                                <Link 
                                    href={`/posts/${post.id}/manage-prompts`}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                    Generate or manage prompts for this post →
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Citation Results */}
                <Card>
                    <CardHeader>
                        <CardTitle>Citation Check Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {post.citations.length > 0 ? (
                            <div className="space-y-6">
                                {['openai', 'gemini', 'perplexity'].map((aiModel) => {
                                    const citation = post.citations.find(c => c.ai_model === aiModel);
                                    return (
                                        <div key={aiModel} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                                                    {aiModel}
                                                    {citation ? (
                                                        citation.is_mentioned ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-600" />
                                                        )
                                                    ) : (
                                                        <Clock className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </h3>
                                                <div className="text-sm text-muted-foreground">
                                                    {citation ? (
                                                        `Checked: ${formatDate(citation.checked_at)}`
                                                    ) : (
                                                        'Not checked yet'
                                                    )}
                                                </div>
                                            </div>

                                            {citation ? (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground">Status:</span>
                                                            <div className="mt-1">
                                                                {citation.is_mentioned ? (
                                                                    <Badge className="bg-green-100 text-green-800">
                                                                        Mentioned
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge className="bg-red-100 text-red-800">
                                                                        Not Found
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Position:</span>
                                                            <div className="mt-1 font-medium">
                                                                {citation.position ? `#${citation.position}` : 'N/A'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Confidence:</span>
                                                            <div className={`mt-1 font-medium ${getConfidenceColor(citation.confidence)}`}>
                                                                {citation.confidence ? 
                                                                    `${Math.round(citation.confidence * 100)}%` : 
                                                                    'N/A'
                                                                }
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Success:</span>
                                                            <div className="mt-1">
                                                                {citation.metadata?.success ? (
                                                                    <Badge className="bg-green-100 text-green-800">Yes</Badge>
                                                                ) : (
                                                                    <Badge className="bg-red-100 text-red-800">No</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Enhanced Analysis Information */}
                                                    <div className="bg-blue-50 p-4 rounded-lg">
                                                        <h4 className="font-medium text-blue-900 mb-3">Analysis Details</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <span className="text-blue-700">Source URL:</span>
                                                                <div className="mt-1 text-blue-900 font-mono text-xs break-all">
                                                                    {citation.metadata?.source_url || post.url}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="text-blue-700">Prompts Analyzed:</span>
                                                                <div className="mt-1 text-blue-900 font-semibold">
                                                                    {citation.metadata?.prompts_analyzed || 0}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="text-blue-700">Prompts with URL:</span>
                                                                <div className="mt-1 text-blue-900 font-semibold">
                                                                    {citation.metadata?.prompts_mentioning_url || 0}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {citation.metadata?.search_context && (
                                                            <div className="mt-3">
                                                                <span className="text-blue-700">Search Context:</span>
                                                                <div className="mt-1 text-blue-800 text-sm">
                                                                    {citation.metadata.search_context}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {citation.citation_text && (
                                                        <div>
                                                            <span className="text-sm text-muted-foreground">Citation Text:</span>
                                                            <div className="mt-1 p-3 bg-gray-50 rounded text-sm">
                                                                {citation.citation_text}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {citation.metadata?.raw_response && (
                                                        <details>
                                                            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-gray-900">
                                                                View Raw AI Response
                                                            </summary>
                                                            <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                                                {citation.metadata.raw_response}
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    <Clock className="w-12 h-12 mx-auto mb-2" />
                                                    <p>No citation check performed yet for {aiModel}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <Clock className="w-16 h-16 mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Citation Checks Yet</h3>
                                <p className="mb-4">Run a citation check to see results from AI models</p>
                                <Button onClick={handleRecheck} disabled={isLoading}>
                                    <Play className="w-4 h-4 mr-2" />
                                    Run First Check
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
