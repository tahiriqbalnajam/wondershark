import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { 
    ArrowLeft, 
    FileText, 
    ExternalLink, 
    Edit, 
    Plus,
    Calendar,
    Building2,
    Bot,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';

type PostCitation = {
    id: number;
    ai_model: 'openai' | 'gemini' | 'perplexity';
    citation_text?: string;
    citation_url?: string;
    position?: number;
    is_mentioned: boolean;
    metadata?: Record<string, unknown>;
    checked_at: string;
    created_at: string;
};

type Post = {
    id: number;
    title: string;
    url: string;
    description?: string;
    status: 'published' | 'draft' | 'archived';
    posted_at: string;
    created_at: string;
    brand: {
        id: number;
        name: string;
    };
    user: {
        id: number;
        name: string;
    };
    citations: PostCitation[];
};

type Props = {
    post: Post;
};

type CitationFormData = {
    ai_model: string;
    citation_text: string;
    citation_url: string;
    position: string;
    is_mentioned: boolean;
};

const breadcrumbs = (post: Post): BreadcrumbItem[] => [
    {
        title: 'Posts',
        href: '/posts',
    },
    {
        title: post.title || 'Untitled Post',
        href: `/posts/${post.id}`,
    },
];

export default function PostsShow({ post }: Props) {
    const [isAddingCitation, setIsAddingCitation] = useState(false);
    
    const { data, setData, post: submitForm, processing, errors, reset } = useForm<CitationFormData>({
        ai_model: '',
        citation_text: '',
        citation_url: '',
        position: '',
        is_mentioned: false,
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-800';
            case 'draft':
                return 'bg-yellow-100 text-yellow-800';
            case 'archived':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getAIModelColor = (model: string) => {
        switch (model) {
            case 'openai':
                return 'bg-green-100 text-green-800';
            case 'gemini':
                return 'bg-blue-100 text-blue-800';
            case 'perplexity':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleAddCitation = (e: React.FormEvent) => {
        e.preventDefault();
        submitForm(`/posts/${post.id}/citations`, {
            onSuccess: () => {
                setIsAddingCitation(false);
                reset();
            },
        });
    };

    const groupedCitations = post.citations.reduce((acc, citation) => {
        if (!acc[citation.ai_model]) {
            acc[citation.ai_model] = [];
        }
        acc[citation.ai_model].push(citation);
        return acc;
    }, {} as Record<string, PostCitation[]>);

    return (
        <AppLayout breadcrumbs={breadcrumbs(post)}>
            <Head title={post.title || 'Post Details'} />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/posts">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Posts
                            </Link>
                        </Button>
                        
                        <HeadingSmall 
                            title={post.title || 'Untitled Post'}
                            description="Post details and AI citation tracking"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/posts/${post.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Post
                            </Link>
                        </Button>

                        <Dialog open={isAddingCitation} onOpenChange={setIsAddingCitation}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Citation
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add AI Citation</DialogTitle>
                                    <DialogDescription>
                                        Track how this post is cited by different AI models.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAddCitation}>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="ai_model">AI Model *</Label>
                                            <Select 
                                                value={data.ai_model} 
                                                onValueChange={(value) => setData('ai_model', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select AI model" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="openai">OpenAI</SelectItem>
                                                    <SelectItem value="gemini">Google Gemini</SelectItem>
                                                    <SelectItem value="perplexity">Perplexity</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.ai_model && (
                                                <p className="text-sm text-destructive">{errors.ai_model}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="citation_text">Citation Text</Label>
                                            <Textarea
                                                id="citation_text"
                                                placeholder="How the AI model cited this post..."
                                                value={data.citation_text}
                                                onChange={(e) => setData('citation_text', e.target.value)}
                                                rows={3}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="citation_url">Citation URL</Label>
                                                <input
                                                    id="citation_url"
                                                    type="url"
                                                    placeholder="https://..."
                                                    value={data.citation_url}
                                                    onChange={(e) => setData('citation_url', e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="position">Position</Label>
                                                <input
                                                    id="position"
                                                    type="number"
                                                    placeholder="1, 2, 3..."
                                                    value={data.position}
                                                    onChange={(e) => setData('position', e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <input
                                                id="is_mentioned"
                                                type="checkbox"
                                                checked={data.is_mentioned}
                                                onChange={(e) => setData('is_mentioned', e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                            <Label htmlFor="is_mentioned">Post is mentioned/cited</Label>
                                        </div>
                                    </div>

                                    <DialogFooter className="mt-6">
                                        <Button type="button" variant="outline" onClick={() => setIsAddingCitation(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={processing}>
                                            {processing ? 'Adding...' : 'Add Citation'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Post Information Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Post Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">URL</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                        <a 
                                            href={post.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-sm break-all"
                                        >
                                            {post.url}
                                        </a>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Brand</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{post.brand.name}</span>
                                    </div>
                                </div>

                                {post.description && (
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                                        <p className="text-sm mt-1">{post.description}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                    <div className="mt-1">
                                        <Badge className={getStatusColor(post.status)}>
                                            {post.status}
                                        </Badge>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Posted Date</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{formatDate(post.posted_at)}</span>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                                    <p className="text-sm mt-1">{post.user.name}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Citations Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            AI Citations ({post.citations.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {post.citations.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Bot className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">No citations tracked yet</h3>
                                <p className="text-sm mb-4">
                                    Start tracking how AI models cite this post.
                                </p>
                                <Button onClick={() => setIsAddingCitation(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add First Citation
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(groupedCitations).map(([aiModel, citations]) => (
                                    <div key={aiModel}>
                                        <h4 className="font-medium mb-3 flex items-center gap-2">
                                            <Badge className={getAIModelColor(aiModel)}>
                                                {aiModel.toUpperCase()}
                                            </Badge>
                                            <span className="text-muted-foreground">
                                                ({citations.length} {citations.length === 1 ? 'citation' : 'citations'})
                                            </span>
                                        </h4>
                                        
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Citation Text</TableHead>
                                                    <TableHead>Position</TableHead>
                                                    <TableHead>Checked</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {citations.map((citation) => (
                                                    <TableRow key={citation.id}>
                                                        <TableCell>
                                                            {citation.is_mentioned ? (
                                                                <div className="flex items-center gap-2 text-green-600">
                                                                    <CheckCircle className="h-4 w-4" />
                                                                    <span className="text-sm">Mentioned</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-red-600">
                                                                    <XCircle className="h-4 w-4" />
                                                                    <span className="text-sm">Not Found</span>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                {citation.citation_text ? (
                                                                    <p className="text-sm">{citation.citation_text}</p>
                                                                ) : (
                                                                    <span className="text-sm text-muted-foreground italic">No citation text</span>
                                                                )}
                                                                {citation.citation_url && (
                                                                    <a 
                                                                        href={citation.citation_url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                                                    >
                                                                        <ExternalLink className="h-3 w-3" />
                                                                        View Source
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {citation.position ? (
                                                                <Badge variant="outline">#{citation.position}</Badge>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                <Clock className="h-3 w-3" />
                                                                {formatDate(citation.checked_at)}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
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
