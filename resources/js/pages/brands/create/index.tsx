import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState, FormEventHandler } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { 
    Building2, 
    FileText, 
    CheckCircle,
    Calendar
} from 'lucide-react';

// Import step components
import Step1BasicInfo from './step1-basic-info';
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
    { id: 2, title: 'Monthly Posts', icon: Calendar },
    { id: 3, title: 'Review', icon: CheckCircle },
    { id: 4, title: 'Account Setup', icon: FileText },
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

export default function CreateBrand({ existingBrand, aiModels = [] }: Omit<Props, 'generatedPrompts'>) {
    const [currentStep, setCurrentStep] = useState(1);

    const { data, setData, post, processing, errors } = useForm<BrandForm>({
        name: existingBrand?.name || '',
        website: existingBrand?.website || '',
        description: existingBrand?.description || '',
        country: '',
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
        post(route('brands.store'));
    };

    const canProceed = (): boolean => {
        switch (currentStep) {
            case 1:
                return !!(data.name.trim());
            case 2:
                return data.monthly_posts > 0;
            case 3:
                return true; // Review step
            case 4:
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
                return <Step4MonthlyPosts {...stepProps} />;
            case 3:
                return <Step5Review {...stepProps} />;
            case 4:
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
