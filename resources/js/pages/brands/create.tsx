import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, FormEventHandler, useEffect } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { AddPromptDialog } from '@/components/brand/add-prompt-dialog';
import { 
    Plus, 
    ArrowLeft, 
    ArrowRight, 
    Building2, 
    FileText, 
    MessageSquare, 
    Users, 
    CheckCircle,
    Trash2,
    Calendar,
    Sparkles,
    Loader2,
    RefreshCw
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Brands',
        href: '/brands',
    },
    {
        title: 'Create Brand',
        href: '/brands/create',
    },
];

type BrandForm = {
    name: string;
    website: string;
    description: string;
    prompts: string[];
    subreddits: string[];
    monthly_posts: number;
    brand_email: string;
    brand_password: string;
    create_account: boolean;
    ai_providers: string[];
};

type GeneratedPrompt = {
    id: number;
    prompt: string;
    source: string;
    ai_provider: string;
    is_selected: boolean;
    order: number;
};

type Props = {
    existingBrand?: any;
    generatedPrompts?: GeneratedPrompt[];
};

const steps = [
    { id: 1, title: 'Basic Info', icon: Building2 },
    { id: 2, title: 'Prompts', icon: MessageSquare },
    { id: 3, title: 'Subreddits', icon: Users },
    { id: 4, title: 'Monthly Posts', icon: Calendar },
    { id: 5, title: 'Review', icon: CheckCircle },
    { id: 6, title: 'Account Setup', icon: FileText },
];

