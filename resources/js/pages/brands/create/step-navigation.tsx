import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type StepNavigationProps = {
    currentStep: number;
    totalSteps: number;
    canProceed: boolean;
    processing: boolean;
    onNext: () => void;
    onPrev: () => void;
    onSubmit: () => void;
    steps: Array<{
        id: number;
        title: string;
        icon: React.ComponentType<{ className?: string }>;
    }>;
};

export default function StepNavigation({
    currentStep,
    totalSteps,
    canProceed,
    processing,
    onNext,
    onPrev,
    onSubmit,
    steps
}: StepNavigationProps) {
    const progress = (currentStep / totalSteps) * 100;

    return (
        <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Step {currentStep} of {totalSteps}</span>
                    <span>{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between">
                {steps.map((step) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 flex-1">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                                    isActive
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : isCompleted
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : 'border-muted-foreground/30 text-muted-foreground'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                            </div>
                            <span className={`text-xs text-center ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onPrev}
                    disabled={currentStep === 1}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                </Button>

                {currentStep === totalSteps ? (
                    <Button
                        type="submit"
                        onClick={onSubmit}
                        disabled={!canProceed || processing}
                        className="flex items-center gap-2"
                    >
                        {processing ? 'Creating Brand...' : 'Create Brand'}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={onNext}
                        disabled={!canProceed}
                        className="flex items-center gap-2"
                    >
                        Next
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
