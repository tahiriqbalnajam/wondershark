import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState, FormEventHandler, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { 
    MessagesSquare, 
    FileText,
    CalendarDays,
    Swords
} from 'lucide-react';

// Import step components
import Step1BasicInfo from './step1-basic-info';
import Step2Prompts from './step2-prompts';
import Step3Competitors from './step3-competitors';
import Step4MonthlyPosts from './step4-monthly-posts';
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
    currentStep: number;
    existingData: {
        brand: {
            id: number;
            name: string;
            website: string;
            description: string;
            country: string;
            monthly_posts: number;
        } | null;
        competitors: Array<{
            id: number;
            name: string;
            domain: string;
            source: string;
            status: string;
            mentions: number;
        }>;
        prompts: GeneratedPrompt[];
    };
    aiModels?: AiModel[];
    sessionId?: string;
};

export default function CreateBrand({ currentStep: initialStep, existingData, aiModels = [], sessionId }: Props) {
    const [currentStep, setCurrentStep] = useState(initialStep);
    
    // Clean up sessionStorage when starting fresh brand creation
    useEffect(() => {
        if (initialStep === 1 && !existingData.brand) {
            // Clear any old session data from previous creation attempts
            sessionStorage.removeItem('brandCreation_competitors');
            sessionStorage.removeItem('allPrompts');
            sessionStorage.removeItem('promptStates');
        }
    }, [initialStep, existingData.brand]);
    
    // Load competitors from existing data (database)
    const [competitors, setCompetitors] = useState<Competitor[]>(() => {
        if (existingData.competitors.length > 0) {
            return existingData.competitors.map(c => ({
                id: c.id,
                name: c.name,
                domain: c.domain,
                mentions: c.mentions,
                status: c.status as 'suggested' | 'accepted' | 'rejected',
                source: c.source as 'ai' | 'manual'
            }));
        }
        return [];
    });
    
    const [aiGeneratedPrompts, setAiGeneratedPrompts] = useState<GeneratedPrompt[]>([]);
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    const generationAttemptedRef = useRef<string | null>(null);

    const { data, setData, processing, errors } = useForm<BrandForm>({
        name: existingData.brand?.name || '',
        website: existingData.brand?.website || '',
        description: existingData.brand?.description || '',
        country: existingData.brand?.country || '',
        prompts: [], // Don't load prompts here - they're passed separately to Step2Prompts
        subreddits: [],
        competitors: [],
        monthly_posts: existingData.brand?.monthly_posts || 10,
        brand_email: '',
        brand_password: '',
        create_account: false,
        ai_providers: aiModels.filter(model => model.is_enabled).map(model => model.name),
    });

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

    const nextStep = async () => {
        const brandId = existingData.brand?.id;
        
        // Handle step submission based on current step
        if (currentStep === 1 && !brandId) {
            // Step 1: Create draft brand
            try {
                const response = await fetch(route('brands.create.step1'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({
                        name: data.name,
                        website: data.website,
                        description: data.description,
                        country: data.country,
                    }),
                });

                const result = await response.json();
                
                if (result.success && result.redirect_url) {
                    window.location.href = result.redirect_url;
                } else {
                    toast.error(result.message || 'Failed to create brand');
                }
            } catch (error) {
                console.error('Error creating brand:', error);
                toast.error('Failed to create brand');
            }
        } else if (currentStep === 2 && brandId) {
            // Step 2: Update competitors
            const acceptedCompetitors = competitors.filter(c => c.status === 'accepted');
            
            try {
                const response = await fetch(route('brands.update.step2', { brand: brandId }), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({
                        competitors: acceptedCompetitors.map(c => ({
                            name: c.name,
                            domain: c.domain,
                            source: c.source,
                        })),
                    }),
                });

                const result = await response.json();
                
                if (result.success && result.redirect_url) {
                    window.location.href = result.redirect_url;
                } else {
                    toast.error(result.message || 'Failed to update competitors');
                }
            } catch (error) {
                console.error('Error updating competitors:', error);
                toast.error('Failed to update competitors');
            }
        } else if (currentStep === 3 && brandId) {
            // Step 3: Update prompts
            try {
                const response = await fetch(route('brands.update.step3', { brand: brandId }), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({
                        prompts: data.prompts,
                    }),
                });

                const result = await response.json();
                
                if (result.success && result.redirect_url) {
                    window.location.href = result.redirect_url;
                } else {
                    toast.error(result.message || 'Failed to update prompts');
                }
            } catch (error) {
                console.error('Error updating prompts:', error);
                toast.error('Failed to update prompts');
            }
        } else if (currentStep === 4 && brandId) {
            // Step 4: Update monthly posts
            try {
                const response = await fetch(route('brands.update.step4', { brand: brandId }), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({
                        monthly_posts: data.monthly_posts,
                    }),
                });

                const result = await response.json();
                
                if (result.success && result.redirect_url) {
                    window.location.href = result.redirect_url;
                } else {
                    toast.error(result.message || 'Failed to update monthly posts');
                }
            } catch (error) {
                console.error('Error updating monthly posts:', error);
                toast.error('Failed to update monthly posts');
            }
        } else {
            // Just move to next step locally (for previewing before final submit)
            if (currentStep < steps.length) {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const prevStep = () => {
        const brandId = existingData.brand?.id;
        
        if (currentStep > 1 && brandId) {
            // Navigate back to previous step page
            window.location.href = route('brands.create.step', { brand: brandId, step: currentStep - 1 });
        } else if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();
        const brandId = existingData.brand?.id;
        
        if (!brandId) {
            toast.error('Brand ID not found');
            return;
        }
        
        // Step 5: Finalize brand (account setup and activation)
        try {
            const response = await fetch(route('brands.update.step5', { brand: brandId }), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    create_account: data.create_account,
                    brand_email: data.brand_email,
                    brand_password: data.brand_password,
                }),
            });

            const result = await response.json();
            
            if (result.success && result.redirect_url) {
                toast.success(result.message || 'Brand created successfully!');
                window.location.href = result.redirect_url;
            } else {
                toast.error(result.message || 'Failed to finalize brand');
            }
        } catch (error) {
            console.error('Error finalizing brand:', error);
            toast.error('Failed to finalize brand');
        }
    };

    const handleFinalSubmit = () => {
        handleSubmit({ preventDefault: () => {} } as React.FormEvent);
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
                    keywords: data.description, // Pass keywords/description for prompt generation
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
            existingData.prompts.length === 0 && // Only generate if no prompts exist in DB
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleManualPromptAdd = (prompt: string, _countryCode?: string) => {
        if (data.prompts.length >= 25) {
            toast.error('Maximum 25 prompts allowed');
            return;
        }
        // Note: countryCode parameter is reserved for future use when per-prompt location is supported
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
                    brandId={existingData.brand?.id}
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
                    brandId={existingData.brand?.id}
                    existingPrompts={existingData.prompts}
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
                                    onSubmit={handleFinalSubmit}
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
