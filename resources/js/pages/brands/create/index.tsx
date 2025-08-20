import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState, FormEventHandler } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { 
    Building2, 
    FileText, 
    MessageSquare, 
    Users, 
    CheckCircle,
    Calendar
} from 'lucide-react';

// Import step components
import Step1BasicInfo from './step1-basic-info';
import Step2Prompts from './step2-prompts';
import Step3Subreddits from './step3-subreddits';
import Step4MonthlyPosts from './step4-monthly-posts';
import Step5Review from './step5-review';
import Step6AccountSetup from './step6-account-setup';
import StepNavigation from './step-navigation';

// Import types
import { BrandForm, GeneratedPrompt, AiModel } from './types';

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

const steps = [
    { id: 1, title: 'Basic Info', icon: Building2 },
    { id: 2, title: 'Prompts', icon: MessageSquare },
    { id: 3, title: 'Subreddits', icon: Users },
    { id: 4, title: 'Monthly Posts', icon: Calendar },
    { id: 5, title: 'Review', icon: CheckCircle },
    { id: 6, title: 'Account Setup', icon: FileText },
];

type Props = {
    existingBrand?: {
        id?: number;
        name?: string;
        website?: string;
        description?: string;
        monthly_posts?: number;
    };
    generatedPrompts?: GeneratedPrompt[];
    aiModels?: AiModel[];
};

export default function CreateBrand({ existingBrand, generatedPrompts = [], aiModels = [] }: Props) {
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
        ai_providers: aiModels.filter(model => model.is_enabled).map(model => model.name),
    });

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

    const handleManualPromptAdd = (prompt: string) => {
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

        setIsGeneratingPrompts(true);
        
        try {
            const response = await fetch(route('brands.generateMultiModelPrompts'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    website: data.website,
                    description: data.description,
                }),
            });

            const result = await response.json();

            if (result.success && result.prompts.length > 0) {
                setAiGeneratedPrompts(result.prompts);
            } else {
                alert(result.message || 'Failed to generate prompts from AI models');
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

    const canProceed = (): boolean => {
        switch (currentStep) {
            case 1:
                return !!(data.name.trim() && data.description.trim());
            case 2:
                return data.prompts.length > 0;
            case 3:
                return data.subreddits.length > 0;
            case 4:
                return data.monthly_posts > 0;
            case 5:
                return true; // Review step
            case 6:
                return !data.create_account || !!(data.brand_email.trim() && data.brand_password.trim());
            default:
                return true;
        }
    };

    const renderStep = () => {
        const stepProps = {
            data,
            setData,
            errors,
            nextStep,
            prevStep,
            currentStep,
            totalSteps: steps.length,
        };

        switch (currentStep) {
            case 1:
                return <Step1BasicInfo {...stepProps} />;
            case 2:
                return <Step2Prompts 
                    {...stepProps}
                    isGeneratingPrompts={isGeneratingPrompts}
                    aiGeneratedPrompts={aiGeneratedPrompts}
                    generateAIPrompts={generateAIPrompts}
                    acceptPrompt={acceptPrompt}
                    rejectPrompt={rejectPrompt}
                    removeAcceptedPrompt={removeAcceptedPrompt}
                    isPromptAccepted={isPromptAccepted}
                    isPromptRejected={isPromptRejected}
                    handleManualPromptAdd={handleManualPromptAdd}
                    removePrompt={removePrompt}
                    aiModels={aiModels}
                />;
            case 3:
                return <Step3Subreddits
                    {...stepProps}
                    newSubreddit={newSubreddit}
                    setNewSubreddit={setNewSubreddit}
                    addSubreddit={addSubreddit}
                    removeSubreddit={removeSubreddit}
                />;
            case 4:
                return <Step4MonthlyPosts {...stepProps} />;
            case 5:
                return <Step5Review {...stepProps} />;
            case 6:
                return <Step6AccountSetup {...stepProps} />;
            default:
                return null;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Brand" />

            <div className="p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <HeadingSmall title="Create New Brand" />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Brand Setup Wizard</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <StepNavigation
                                    currentStep={currentStep}
                                    totalSteps={steps.length}
                                    canProceed={canProceed()}
                                    processing={processing}
                                    onNext={nextStep}
                                    onPrev={prevStep}
                                    onSubmit={() => post(route('brands.store'))}
                                    steps={steps}
                                />

                                <div className="min-h-[400px]">
                                    {renderStep()}
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
