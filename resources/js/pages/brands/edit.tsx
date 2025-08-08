import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState, FormEventHandler } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { 
    Plus, 
    ArrowLeft, 
    Building2, 
    MessageSquare, 
    Users, 
    Edit,
    Trash2,
    Save
} from 'lucide-react';

type Brand = {
    id: number;
    name: string;
    website?: string;
    description: string;
    monthly_posts: number;
    status: 'active' | 'inactive' | 'pending';
    prompts: Array<{ id: number; prompt: string; order: number; is_active: boolean }>;
    subreddits: Array<{ id: number; subreddit_name: string; description?: string; status: string }>;
};

type Props = {
    brand: Brand;
};

type BrandForm = {
    name: string;
    website: string;
    description: string;
    monthly_posts: number;
    status: 'active' | 'inactive' | 'pending';
    prompts: string[];
    subreddits: string[];
};

const breadcrumbs = (brand: Brand): BreadcrumbItem[] => [
    {
        title: 'Brands',
        href: '/brands',
    },
    {
        title: brand.name,
        href: `/brands/${brand.id}`,
    },
    {
        title: 'Edit',
        href: `/brands/${brand.id}/edit`,
    },
];

export default function BrandEdit({ brand }: Props) {
    const [newPrompt, setNewPrompt] = useState('');
    const [newSubreddit, setNewSubreddit] = useState('');

    const { data, setData, put, processing, errors } = useForm<BrandForm>({
        name: brand.name,
        website: brand.website || '',
        description: brand.description,
        monthly_posts: brand.monthly_posts,
        status: brand.status,
        prompts: brand.prompts.map(p => p.prompt),
        subreddits: brand.subreddits.map(s => s.subreddit_name),
    });

    const addPrompt = () => {
        if (newPrompt.trim() && data.prompts.length < 25) {
            setData('prompts', [...data.prompts, newPrompt.trim()]);
            setNewPrompt('');
        }
    };

    const removePrompt = (index: number) => {
        setData('prompts', data.prompts.filter((_, i) => i !== index));
    };

    const editPrompt = (index: number, newValue: string) => {
        const updatedPrompts = [...data.prompts];
        updatedPrompts[index] = newValue;
        setData('prompts', updatedPrompts);
    };

    const addSubreddit = () => {
        if (newSubreddit.trim() && data.subreddits.length < 20) {
            const subredditName = newSubreddit.trim().replace(/^r\//, '');
            setData('subreddits', [...data.subreddits, subredditName]);
            setNewSubreddit('');
        }
    };

    const removeSubreddit = (index: number) => {
        setData('subreddits', data.subreddits.filter((_, i) => i !== index));
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('brands.update', brand.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs(brand)}>
            <Head title={`Edit ${brand.name}`} />

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" asChild>
                            <a href={`/brands/${brand.id}`}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Details
                            </a>
                        </Button>
                        <HeadingSmall 
                            title={`Edit ${brand.name}`}
                            description="Update brand information and content strategy" 
                        />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Basic Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Brand Name *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Enter your brand name"
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="website">Website</Label>
                                <Input
                                    id="website"
                                    type="url"
                                    value={data.website}
                                    onChange={(e) => setData('website', e.target.value)}
                                    placeholder="https://example.com"
                                />
                                <InputError message={errors.website} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Put description of the important aspects that you would like to promote in AI search."
                                    rows={4}
                                    className="resize-none"
                                    required
                                />
                                <InputError message={errors.description} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="monthly_posts">Monthly Posts Target</Label>
                                <Input
                                    id="monthly_posts"
                                    type="number"
                                    min="1"
                                    max="1000"
                                    value={data.monthly_posts}
                                    onChange={(e) => setData('monthly_posts', parseInt(e.target.value) || 0)}
                                />
                                <InputError message={errors.monthly_posts} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="status">Brand Status</Label>
                                <Select value={data.status} onValueChange={(value: 'active' | 'inactive' | 'pending') => setData('status', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                Active
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="pending">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                Pending
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                Inactive
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.status} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Content Prompts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Content Prompts ({data.prompts.length}/25)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Textarea
                                    value={newPrompt}
                                    onChange={(e) => setNewPrompt(e.target.value)}
                                    placeholder="Enter a new content prompt..."
                                    rows={2}
                                    className="resize-none"
                                />
                                <Button
                                    type="button"
                                    onClick={addPrompt}
                                    disabled={!newPrompt.trim() || data.prompts.length >= 25}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            {data.prompts.length > 0 && (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {data.prompts.map((prompt, index) => (
                                        <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                                            <div className="flex-1">
                                                <Badge variant="outline" className="mb-2">
                                                    Prompt {index + 1}
                                                </Badge>
                                                <p className="text-sm">{prompt}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const newValue = window.prompt('Edit prompt:', prompt);
                                                        if (newValue) editPrompt(index, newValue);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removePrompt(index)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <InputError message={errors.prompts} />
                        </CardContent>
                    </Card>

                    {/* Target Subreddits */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Target Subreddits ({data.subreddits.length}/20)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    value={newSubreddit}
                                    onChange={(e) => setNewSubreddit(e.target.value)}
                                    placeholder="e.g., technology, marketing, startups"
                                />
                                <Button
                                    type="button"
                                    onClick={addSubreddit}
                                    disabled={!newSubreddit.trim() || data.subreddits.length >= 20}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            {data.subreddits.length > 0 && (
                                <div className="grid gap-2 max-h-64 overflow-y-auto">
                                    {data.subreddits.map((subreddit, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">r/{subreddit}</Badge>
                                                <span className="text-sm text-green-600">Approved</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeSubreddit(index)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <InputError message={errors.subreddits} />
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" asChild>
                            <a href={`/brands/${brand.id}`}>Cancel</a>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
