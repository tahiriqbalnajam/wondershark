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
import { Switch } from '@/components/ui/switch';
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
    Building2, 
    Save,
    Bot
} from 'lucide-react';

type AIModel = {
    id: number;
    name: string;
    display_name: string;
    is_enabled: boolean;
    provider: string;
};

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
    aiModels?: AIModel[];
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

export default function BrandEdit({ brand, aiModels = [] }: Props) {
    const [enabledModels, setEnabledModels] = useState<Record<number, boolean>>(
        aiModels.reduce((acc, model) => ({ ...acc, [model.id]: model.is_enabled }), {})
    );

    const { data, setData, put, processing, errors } = useForm<BrandForm>({
        name: brand.name,
        website: brand.website || '',
        description: brand.description,
        monthly_posts: brand.monthly_posts,
        status: brand.status,
        prompts: brand.prompts.map(p => p.prompt),
        subreddits: brand.subreddits.map(s => s.subreddit_name),
    });

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

                    {/* AI Models */}
                    {aiModels && aiModels.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bot className="h-5 w-5" />
                                    AI Models
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        View active AI models. Contact administrator to enable/disable models.
                                    </p>
                                    {aiModels.map((model) => (
                                        <div
                                            key={model.id}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{model.display_name}</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        Provider: {model.provider}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={model.is_enabled ? 'default' : 'secondary'}>
                                                    {model.is_enabled ? 'Active' : 'Inactive'}
                                                </Badge>
                                                <Switch
                                                    checked={enabledModels[model.id] ?? model.is_enabled}
                                                    onCheckedChange={(checked: boolean) => {
                                                        setEnabledModels(prev => ({ ...prev, [model.id]: checked }));
                                                    }}
                                                    disabled={true}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

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