export default function CreateBrand({ existingBrand, generatedPrompts = [] }: Props) {
    const [currentStep, setCurrentStep] = useState(1);
    const [newSubreddit, setNewSubreddit] = useState('');
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    const [aiGeneratedPrompts, setAiGeneratedPrompts] = useState<GeneratedPrompt[]>(generatedPrompts);
    const [hasGeneratedForCurrentWebsite, setHasGeneratedForCurrentWebsite] = useState(false);

    const { data, setData, post, processing, errors } = useForm<BrandForm>({
        name: existingBrand?.name || '',
        website: existingBrand?.website || '',
        description: existingBrand?.description || '',
        prompts: [],
        subreddits: [],
        monthly_posts: existingBrand?.monthly_posts || 10,
        brand_email: '',
        brand_password: '',
        create_account: true,
        ai_providers: ['openai'],
    });

    const progress = (currentStep / steps.length) * 100;

    const nextStep = () => {
        if (currentStep < steps.length) {
            const newStep = currentStep + 1;
            setCurrentStep(newStep);
            
            // Auto-generate prompts when entering step 2
            if (newStep === 2 && !hasGeneratedForCurrentWebsite && data.website.trim() && data.description.trim()) {
                generateAIPrompts();
                setHasGeneratedForCurrentWebsite(true);
            }
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const removePrompt = (index: number) => {
        setData('prompts', data.prompts.filter((_, i) => i !== index));
    };

    const handleManualPromptAdd = (prompt: string, countryCode: string) => {
        if (data.prompts.length < 25 && !data.prompts.includes(prompt)) {
            setData('prompts', [...data.prompts, prompt]);
        }
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

    const generateAIPrompts = async () => {
        if (!data.website.trim() || !data.description.trim()) {
            alert('Please enter website and description first in step 1.');
            return;
        }

        if (data.ai_providers.length === 0) {
            alert('Please select at least one AI provider.');
            return;
        }

        setIsGeneratingPrompts(true);
        
        try {
            // Generate prompts from multiple providers sequentially
            const allPrompts: GeneratedPrompt[] = [];
            
            for (const provider of data.ai_providers) {
                const response = await fetch(route('brands.generatePrompts'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({
                        website: data.website,
                        description: data.description,
                        ai_provider: provider,
                    }),
                });

                const result = await response.json();

                if (result.success) {
                    allPrompts.push(...result.prompts);
                }
            }
            
            if (allPrompts.length > 0) {
                setAiGeneratedPrompts(allPrompts);
            } else {
                alert('Failed to generate prompts from any provider');
            }
        } catch (error) {
            console.error('Error generating prompts:', error);
            alert('Failed to generate prompts. Please try again.');
        } finally {
            setIsGeneratingPrompts(false);
        }
    };

    const acceptPrompt = (prompt: GeneratedPrompt) => {
        if (data.prompts.length < 25 && !data.prompts.includes(prompt.prompt)) {
            setData('prompts', [...data.prompts, prompt.prompt]);
            setAiGeneratedPrompts(prev => 
                prev.map(p => 
                    p.id === prompt.id 
                        ? { ...p, is_selected: true }
                        : p
                )
            );
        }
    };

    const rejectPrompt = (prompt: GeneratedPrompt) => {
        setAiGeneratedPrompts(prev => 
            prev.map(p => 
                p.id === prompt.id 
                    ? { ...p, is_selected: false }
                    : p
            )
        );
    };

    const removeAcceptedPrompt = (promptText: string, promptId: number) => {
        setData('prompts', data.prompts.filter(p => p !== promptText));
        setAiGeneratedPrompts(prev => 
            prev.map(p => 
                p.id === promptId 
                    ? { ...p, is_selected: false }
                    : p
            )
        );
    };

    const isPromptAccepted = (prompt: GeneratedPrompt) => {
        return data.prompts.includes(prompt.prompt);
    };

    const isPromptRejected = (prompt: GeneratedPrompt) => {
        return !prompt.is_selected && !isPromptAccepted(prompt);
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('brands.store'));
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Basic Brand Information</h3>
                            <div className="space-y-4">
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
                                    <p className="text-sm text-muted-foreground">
                                        Put description of the important aspects that you would like to promote in AI search.
                                    </p>
                                    <InputError message={errors.description} />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6 relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Add Manual Prompt Button - positioned before Content Prompts */}
                                <AddPromptDialog 
                                    brandId={existingBrand?.id} 
                                    className="shadow-sm"
                                    onPromptAdd={handleManualPromptAdd}
                                />
                                <h3 className="text-lg font-semibold">Content Prompts ({data.prompts.length}/25)</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {isGeneratingPrompts && (
                                    <div className="flex items-center gap-2 text-primary">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">Generating AI prompts...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Provider Selection */}
                        <div className="grid gap-4">
                            <div>
                                <Label>AI Providers (Select one or more)</Label>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Choose multiple AI providers to generate more diverse prompts
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'openai', label: 'OpenAI (GPT-4)' },
                                    { value: 'claude', label: 'Claude (Anthropic)' },
                                    { value: 'gemini', label: 'Google Gemini' },
                                    { value: 'groq', label: 'Groq' },
                                    { value: 'deepseek', label: 'DeepSeek' }
                                ].map((provider) => (
                                    <div key={provider.value} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={provider.value}
                                            checked={data.ai_providers.includes(provider.value)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setData('ai_providers', [...data.ai_providers, provider.value]);
                                                } else {
                                                    setData('ai_providers', data.ai_providers.filter(p => p !== provider.value));
                                                }
                                            }}
                                        />
                                        <Label 
                                            htmlFor={provider.value} 
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            {provider.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Generate AI Prompts Button */}
                        <div className="flex justify-center">
                            <Button
                                type="button"
                                onClick={generateAIPrompts}
                                disabled={isGeneratingPrompts || data.ai_providers.length === 0}
                                size="lg"
                                className="w-full max-w-md"
                            >
                                {isGeneratingPrompts ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating prompts from {data.ai_providers.length} provider(s)...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Generate AI Prompts ({data.ai_providers.length} provider{data.ai_providers.length !== 1 ? 's' : ''})
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* AI Generated Prompts */}
                        {aiGeneratedPrompts.length > 0 ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Sparkles className="h-5 w-5" />
                                        AI Generated Prompts (Review and Select)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {aiGeneratedPrompts.map((prompt) => {
                                            const accepted = isPromptAccepted(prompt);
                                            const rejected = isPromptRejected(prompt);
                                            
                                            return (
                                                <div 
                                                    key={prompt.id} 
                                                    className={`p-4 border rounded-lg transition-all ${
                                                        accepted ? 'border-green-200 bg-green-50' :
                                                        rejected ? 'border-gray-200 bg-gray-50 opacity-60' :
                                                        'border-gray-200 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-1">
                                                            <p className={`text-sm ${rejected ? 'text-gray-500' : 'text-gray-900'}`}>
                                                                {prompt.prompt}
                                                            </p>
                                                            <Badge variant="outline" className="mt-2">
                                                                {prompt.ai_provider}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {accepted ? (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="default"
                                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                                    disabled
                                                                >
                                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                                    Accepted
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="border-green-500 text-green-600 hover:bg-green-50"
                                                                    onClick={() => acceptPrompt(prompt)}
                                                                    disabled={data.prompts.length >= 25}
                                                                >
                                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                                    Accept
                                                                </Button>
                                                            )}
                                                            
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className={rejected ? "border-gray-400 text-gray-600" : "border-red-500 text-red-600 hover:bg-red-50"}
                                                                onClick={() => rejected ? acceptPrompt(prompt) : rejectPrompt(prompt)}
                                                            >
                                                                {rejected ? (
                                                                    <>
                                                                        <RefreshCw className="h-4 w-4 mr-1" />
                                                                        Restore
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                                        Reject
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>AI prompts will be generated automatically when you complete step 1.</p>
                                        <p className="text-sm mt-2">Make sure to fill in your website and description first.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Current Selected Prompts */}
                        {data.prompts.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5" />
                                        Selected Prompts ({data.prompts.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {data.prompts.map((prompt, index) => {
                                            const aiPrompt = aiGeneratedPrompts.find(p => p.prompt === prompt);
                                            return (
                                                <div key={index} className="flex items-start justify-between gap-3 p-3 border rounded-lg bg-green-50 border-green-200">
                                                    <div className="flex-1">
                                                        <Badge variant="outline" className="mb-2 border-green-600 text-green-700">
                                                            Selected #{index + 1}
                                                        </Badge>
                                                        <p className="text-sm">{prompt}</p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => aiPrompt ? removeAcceptedPrompt(prompt, aiPrompt.id) : removePrompt(index)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <InputError message={errors.prompts} />
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Target Subreddits ({data.subreddits.length}/20)</h3>
                            <Button
                                type="button"
                                onClick={addSubreddit}
                                disabled={!newSubreddit.trim() || data.subreddits.length >= 20}
                                size="sm"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Subreddit
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="new-subreddit">Add New Subreddit</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="new-subreddit"
                                        value={newSubreddit}
                                        onChange={(e) => setNewSubreddit(e.target.value)}
                                        placeholder="e.g., technology, marketing, startups"
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Enter subreddit names without the "r/" prefix
                                </p>
                            </div>

                            {data.subreddits.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium">Selected Subreddits</h4>
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
                                </div>
                            )}
                            <InputError message={errors.subreddits} />
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Monthly Posts Target</h3>
                        <p className="text-muted-foreground">
                            Set how many posts you want to create per month for this brand.
                        </p>
                        
                        <Card>
                            <CardContent className="pt-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="monthly_posts">Number of posts per month</Label>
                                    <Input
                                        id="monthly_posts"
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={data.monthly_posts}
                                        onChange={(e) => setData('monthly_posts', parseInt(e.target.value) || 0)}
                                        placeholder="e.g., 10"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Recommended range: 5-50 posts per month for optimal engagement
                                    </p>
                                    <InputError message={errors.monthly_posts} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 5:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Review Your Brand Setup</h3>
                        
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <Label>Brand Name</Label>
                                        <p className="font-medium">{data.name}</p>
                                    </div>
                                    {data.website && (
                                        <div>
                                            <Label>Website</Label>
                                            <p className="font-medium">{data.website}</p>
                                        </div>
                                    )}
                                    <div>
                                        <Label>Description</Label>
                                        <p className="text-sm text-muted-foreground">{data.description}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5" />
                                        Content Prompts ({data.prompts.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {data.prompts.slice(0, 3).map((prompt, index) => (
                                            <p key={index} className="text-sm p-2 bg-muted rounded">
                                                {prompt.substring(0, 100)}{prompt.length > 100 ? '...' : ''}
                                            </p>
                                        ))}
                                        {data.prompts.length > 3 && (
                                            <p className="text-sm text-muted-foreground">
                                                ... and {data.prompts.length - 3} more prompts
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Target Subreddits ({data.subreddits.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {data.subreddits.map((subreddit, index) => (
                                            <Badge key={index} variant="secondary">
                                                r/{subreddit}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        Monthly Posts Target
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                                        <div className="text-3xl font-bold text-primary">{data.monthly_posts}</div>
                                        <div className="text-sm text-muted-foreground">Posts per Month</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                );

            case 6:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Brand Account Setup</h3>
                        <p className="text-muted-foreground">
                            Optionally create a login account for this brand to access their dashboard.
                        </p>
                        
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="create_account"
                                            checked={data.create_account}
                                            onCheckedChange={(checked) => setData('create_account', checked as boolean)}
                                        />
                                        <Label htmlFor="create_account" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Create a brand account (recommended)
                                        </Label>
                                    </div>
                                    
                                    {data.create_account && (
                                        <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                                            <div className="grid gap-2">
                                                <Label htmlFor="brand_email">Brand Email *</Label>
                                                <Input
                                                    id="brand_email"
                                                    type="email"
                                                    value={data.brand_email}
                                                    onChange={(e) => setData('brand_email', e.target.value)}
                                                    placeholder="brand@example.com"
                                                    required={data.create_account}
                                                />
                                                <InputError message={errors.brand_email} />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="brand_password">Password *</Label>
                                                <Input
                                                    id="brand_password"
                                                    type="password"
                                                    value={data.brand_password}
                                                    onChange={(e) => setData('brand_password', e.target.value)}
                                                    placeholder="Enter a secure password"
                                                    required={data.create_account}
                                                />
                                                <InputError message={errors.brand_password} />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!data.create_account && (
                                        <div className="p-4 bg-muted/50 rounded-lg">
                                            <p className="text-sm text-muted-foreground">
                                                No account will be created. You can add brand users later from the brand management panel.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            default:
                return null;
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return data.name.trim() && data.description.trim();
            case 2:
                return data.prompts.length > 0;
            case 3:
                return data.subreddits.length > 0;
            case 4:
                return data.monthly_posts > 0;
            case 5:
                return true; // Review step - just needs to be viewed
            case 6:
                // Account creation is optional, but if enabled, require email and password
                return !data.create_account || (data.brand_email.trim() && data.brand_password.trim());
            default:
                return false;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Brand" />

            <div className="max-w-4xl mx-auto space-y-8">
                <HeadingSmall 
                    title="Create New Brand" 
                    description="Set up a comprehensive brand profile with content strategy" 
                />

                {/* Progress Steps */}
                <div className="space-y-4">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between">
                        {steps.map((step) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.id;
                            const isCompleted = currentStep > step.id;
                            
                            return (
                                <div key={step.id} className="flex flex-col items-center space-y-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        isCompleted ? 'bg-green-500 text-white' :
                                        isActive ? 'bg-primary text-primary-foreground' :
                                        'bg-muted text-muted-foreground'
                                    }`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <span className={`text-sm font-medium ${
                                        isActive ? 'text-primary' : 'text-muted-foreground'
                                    }`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                <Card>
                    <CardContent className="p-6">
                        {renderStep()}
                    </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>

                    {currentStep === steps.length ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={!canProceed() || processing}
                        >
                            {processing ? 'Creating Brand...' : 'Create Brand'}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={nextStep}
                            disabled={!canProceed()}
                        >
                            Next
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
