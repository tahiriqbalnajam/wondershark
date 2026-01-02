import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { ArrowLeft, FileText, Users, Building2, AlertCircle, Save, X, CircleCheckBig, Power } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { PromptGenerationLoader } from '@/components/loaders/prompt-generation-loader';

type Agency = {
    id: number;
    name: string;
};

type Brand = {
    id: number;
    name: string;
    agency_id: number;
    can_create_posts: boolean;
    post_creation_note?: string;
    monthly_posts: number;
};

type Props = {
    agencies: Agency[];
    brands: Brand[];
    adminEmail: string;
    post?: {
        id: number;
        title: string;
        url: string;
        description: string;
        status: string;
        posted_at: string;
        brand_id: number;
    };
};

type FormData = {
    title: string;
    url: string;
    description: string;
    brand_id: string;
    status: string;
    posted_at: string;
    post_type: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin',
        href: '/admin',
    },
    {
        title: 'Posts',
        href: '/admin/posts',
    },
    {
        title: 'Create Post',
        href: '/admin/posts/create',
    },
];

type PromptData = {
    id: number;
    prompt_text: string;
    visibility: string;
    sentiment: number;
    position: number;
    location: string;
    volume: string;
    status: string;
    created_at: string;
};


export default function AdminPostsCreate({ agencies, brands, post: createdPost }: Props) {
    const { data, setData, post, put, processing, errors } = useForm<FormData>({
        title: createdPost?.title || '',
        url: createdPost?.url || '',
        description: createdPost?.description || '',
        brand_id: createdPost?.brand_id?.toString() || '',
        status: createdPost?.status || 'draft',
        posted_at: createdPost?.posted_at ? new Date(createdPost.posted_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        post_type: 'blog',
    });

    const [selectedAgency, setSelectedAgency] = useState('all');
    const [filteredBrands, setFilteredBrands] = useState<Brand[]>(brands);
    const [activeMainTab, setActiveMainTab] = useState(createdPost?.id ? 'propmts' : 'create-post');
    const [activePromptTab, setActivePromptTab] = useState('prompt-suggested');
    const [createdPostId, setCreatedPostId] = useState<number | null>(createdPost?.id || null);
    const [prompts, setPrompts] = useState<PromptData[]>([]);
    const [loadingPrompts, setLoadingPrompts] = useState(false);
    const [hasActivePrompts, setHasActivePrompts] = useState(false);
    const [selectedPrompts, setSelectedPrompts] = useState<number[]>([]);
    const [isUpdatingPrompts, setIsUpdatingPrompts] = useState(false);
    
    const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pollingAttemptsRef = useRef(0);
    const isPollingRef = useRef(false);
    const polledPostIdRef = useRef<number | null>(null);

    // Handle post from props (after creation or on page load)
    useEffect(() => {
        // Only start generating prompts if we have a post and haven't generated for this post ID yet
        if (createdPost?.id && polledPostIdRef.current !== createdPost.id) {
            console.log('Initializing for post:', createdPost.id);
            polledPostIdRef.current = createdPost.id;
            setCreatedPostId(createdPost.id);
            setActiveMainTab('propmts');
            setLoadingPrompts(true); // Start loading immediately
            
            // First check if prompts already exist
            checkExistingPrompts(createdPost.id);
        }

        // Cleanup on unmount
        return () => {
            if (pollingTimerRef.current) {
                clearTimeout(pollingTimerRef.current);
                pollingTimerRef.current = null;
            }
            isPollingRef.current = false;
        };
    }, [createdPost?.id]);

    const checkExistingPrompts = async (postId: number) => {
        try {
            const response = await axios.get(`/admin/posts/${postId}/prompts`);
            const promptsData = response.data.prompts || [];
            
            if (promptsData.length > 0) {
                // Prompts already exist
                console.log('Prompts already exist:', promptsData.length);
                setPrompts(promptsData);
                setLoadingPrompts(false);
                
                const activePromptsExist = promptsData.some((p: PromptData) => p.status === 'active');
                setHasActivePrompts(activePromptsExist);
                
                if (activePromptsExist) {
                    setActivePromptTab('prompt-active');
                } else {
                    setActivePromptTab('propmts-suggested');
                }
            } else {
                // No prompts exist, generate them
                console.log('No prompts found, generating...');
                generatePrompts(postId);
            }
        } catch (error) {
            console.error('Error checking prompts:', error);
            // If error, try to generate anyway
            generatePrompts(postId);
        }
    };

    const generatePrompts = async (postId: number) => {
        setLoadingPrompts(true);
        console.log('Starting prompt generation for post:', postId);
        
        // Use description from createdPost if available, otherwise from form data
        const description = createdPost?.description || data.description || data.url;
        
        if (!description) {
            console.error('No description or URL available to generate prompts');
            setLoadingPrompts(false);
            return;
        }
        
        try {
            const response = await axios.post(`/admin/posts/${postId}/prompts/generate`, {
                description: description
            });
            
            if (response.data.success && response.data.prompts) {
                console.log('Prompts generated successfully:', response.data.prompts.length);
                setPrompts(response.data.prompts);
                
                const activePromptsExist = response.data.prompts.some((p: PromptData) => p.status === 'active');
                setHasActivePrompts(activePromptsExist);
                
                if (activePromptsExist) {
                    setActivePromptTab('prompt-active');
                } else {
                    setActivePromptTab('propmts-suggested');
                }
            } else {
                console.error('Prompt generation failed:', response.data.message || 'No prompts returned');
                // Keep prompts empty but stop loading
                setPrompts([]);
            }
        } catch (error) {
            console.error('Error generating prompts:', error);
            // Keep prompts empty but stop loading
            setPrompts([]);
        } finally {
            setLoadingPrompts(false);
        }
    };

    const startPollingForPrompts = (postId: number) => {
        // This function is no longer needed but kept for compatibility
        console.log('Polling disabled, using direct API call');
    };

    const pollForPrompts = async (postId: number) => {
        // This function is no longer needed but kept for compatibility
    };

    const handleSelectPrompt = (promptId: number, checked: boolean) => {
        if (checked) {
            setSelectedPrompts(prev => [...prev, promptId]);
        } else {
            setSelectedPrompts(prev => prev.filter(id => id !== promptId));
        }
    };

    const handleBulkActivate = async () => {
        if (selectedPrompts.length === 0 || !createdPostId) return;
        setIsUpdatingPrompts(true);
        try {
            await axios.post(`/admin/posts/${createdPostId}/prompts/bulk-update`, {
                prompt_ids: selectedPrompts,
                action: 'activate',
            });
            // Refresh prompts
            await checkExistingPrompts(createdPostId);
            setSelectedPrompts([]);
        } catch (error) {
            console.error('Error activating prompts:', error);
        } finally {
            setIsUpdatingPrompts(false);
        }
    };

    const handleBulkReject = async () => {
        if (selectedPrompts.length === 0 || !createdPostId) return;
        setIsUpdatingPrompts(true);
        try {
            await axios.post(`/admin/posts/${createdPostId}/prompts/bulk-update`, {
                prompt_ids: selectedPrompts,
                action: 'reject',
            });
            // Refresh prompts
            await checkExistingPrompts(createdPostId);
            setSelectedPrompts([]);
        } catch (error) {
            console.error('Error rejecting prompts:', error);
        } finally {
            setIsUpdatingPrompts(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedPrompts.length === 0 || !createdPostId) return;
        setIsUpdatingPrompts(true);
        try {
            await axios.post(`/admin/posts/${createdPostId}/prompts/bulk-update`, {
                prompt_ids: selectedPrompts,
                action: 'delete',
            });
            // Refresh prompts
            await checkExistingPrompts(createdPostId);
            setSelectedPrompts([]);
        } catch (error) {
            console.error('Error deleting prompts:', error);
        } finally {
            setIsUpdatingPrompts(false);
        }
    };

    // Type assertion for additional error fields
    const formErrors = errors as typeof errors & {
        permission?: string;
        limit?: string;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (createdPost?.id) {
            put(`/admin/posts/${createdPost.id}`, {
                preserveScroll: true,
            });
        } else {
            post('/admin/posts');
        }
    };

    const fetchPrompts = async (postId: number) => {
        setLoadingPrompts(true);
        try {
            const response = await axios.get(`/admin/posts/${postId}/prompts`);
            const promptsData = response.data.prompts || [];
            setPrompts(promptsData);
            
            // Check if there are any active prompts
            const activePromptsExist = promptsData.some((p: PromptData) => p.status === 'active');
            setHasActivePrompts(activePromptsExist);
            
            // Set default prompt tab based on active prompts
            if (activePromptsExist) {
                setActivePromptTab('prompt-active');
            } else {
                setActivePromptTab('propmts-suggested');
            }
        } catch (error) {
            console.error('Error fetching prompts:', error);
        } finally {
            setLoadingPrompts(false);
        }
    };

    const handleAgencyChange = (agencyId: string) => {
        setSelectedAgency(agencyId);
        setData('brand_id', ''); // Clear brand selection when agency changes
        
        if (agencyId && agencyId !== 'all') {
            setFilteredBrands(brands.filter(brand => brand.agency_id.toString() === agencyId));
        } else {
            setFilteredBrands(brands);
        }
    };

    const handleUrlChange = (url: string) => {
        // Auto-add https:// if user starts typing without protocol
        let processedUrl = url.trim();
        if (processedUrl && !processedUrl.match(/^https?:\/\//i)) {
            // Check if user is typing a domain-like string (contains a dot or starts with www)
            if (processedUrl.includes('.') || processedUrl.toLowerCase().startsWith('www')) {
                processedUrl = 'https://' + processedUrl;
            }
        }
        
        setData('url', processedUrl);
    };

    const selectedBrand = brands.find(brand => brand.id.toString() === data.brand_id);
    const selectedBrandAgency = selectedBrand ? agencies.find(agency => agency.id === selectedBrand.agency_id) : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Create Post" />

            <div className="space-y-6">
                <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
                    <TabsList className='add-prompt-lists border inline-flex mb-3'>
                        <Link href="/admin/posts" className='post-bsck-btn flex items-center'>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Posts
                        </Link>
                        <TabsTrigger value="create-post">{createdPost ? 'Edit Post' : 'Create Post'}</TabsTrigger>
                        <TabsTrigger value="propmts" disabled={!createdPostId}>Propmts</TabsTrigger>
                    </TabsList>
                    <TabsContent value="create-post">
                        <div className="grid gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5" />
                                            {createdPost ? 'Edit Post Details' : 'Post Details'}
                                        </CardTitle>
                                        {createdPost && (
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Edit post details and manage prompts in the Prompts tab.
                                            </p>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label>Agency</Label>
                                                    <Select value={selectedAgency} onValueChange={handleAgencyChange}>
                                                        <SelectTrigger className='form-control'>
                                                            <SelectValue placeholder="Select agency (optional)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">All agencies</SelectItem>
                                                            {agencies.map((agency) => (
                                                                <SelectItem key={agency.id} value={agency.id.toString()}>
                                                                    {agency.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="brand_id">Brand *</Label>
                                                    <Select value={data.brand_id} onValueChange={(value) => setData('brand_id', value)}>
                                                        <SelectTrigger className='form-control'>
                                                            <SelectValue placeholder="Select brand" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {filteredBrands.map((brand) => (
                                                                <SelectItem key={brand.id} value={brand.id.toString()}>
                                                                    <div className="flex items-center gap-2">
                                                                        <span>{brand.name}</span>
                                                                        {!brand.can_create_posts && (
                                                                            <Badge variant="destructive" className="text-xs">
                                                                                Restricted
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.brand_id && (
                                                        <p className="text-sm text-red-500">{errors.brand_id}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="url">URL *</Label>
                                                <Input
                                                    id="url"
                                                    type="url"
                                                    value={data.url}
                                                    onChange={(e) => handleUrlChange(e.target.value)}
                                                    placeholder="https://example.com/post"
                                                    className={errors.url ? 'border-red-500 form-control' : 'form-control'}
                                                />
                                                {errors.url && (
                                                    <p className="text-sm text-red-500">{errors.url}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="post_type">Post Type *</Label>
                                                <Select value={data.post_type} onValueChange={(value) => setData('post_type', value)}>
                                                    <SelectTrigger className='form-control'>
                                                        <SelectValue placeholder="Select post type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="blog">Blog</SelectItem>
                                                        <SelectItem value="forum">Forum</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {errors.post_type && (
                                                    <p className="text-sm text-red-500">{errors.post_type}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="title">Title (optional)</Label>
                                                <Input
                                                    id="title"
                                                    type="text"
                                                    value={data.title}
                                                    onChange={(e) => setData('title', e.target.value)}
                                                    placeholder="Post title"
                                                    className={errors.title ? 'border-red-500 form-control' : 'form-control'}
                                                />
                                                {errors.title && (
                                                    <p className="text-sm text-red-500">{errors.title}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="description">Description (optional)</Label>
                                                <Textarea
                                                    id="description"
                                                    value={data.description}
                                                    onChange={(e) => setData('description', e.target.value)}
                                                    placeholder="Brief description of the post content"
                                                    rows={4}
                                                    className={errors.description ? 'border-red-500 form-control' : 'form-control'}
                                                />
                                                {errors.description && (
                                                    <p className="text-sm text-red-500">{errors.description}</p>
                                                )}
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="status">Status</Label>
                                                    <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                                        <SelectTrigger className='form-control'>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="draft">Draft</SelectItem>
                                                            <SelectItem value="published">Published</SelectItem>
                                                            <SelectItem value="archived">Archived</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="posted_at">Posted Date</Label>
                                                    <Input
                                                        id="posted_at"
                                                        type="date"
                                                        value={data.posted_at}
                                                        onChange={(e) => setData('posted_at', e.target.value)}
                                                        className='form-control'
                                                    />
                                                </div>
                                            </div>

                                            {formErrors.permission && (
                                                <Alert variant="destructive">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription>{formErrors.permission}</AlertDescription>
                                                </Alert>
                                            )}

                                            {formErrors.limit && (
                                                <Alert variant="destructive">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription>{formErrors.limit}</AlertDescription>
                                                </Alert>
                                            )}

                                            <div className="flex gap-2 pt-4">
                                                <Button type="submit" disabled={processing} className='primary-btn'>
                                                    <Save/> {processing ? (createdPost ? 'Updating...' : 'Creating...') : (createdPost ? 'Update Post' : 'Create Post')}
                                                </Button>
                                                <Link href="/admin/posts">
                                                    <Button type="button" variant="outline" className='cancle-btn primary-btn border-0'>
                                                       <X/> Cancel
                                                    </Button>
                                                </Link>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="space-y-6">
                                {selectedBrand && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-sm">
                                                <Building2 className="h-4 w-4" />
                                                Selected Brand
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="font-medium">{selectedBrand.name}</p>
                                                {selectedBrandAgency && (
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {selectedBrandAgency.name}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span>Post Creation:</span>
                                                    <Badge variant={selectedBrand.can_create_posts ? "default" : "destructive"}>
                                                        {selectedBrand.can_create_posts ? "Allowed" : "Restricted"}
                                                    </Badge>
                                                </div>
                                                
                                                {selectedBrand.monthly_posts && (
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span>Monthly Limit:</span>
                                                        <span>{selectedBrand.monthly_posts} posts</span>
                                                    </div>
                                                )}
                                                
                                                {selectedBrand.post_creation_note && (
                                                    <div className="p-2 bg-muted rounded-md">
                                                        <p className="text-xs text-muted-foreground">
                                                            {selectedBrand.post_creation_note}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">How it works</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                                        <div className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                                            <p>Select an agency to filter brands, or choose from all brands</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                                            <p>Brand post creation permissions and limits are checked</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                                            <p>AI prompts will be generated automatically in the background</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="propmts">
                        <Card>
                            <CardContent>
                                {loadingPrompts ? (
                                    <PromptGenerationLoader />
                                ) : prompts.length === 0 ? (
                                    <div className="py-12 text-center space-y-4">
                                        <p className="text-muted-foreground">No prompts generated yet</p>
                                        {(!createdPost?.description && !data.description) && (
                                            <div className="max-w-md mx-auto p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <p className="text-sm text-blue-800">
                                                    <strong>Tip:</strong> Add a description to the post in the "Create Post" tab to automatically generate AI prompts.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                <Tabs value={activePromptTab} onValueChange={setActivePromptTab}>
                                    <TabsList className='add-prompt-lists border inline-flex mb-3'>
                                        <TabsTrigger value="prompt-active">Active</TabsTrigger>
                                        <TabsTrigger value="propmts-suggested">Suggested</TabsTrigger>
                                        <TabsTrigger value="propmts-rejected-posts">Inactive</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="prompt-active">
                                        <Table className='default-table'>
                                            <TableHeader>
                                                <TableRow>
                                                <TableHead className="w-10"><Checkbox onCheckedChange={(checked) => {
                                                    const activePrompts = prompts.filter(p => p.status === 'active');
                                                    if (checked) {
                                                        setSelectedPrompts(activePrompts.map(p => p.id));
                                                    } else {
                                                        setSelectedPrompts([]);
                                                    }
                                                }}/></TableHead>
                                                <TableHead>Prompt</TableHead>
                                                <TableHead>Visibility</TableHead>
                                                <TableHead>Sentiment</TableHead>
                                                <TableHead>Position</TableHead>
                                                <TableHead>Location</TableHead>
                                                <TableHead>Volume</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {prompts.filter(p => p.status === 'active').length > 0 ? (
                                                    prompts.filter(p => p.status === 'active').map((row) => (
                                                        <TableRow key={row.id}>
                                                            <TableCell>
                                                                <Checkbox 
                                                                    checked={selectedPrompts.includes(row.id)}
                                                                    onCheckedChange={(checked) => handleSelectPrompt(row.id, !!checked)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="max-w-md">
                                                                {row.prompt_text}
                                                            </TableCell>
                                                            <TableCell>{row.visibility || 'N/A'}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                                                    ● {row.sentiment || 0}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell># {row.position || 'N/A'}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm">{row.location || 'N/A'}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex gap-1">
                                                                    {Array.from({ length: 4 }).map((_, i) => (
                                                                    <span
                                                                        key={i}
                                                                        className={`h-3 w-1 rounded ${
                                                                        row.volume === "high"
                                                                            ? "bg-green-500"
                                                                            : row.volume === "medium"
                                                                            ? "bg-yellow-500"
                                                                            : "bg-red-500"
                                                                        }`}
                                                                    />
                                                                    ))}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                            No active prompts found
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TabsContent>
                                    <TabsContent value="propmts-suggested">
                                        <Table className='default-table'>
                                            <TableHeader>
                                                <TableRow>
                                                <TableHead className="w-10"><Checkbox onCheckedChange={(checked) => {
                                                    const suggestedPrompts = prompts.filter(p => p.status === 'suggested');
                                                    if (checked) {
                                                        setSelectedPrompts(suggestedPrompts.map(p => p.id));
                                                    } else {
                                                        setSelectedPrompts([]);
                                                    }
                                                }}/></TableHead>
                                                <TableHead>Prompt</TableHead>
                                                <TableHead>Location</TableHead>
                                                <TableHead>Created</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {prompts.filter(p => p.status === 'suggested').length > 0 ? (
                                                    prompts.filter(p => p.status === 'suggested').map((row) => (
                                                        <TableRow key={row.id}>
                                                            <TableCell>
                                                                <Checkbox 
                                                                    checked={selectedPrompts.includes(row.id)}
                                                                    onCheckedChange={(checked) => handleSelectPrompt(row.id, !!checked)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="max-w-md">
                                                                {row.prompt_text}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm">{row.location || 'N/A'}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                            No suggested prompts found
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TabsContent>
                                    <TabsContent value="propmts-rejected-posts">
                                        <Table className='default-table'>
                                            <TableHeader>
                                                <TableRow>
                                                <TableHead className="w-10"><Checkbox onCheckedChange={(checked) => {
                                                    const inactivePrompts = prompts.filter(p => p.status === 'inactive');
                                                    if (checked) {
                                                        setSelectedPrompts(inactivePrompts.map(p => p.id));
                                                    } else {
                                                        setSelectedPrompts([]);
                                                    }
                                                }}/></TableHead>
                                                <TableHead>Prompt</TableHead>
                                                <TableHead>Location</TableHead>
                                                <TableHead>Created</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {prompts.filter(p => p.status === 'inactive').length > 0 ? (
                                                    prompts.filter(p => p.status === 'inactive').map((row) => (
                                                        <TableRow key={row.id}>
                                                            <TableCell>
                                                                <Checkbox 
                                                                    checked={selectedPrompts.includes(row.id)}
                                                                    onCheckedChange={(checked) => handleSelectPrompt(row.id, !!checked)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="max-w-md">
                                                                {row.prompt_text}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm">{row.location || 'N/A'}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                            No rejected prompts found
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TabsContent>
                                </Tabs>
                                )}
                                
                                {/* Prompts Action Bar */}
                                {prompts.length > 0 && (
                                    <div className={`prompts-action ${selectedPrompts.length > 0 ? "active" : ""}`}>
                                        <p>{selectedPrompts.length > 0
                                        ? `${selectedPrompts.length} Selected`
                                        : "0 Select"}</p>
                                        <div className="prompts-action-btns">
                                            {activePromptTab !== 'prompt-active' && (
                                                <button 
                                                    type="button"
                                                    onClick={handleBulkActivate}
                                                    disabled={isUpdatingPrompts || selectedPrompts.length === 0}
                                                    className="active-ch"
                                                >
                                                    <CircleCheckBig/> {activePromptTab === 'propmts-suggested' ? 'Activate' : 'Active'}
                                                </button>
                                            )}
                                            {activePromptTab === 'prompt-active' && (
                                                <button 
                                                    type="button"
                                                    onClick={handleBulkReject}
                                                    disabled={isUpdatingPrompts || selectedPrompts.length === 0}
                                                    className="delete-ch"
                                                >
                                                    <Power/> Inactive
                                                </button>
                                            )}
                                            <button 
                                                type="button"
                                                onClick={handleBulkDelete}
                                                disabled={isUpdatingPrompts || selectedPrompts.length === 0}
                                                className="delete-ch"
                                            >
                                                <Power/> Reject
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
