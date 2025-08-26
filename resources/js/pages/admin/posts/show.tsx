import React from 'react';
import { Head } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Building2, FileText, Brain, Hash, Target, Eye } from 'lucide-react';

interface Post {
    id: number;
    title: string;
    content: string;
    status: string;
    created_at: string;
    updated_at: string;
    brand: {
        id: number;
        name: string;
        user: {
            id: number;
            name: string;
        };
    };
    ai_model: {
        id: number;
        name: string;
    };
    post_citations?: Array<{
        id: number;
        citation_text: string;
        source_url: string;
        is_verified: boolean;
    }>;
    post_prompts?: Array<{
        id: number;
        prompt_text: string;
        ai_model: {
            id: number;
            name: string;
        };
    }>;
}

interface Props {
    post: Post;
}

const Show: React.FC<Props> = ({ post }) => {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Posts', href: '/admin/posts' },
        { title: post.title, href: '#' }
    ];

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            draft: { variant: 'secondary' as const, label: 'Draft' },
            pending: { variant: 'outline' as const, label: 'Pending' },
            approved: { variant: 'default' as const, label: 'Approved' },
            rejected: { variant: 'destructive' as const, label: 'Rejected' },
            published: { variant: 'default' as const, label: 'Published' },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || {
            variant: 'secondary' as const,
            label: status
        };

        return (
            <Badge variant={config.variant}>
                {config.label}
            </Badge>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Admin - ${post.title}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/posts">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Posts
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Post Details</h1>
                            <p className="text-muted-foreground">View and manage post information</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={`/admin/posts/${post.id}/edit`}>
                            <Button variant="outline">
                                <FileText className="h-4 w-4 mr-2" />
                                Edit Post
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Post Content */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        {post.title}
                                    </CardTitle>
                                    {getStatusBadge(post.status)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="prose max-w-none">
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {post.content}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Citations */}
                        {post.post_citations && post.post_citations.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Hash className="h-5 w-5" />
                                        Citations ({post.post_citations.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {post.post_citations.map((citation) => (
                                            <div key={citation.id} className="border-l-4 border-blue-500 pl-4 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={citation.is_verified ? "default" : "secondary"}>
                                                        {citation.is_verified ? "Verified" : "Unverified"}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{citation.citation_text}</p>
                                                {citation.source_url && (
                                                    <a 
                                                        href={citation.source_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:text-blue-600 text-sm underline"
                                                    >
                                                        View Source
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Prompts */}
                        {post.post_prompts && post.post_prompts.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Target className="h-5 w-5" />
                                        AI Prompts ({post.post_prompts.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {post.post_prompts.map((prompt) => (
                                            <div key={prompt.id} className="border rounded-lg p-4 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">
                                                        {prompt.ai_model.name}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                    {prompt.prompt_text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Post Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Eye className="h-5 w-5" />
                                    Post Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">Agency:</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground ml-6">
                                        {post.brand.user.name}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Hash className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">Brand:</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground ml-6">
                                        {post.brand.name}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Brain className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">AI Model:</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground ml-6">
                                        {post.ai_model.name}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">Created:</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground ml-6">
                                        {new Date(post.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>

                                {post.updated_at !== post.created_at && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">Updated:</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground ml-6">
                                            {new Date(post.updated_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Link href={`/admin/posts/${post.id}/edit`} className="block">
                                    <Button variant="outline" className="w-full justify-start">
                                        <FileText className="h-4 w-4 mr-2" />
                                        Edit Post
                                    </Button>
                                </Link>
                                <Link href="/admin/posts" className="block">
                                    <Button variant="ghost" className="w-full justify-start">
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Back to Posts
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default Show;
