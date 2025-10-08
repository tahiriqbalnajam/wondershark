import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState, FormEventHandler, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { 
    MessagesSquare, 
    FileText,
    CalendarDays,
    Swords,
    CheckCircle
} from 'lucide-react';

// Import step components
import Step1BasicInfo from './step1-basic-info';
import Step2Prompts from './step2-prompts';
import Step3Competitors from './step3-competitors';
import Step4MonthlyPosts from './step4-monthly-posts';
import Step5Review from './step5-review';
import Step6AccountSetup from './step6-account-setup';
import StepNavigation from './step-navigation';

// Import types
import { BrandForm, GeneratedPrompt, AiModel, Competitor } from './types';

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
    { id: 1, title: 'Basic Info', icon: FileText },
    { id: 2, title: 'Competitors', icon: Swords },
    { id: 3, title: 'Prompts', icon: MessagesSquare },
    { id: 4, title: 'Monthly Posts', icon: CalendarDays },
    // { id: 5, title: 'Review', icon: CheckCircle },
    { id: 5, title: 'Account Setup', icon: FileText },
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
    sessionId?: string;
};

export default function CreateBrand({ existingBrand, aiModels = [], sessionId }: Props) {
    const [currentStep, setCurrentStep] = useState(1);
    
    // Load competitors from sessionStorage on mount
    const [competitors, setCompetitors] = useState<Competitor[]>(() => {
        try {
            const saved = sessionStorage.getItem('brandCreation_competitors');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading competitors from sessionStorage:', error);
            return [];
        }
    });
    
    const [aiGeneratedPrompts, setAiGeneratedPrompts] = useState<GeneratedPrompt[]>([]);
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    const generationAttemptedRef = useRef<string | null>(null);

    const { data, setData, post, processing, errors } = useForm<BrandForm>({
        name: existingBrand?.name || '',
        website: existingBrand?.website || '',
        description: existingBrand?.description || '',
        country: '',
        prompts: [],
        subreddits: [],
        competitors: [],
        monthly_posts: existingBrand?.monthly_posts || 10,
        brand_email: '',
        brand_password: '',
        create_account: true,
        ai_providers: aiModels.filter(model => model.is_enabled).map(model => model.name),
    });

    // Save competitors to sessionStorage whenever they change
    useEffect(() => {
        try {
            sessionStorage.setItem('brandCreation_competitors', JSON.stringify(competitors));
        } catch (error) {
            console.error('Error saving competitors to sessionStorage:', error);
        }
    }, [competitors]);

    // Reset prompt generation when website changes
    useEffect(() => {
        if (generationAttemptedRef.current && generationAttemptedRef.current !== data.website) {
            generationAttemptedRef.current = null;
            setAiGeneratedPrompts([]);
        }
    }, [data.website]);

    // Show toast messages for validation errors
    useEffect(() => {
        const errorMessages = Object.entries(errors);
        if (errorMessages.length > 0) {
            const stepErrors: Record<number, string[]> = {
                1: [], // Basic info
                2: [], // Prompts
                3: [], // Competitors 
                4: [], // Monthly posts  
                5: [], // Review (no specific errors)
                6: []  // Account setup
            };

            // Map errors to steps
            errorMessages.forEach(([field, message]) => {
                if (['name', 'website', 'description', 'country'].includes(field)) {
                    stepErrors[1].push(message);
                } else if (field === 'competitors') {
                    stepErrors[2].push(message);
                } else if (field === 'prompts') {
                    stepErrors[3].push(message);
                } else if (field === 'monthly_posts') {
                    stepErrors[4].push(message);
                } else if (['brand_email', 'brand_password', 'create_account'].includes(field)) {
                    stepErrors[6].push(message);
                }
            });

            // Show toast for errors not on current step
            Object.entries(stepErrors).forEach(([step, messages]) => {
                const stepNum = parseInt(step);
                if (stepNum !== currentStep && messages.length > 0) {
                    toast.error(`Error in Step ${stepNum}: ${messages.join(', ')}`);
                }
            });
        }
    }, [errors, currentStep]);

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

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        
        // Update form data with accepted competitors before submitting
        setData('competitors', competitors.filter(c => c.status === 'accepted'));
        
        post(route('brands.store'));
    };

    // AI Prompt generation functions
    const generateAIPrompts = useCallback(async (): Promise<void> => {
        if (!data.website) {
            toast.error('Please enter a website first');
            return;
        }

        // Prevent duplicate generation for the same website
        if (generationAttemptedRef.current === data.website) {
            return;
        }

        generationAttemptedRef.current = data.website;
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
                })
            });

            const responseData = await response.json();
            
            if (responseData.success && responseData.prompts) {
                setAiGeneratedPrompts(responseData.prompts);
                toast.success('AI prompts generated successfully!');
            } else {
                throw new Error(responseData.error || 'Failed to generate prompts');
            }
        } catch (error) {
            console.error('Error generating prompts:', error);
            toast.error('Failed to generate AI prompts. You can add prompts manually.');
            // Reset the ref on error so user can retry
            generationAttemptedRef.current = null;
        } finally {
            setIsGeneratingPrompts(false);
        }
    }, [data.website, data.description]);

    // Function to regenerate prompts (resets state and triggers new generation)
    const regenerateAIPrompts = useCallback(async (): Promise<void> => {
        // Reset state
        generationAttemptedRef.current = null;
        setAiGeneratedPrompts([]);
        // Trigger new generation
        await generateAIPrompts();
    }, [generateAIPrompts]);

    // Auto-generate prompts when moving to step 3 (Prompts step)
    useEffect(() => {
        if (
            currentStep === 3 && 
            data.website && 
            data.website.trim() !== '' &&
            !isGeneratingPrompts && 
            aiGeneratedPrompts.length === 0 &&
            generationAttemptedRef.current !== data.website
        ) {
            generateAIPrompts();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, data.website]);

    const acceptPrompt = (prompt: GeneratedPrompt) => {
        if (data.prompts.length >= 25) {
            toast.error('Maximum 25 prompts allowed');
            return;
        }
        setData('prompts', [...data.prompts, prompt.prompt]);
    };

    const rejectPrompt = (prompt: GeneratedPrompt) => {
        setAiGeneratedPrompts(prev => prev.filter(p => p.id !== prompt.id));
    };

    const removeAcceptedPrompt = (promptText: string) => {
        setData('prompts', data.prompts.filter(p => p !== promptText));
    };

    const isPromptAccepted = (prompt: GeneratedPrompt): boolean => {
        return data.prompts.includes(prompt.prompt);
    };

    const isPromptRejected = (prompt: GeneratedPrompt): boolean => {
        return !aiGeneratedPrompts.find(p => p.id === prompt.id);
    };

    const handleManualPromptAdd = (prompt: string) => {
        if (data.prompts.length >= 25) {
            toast.error('Maximum 25 prompts allowed');
            return;
        }
        setData('prompts', [...data.prompts, prompt]);
    };

    const removePrompt = (index: number) => {
        const newPrompts = [...data.prompts];
        newPrompts.splice(index, 1);
        setData('prompts', newPrompts);
    };

    const canProceed = (): boolean => {
        switch (currentStep) {
            case 1: // Basic Info
                return !!(data.name.trim()) && !errors.name && !errors.website && !errors.description && !errors.country;
            case 2: // Competitors - optional, always allow proceeding
                return true;
            case 3: // Prompts - optional, always allow proceeding  
                return true;
            case 4: // Monthly Posts
                return data.monthly_posts > 0 && !errors.monthly_posts;
            case 5: // Account Setup
                return !data.create_account || (!!(data.brand_email.trim() && data.brand_password.trim()) && !errors.brand_email && !errors.brand_password);
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
                 return <Step3Competitors 
                    {...stepProps}
                    competitors={competitors}
                    setCompetitors={setCompetitors}
                    sessionId={sessionId}
                />;
            case 3:
                return <Step2Prompts 
                    {...stepProps} 
                    isGeneratingPrompts={isGeneratingPrompts}
                    aiGeneratedPrompts={aiGeneratedPrompts}
                    generateAIPrompts={regenerateAIPrompts}
                    acceptPrompt={acceptPrompt}
                    rejectPrompt={rejectPrompt}
                    removeAcceptedPrompt={removeAcceptedPrompt}
                    isPromptAccepted={isPromptAccepted}
                    isPromptRejected={isPromptRejected}
                    handleManualPromptAdd={handleManualPromptAdd}
                    removePrompt={removePrompt}
                    aiModels={aiModels}
                />;
            case 4:
                return <Step4MonthlyPosts {...stepProps} />;
            case 5:
                return <Step6AccountSetup {...stepProps} />;
            default:
                return null;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Brand" />

            <div className="p-6">
                <div className="step-wrapp">
                    {/* <HeadingSmall title="Create New Brand" /> */}

                    <form onSubmit={handleSubmit} className="space-y-10 step-wrapp-card">
                        <Card className='bg-sidebar'>
                            <CardHeader>
                                <CardTitle className="brand-heading"> <span><img src="../images/brand-wizard.png" alt="icon" /></span> Brand Setup Wizard</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-10">
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

                                <div className="min-h-[300px]">
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
