import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, RefreshCw, MessageSquare, Check, X, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Post {
    id: number;
    title: string;
    url: string;
    description?: string;
    brand: {
        id: number;
        name: string;
    };
}

interface Prompt {
    id: number;
    prompt: string;
    source: string;
    ai_provider?: string;
    is_selected: boolean;
    order: number;
    created_at: string;
}

interface Stats {
    total_prompts: number;
    selected_prompts: number;
    ai_generated: number;
    user_added: number;
}

interface Props {
    post: Post;
    prompts: Prompt[];
    promptsByProvider: Record<string, Prompt[]>;
    stats: Stats;
    availableProviders: Record<string, string>;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function PostPromptsIndex({ post, prompts, stats, availableProviders, flash }: Props) {
    const [loading, setLoading] = useState<string | null>(null);
    const [newPromptText, setNewPromptText] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [filterByProvider, setFilterByProvider] = useState<string>('all');
    const [showOnlySelected, setShowOnlySelected] = useState(false);

    // Show flash messages
    React.useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleGeneratePrompts = async () => {
        setLoading('generate');
        try {
            await router.post(`/posts/${post.id}/generate-prompts`, {
                description: post.description || ''
            });
            toast.success('Prompts are being generated in the background');
            router.reload();
        } catch {
            toast.error('Failed to generate prompts');
        } finally {
            setLoading(null);
        }
    };

    const handleToggleSelection = async (promptId: number, currentSelection: boolean) => {
        setLoading(`toggle-${promptId}`);
        try {
            await router.put(`/post-prompts/${promptId}/selection`, {
                is_selected: !currentSelection
            });
            // Success message will be shown via flash message from backend
        } catch {
            toast.error('Failed to update prompt selection');
        } finally {
            setLoading(null);
        }
    };

    const handleAddCustomPrompt = async () => {
        if (!newPromptText.trim()) {
            toast.error('Please enter a prompt');
            return;
        }

        setLoading('add-prompt');
        try {
            await router.post(`/posts/${post.id}/add-custom-prompt`, {
                prompt: newPromptText.trim()
            });
            setNewPromptText('');
            setShowAddDialog(false);
            // Success message will be shown via flash message from backend
        } catch {
            toast.error('Failed to add custom prompt');
        } finally {
            setLoading(null);
        }
    };

    const handleDeletePrompt = async (promptId: number) => {
        if (!confirm('Are you sure you want to delete this prompt?')) return;

        setLoading(`delete-${promptId}`);
        try {
            await router.delete(`/post-prompts/${promptId}`);
            // Success message will be shown via flash message from backend
        } catch {
            toast.error('Failed to delete prompt');
        } finally {
            setLoading(null);
        }
    };

    const getStatusBadge = (prompt: Prompt) => {
        if (prompt.is_selected) {
            return <Badge variant="default" className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
        } else {
            return <Badge variant="secondary"><X className="w-3 h-3 mr-1" />Pending</Badge>;
        }
    };

    const getSourceBadge = (source: string) => {
        switch (source) {
            case 'ai_generated':
                return <Badge variant="outline">AI Generated</Badge>;
            case 'user_added':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700">User Added</Badge>;
            default:
                return <Badge variant="secondary">{source}</Badge>;
        }
    };

    const filteredPrompts = prompts.filter(prompt => {
        if (filterByProvider !== 'all' && prompt.ai_provider !== filterByProvider) return false;
        if (showOnlySelected && !prompt.is_selected) return false;
        return true;
    });

    return (
        <AppLayout>
            <Head title={`Manage Prompts - ${post.title}`} />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                            <Link href="/posts" className="hover:text-foreground">Posts</Link>
                            <span>/</span>
                            <span>{post.title}</span>
                            <span>/</span>
                            <span>Manage Prompts</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Manage Prompts</h1>
                        <p className="text-muted-foreground">
                            Approve, reject, and manage prompts for {post.brand.name}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                        >
                            <Link href="/posts">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Posts
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Post Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <MessageSquare className="w-5 h-5" />
                            <span>{post.title || 'Untitled Post'}</span>
                        </CardTitle>
                        <CardDescription>
                            <div className="flex items-center space-x-4 text-sm">
                                <span><strong>Brand:</strong> {post.brand.name}</span>
                                <span><strong>URL:</strong> 
                                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:underline inline-flex items-center">
                                        {post.url}
                                        <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                </span>
                            </div>
                        </CardDescription>
                    </CardHeader>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Prompts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_prompts}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.selected_prompts}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.ai_generated}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">User Added</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{stats.user_added}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <label htmlFor="provider-filter" className="text-sm font-medium">Filter by Provider:</label>
                            <select
                                id="provider-filter"
                                className="px-3 py-1 border border-input bg-background rounded text-sm"
                                value={filterByProvider}
                                onChange={(e) => setFilterByProvider(e.target.value)}
                            >
                                <option value="all">All Providers</option>
                                {Object.entries(availableProviders).map(([key, name]) => (
                                    <option key={key} value={key}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="show-selected"
                                checked={showOnlySelected}
                                onCheckedChange={(checked) => setShowOnlySelected(!!checked)}
                            />
                            <label htmlFor="show-selected" className="text-sm font-medium">Show only approved</label>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Custom Prompt
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Custom Prompt</DialogTitle>
                                    <DialogDescription>
                                        Add a custom prompt question for this post.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <Textarea
                                        placeholder="Enter your custom prompt question..."
                                        value={newPromptText}
                                        onChange={(e) => setNewPromptText(e.target.value)}
                                        rows={4}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={handleAddCustomPrompt}
                                        disabled={loading === 'add-prompt' || !newPromptText.trim()}
                                    >
                                        {loading === 'add-prompt' && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                                        Add Prompt
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button
                            onClick={handleGeneratePrompts}
                            variant="outline"
                            size="sm"
                            disabled={loading === 'generate'}
                        >
                            {loading === 'generate' ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            {stats.total_prompts > 0 ? 'Regenerate' : 'Generate'} Prompts
                        </Button>
                    </div>
                </div>

                {/* Prompts Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Prompts ({filteredPrompts.length})</CardTitle>
                        <CardDescription>
                            Manage and approve prompts for your post. Approved prompts will be used for citation checking.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredPrompts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                {stats.total_prompts === 0 ? (
                                    <div>
                                        <p className="mb-4">No prompts available for this post.</p>
                                        <Button onClick={handleGeneratePrompts} disabled={loading === 'generate'}>
                                            {loading === 'generate' ? (
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Plus className="w-4 h-4 mr-2" />
                                            )}
                                            Generate Prompts
                                        </Button>
                                    </div>
                                ) : (
                                    <p>No prompts match your current filters.</p>
                                )}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Prompt</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Provider</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPrompts.map((prompt) => (
                                        <TableRow key={prompt.id}>
                                            <TableCell className="max-w-md">
                                                <p className="text-sm">{prompt.prompt}</p>
                                            </TableCell>
                                            <TableCell>{getSourceBadge(prompt.source)}</TableCell>
                                            <TableCell>
                                                {prompt.ai_provider ? (
                                                    <Badge variant="outline">
                                                        {availableProviders[prompt.ai_provider] || prompt.ai_provider}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(prompt)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(prompt.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant={prompt.is_selected ? "destructive" : "default"}
                                                        onClick={() => handleToggleSelection(prompt.id, prompt.is_selected)}
                                                        disabled={loading === `toggle-${prompt.id}`}
                                                    >
                                                        {loading === `toggle-${prompt.id}` ? (
                                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                                        ) : prompt.is_selected ? (
                                                            <X className="w-3 h-3" />
                                                        ) : (
                                                            <Check className="w-3 h-3" />
                                                        )}
                                                    </Button>
                                                    {prompt.source === 'user_added' && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleDeletePrompt(prompt.id)}
                                                            disabled={loading === `delete-${prompt.id}`}
                                                        >
                                                            {loading === `delete-${prompt.id}` ? (
                                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3 h-3" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Selected Prompts Summary */}
                {stats.selected_prompts > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Approved Prompts Summary</CardTitle>
                            <CardDescription>
                                These {stats.selected_prompts} approved prompts will be used for citation checking.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {prompts.filter(p => p.is_selected).map((prompt, index) => (
                                    <div key={prompt.id} className="flex items-start space-x-2 p-2 bg-green-50 rounded">
                                        <span className="text-sm font-medium text-green-700 mt-0.5">{index + 1}.</span>
                                        <p className="text-sm text-green-800">{prompt.prompt}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
