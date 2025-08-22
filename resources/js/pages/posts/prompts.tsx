import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    ArrowLeft,
    Wand2,
    Plus,
    Trash2,
    RefreshCw,
    ExternalLink,
    MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface PostPrompt {
    id: number;
    prompt: string;
    source: string;
    ai_provider: string;
    is_selected: boolean;
    order: number;
}

interface Post {
    id: number;
    title: string;
    url: string;
    description?: string;
    status: string;
    posted_at: string;
    brand: {
        id: number;
        name: string;
    };
    user: {
        id: number;
        name: string;
    };
    prompts_count: number;
}

interface Props {
    post: Post;
}

export default function PostPrompts({ post }: Props) {
    const [prompts, setPrompts] = useState<PostPrompt[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const [description, setDescription] = useState('');
    const [showAddCustom, setShowAddCustom] = useState(false);

    useEffect(() => {
        const loadPrompts = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/posts/${post.id}/get-prompts-with-ratio`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({ limit: 100 })
                });

                const result = await response.json();

                if (result.success) {
                    setPrompts(result.prompts);
                } else {
                    toast.error(result.message || 'Failed to load prompts');
                }
            } catch (error) {
                toast.error('Failed to load prompts');
                console.error('Load prompts error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPrompts();
    }, [post.id]);

    const refreshPrompts = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/posts/${post.id}/get-prompts-with-ratio`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ limit: 100 })
            });

            const result = await response.json();

            if (result.success) {
                setPrompts(result.prompts);
            } else {
                toast.error(result.message || 'Failed to load prompts');
            }
        } catch (error) {
            toast.error('Failed to load prompts');
            console.error('Load prompts error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generatePrompts = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(`/posts/${post.id}/generate-prompts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ description })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(result.cached ? 'Loaded existing prompts' : 'Prompts generated successfully');
                setPrompts(result.prompts);
            } else {
                toast.error(result.message || 'Failed to generate prompts');
            }
        } catch (error) {
            toast.error('Failed to generate prompts');
            console.error('Generate prompts error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const addCustomPrompt = async () => {
        if (!customPrompt.trim()) {
            toast.error('Please enter a prompt');
            return;
        }

        try {
            const response = await fetch(`/posts/${post.id}/add-custom-prompt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ prompt: customPrompt })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Custom prompt added successfully');
                setCustomPrompt('');
                setShowAddCustom(false);
                setPrompts(prev => [...prev, result.prompt]);
            } else {
                toast.error(result.message || 'Failed to add custom prompt');
            }
        } catch (error) {
            toast.error('Failed to add custom prompt');
            console.error('Add custom prompt error:', error);
        }
    };

    const updatePromptSelection = async (promptId: number, isSelected: boolean) => {
        try {
            const response = await fetch(`/post-prompts/${promptId}/selection`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ is_selected: isSelected })
            });

            const result = await response.json();

            if (result.success) {
                setPrompts(prev => prev.map(p => 
                    p.id === promptId ? { ...p, is_selected: isSelected } : p
                ));
            } else {
                toast.error(result.message || 'Failed to update selection');
            }
        } catch (error) {
            toast.error('Failed to update selection');
            console.error('Update selection error:', error);
        }
    };

    const deletePrompt = async (promptId: number) => {
        if (!confirm('Are you sure you want to delete this prompt?')) {
            return;
        }

        try {
            const response = await fetch(`/post-prompts/${promptId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                }
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Prompt deleted successfully');
                setPrompts(prev => prev.filter(p => p.id !== promptId));
            } else {
                toast.error(result.message || 'Failed to delete prompt');
            }
        } catch (error) {
            toast.error('Failed to delete prompt');
            console.error('Delete prompt error:', error);
        }
    };

    const getSourceBadgeColor = (source: string) => {
        switch (source) {
            case 'ai_generated':
                return 'bg-blue-100 text-blue-800';
            case 'user_added':
                return 'bg-green-100 text-green-800';
            case 'fallback':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getProviderBadgeColor = (provider: string) => {
        switch (provider?.toLowerCase()) {
            case 'openai':
                return 'bg-purple-100 text-purple-800';
            case 'gemini':
                return 'bg-orange-100 text-orange-800';
            case 'perplexity':
                return 'bg-indigo-100 text-indigo-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <AppLayout>
            <Head title={`Manage Prompts - ${post.title}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/citation-check">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Citation Check
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">Manage Prompts</h1>
                            <p className="text-muted-foreground">
                                Generate and manage prompts for citation checking
                            </p>
                        </div>
                    </div>
                </div>

                {/* Post Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            {post.title}
                        </CardTitle>
                        <CardDescription>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span>Brand: {post.brand.name}</span>
                                    <Badge>{post.status}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>By: {post.user.name}</span>
                                    <span>Prompts: {prompts.length}</span>
                                </div>
                                {post.url && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">URL:</span>
                                        <a
                                            href={post.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                            {post.url}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </CardDescription>
                    </CardHeader>
                </Card>

                {/* Generate Prompts */}
                <Card>
                    <CardHeader>
                        <CardTitle>Generate Prompts</CardTitle>
                        <CardDescription>
                            Generate AI prompts for citation checking based on the post content
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Additional Description (Optional)</label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide additional context about this post to improve prompt generation..."
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={generatePrompts}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? (
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Wand2 className="w-4 h-4 mr-2" />
                                    )}
                                    {isGenerating ? 'Generating...' : 'Generate Prompts'}
                                </Button>
                                <Button
                                    onClick={() => setShowAddCustom(!showAddCustom)}
                                    variant="outline"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Custom Prompt
                                </Button>
                                <Button
                                    onClick={refreshPrompts}
                                    variant="outline"
                                    disabled={isLoading}
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Add Custom Prompt */}
                {showAddCustom && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Custom Prompt</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="Enter your custom prompt..."
                                    rows={3}
                                />
                                <div className="flex gap-2">
                                    <Button onClick={addCustomPrompt}>
                                        Add Prompt
                                    </Button>
                                    <Button
                                        onClick={() => setShowAddCustom(false)}
                                        variant="outline"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Prompts List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Generated Prompts ({prompts.length})</CardTitle>
                        <CardDescription>
                            Select prompts to use for citation checking. Selected prompts will be used to search for citations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                                <p className="text-muted-foreground">Loading prompts...</p>
                            </div>
                        ) : prompts.length === 0 ? (
                            <div className="text-center py-8">
                                <MessageSquare className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-muted-foreground">No prompts generated yet</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Click "Generate Prompts" to create AI-powered prompts for citation checking
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {prompts.map((prompt) => (
                                    <div
                                        key={prompt.id}
                                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
                                    >
                                        <Checkbox
                                            checked={prompt.is_selected}
                                            onCheckedChange={(checked) => 
                                                updatePromptSelection(prompt.id, !!checked)
                                            }
                                            className="mt-1"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm leading-relaxed">{prompt.prompt}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge className={getSourceBadgeColor(prompt.source)}>
                                                    {prompt.source === 'ai_generated' ? 'AI Generated' :
                                                     prompt.source === 'user_added' ? 'Custom' :
                                                     prompt.source === 'fallback' ? 'Fallback' : prompt.source}
                                                </Badge>
                                                {prompt.ai_provider && (
                                                    <Badge className={getProviderBadgeColor(prompt.ai_provider)}>
                                                        {prompt.ai_provider}
                                                    </Badge>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    Order: {prompt.order}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => deletePrompt(prompt.id)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
