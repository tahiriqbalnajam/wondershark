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
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import { 
    Plus, 
    ArrowLeft, 
    ArrowRight, 
    Building2, 
    FileText, 
    MessageSquare, 
    Users, 
    CheckCircle,
    Edit,
    Trash2,
    Calendar
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
};

const steps = [
    { id: 1, title: 'Basic Info', icon: Building2 },
    { id: 2, title: 'Prompts', icon: MessageSquare },
    { id: 3, title: 'Subreddits', icon: Users },
    { id: 4, title: 'Monthly Posts', icon: Calendar },
    { id: 5, title: 'Review', icon: CheckCircle },
    { id: 6, title: 'Account Setup', icon: FileText },
];

export default function CreateBrand() {
    const [currentStep, setCurrentStep] = useState(1);
    const [newPrompt, setNewPrompt] = useState('');
    const [newSubreddit, setNewSubreddit] = useState('');

    const { data, setData, post, processing, errors } = useForm<BrandForm>({
        name: '',
        website: '',
        description: '',
        prompts: [],
        subreddits: [],
        monthly_posts: 10,
        brand_email: '',
        brand_password: '',
    });

    const progress = (currentStep / steps.length) * 100;

    const nextStep = () => {
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

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
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Content Prompts ({data.prompts.length}/25)</h3>
                            <Button
                                type="button"
                                onClick={addPrompt}
                                disabled={!newPrompt.trim() || data.prompts.length >= 25}
                                size="sm"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Prompt
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="new-prompt">Add New Prompt</Label>
                                <div className="flex gap-2">
                                    <Textarea
                                        id="new-prompt"
                                        value={newPrompt}
                                        onChange={(e) => setNewPrompt(e.target.value)}
                                        placeholder="Enter a content prompt for AI generation..."
                                        rows={2}
                                        className="resize-none"
                                    />
                                </div>
                            </div>

                            {data.prompts.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium">Current Prompts</h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {data.prompts.map((prompt, index) => (
                                            <Card key={index} className="p-3">
                                                <div className="flex items-start justify-between gap-3">
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
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <InputError message={errors.prompts} />
                        </div>
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
                        <h3 className="text-lg font-semibold">Create Brand Account</h3>
                        <p className="text-muted-foreground">
                            Create a login account for this brand so they can access their dashboard.
                        </p>
                        
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="brand_email">Brand Email *</Label>
                                <Input
                                    id="brand_email"
                                    type="email"
                                    value={data.brand_email}
                                    onChange={(e) => setData('brand_email', e.target.value)}
                                    placeholder="brand@example.com"
                                    required
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
                                    required
                                />
                                <InputError message={errors.brand_password} />
                            </div>
                        </div>
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
                return data.brand_email.trim() && data.brand_password.trim();
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
