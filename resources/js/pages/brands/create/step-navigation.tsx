import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MoveLeft, MoveRight, } from 'lucide-react';

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
            <div className="flex justify-between brand-step-boxes">
                {steps.map((step) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;

                    return (
                        <div key={step.id} className="brand-step-item">
                            <div className={`brand-icon-item ${
                                    isActive
                                        ? 'brand-progress'
                                        : isCompleted
                                        ? 'brand-completed'
                                        : 'brand-icon-item'
                                }`}
                                >
                                <Icon/>
                            </div>
                            <span className={`text-xs text-center ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Navigation Buttons */}
            {/* <div className="flex justify-between pt-4 setup-wizard-buttons">
                <button
                    type="button"
                    onClick={onPrev}
                    disabled={currentStep === 1}
                    className="flex items-center gap-5 button-single"
                >
                    <span className="heading-icon"><MoveLeft/></span>
                    Previous
                </button>

                {currentStep === totalSteps ? (
                    <button
                        type="submit"
                        onClick={onSubmit}
                        disabled={!canProceed || processing}
                        className="flex items-center gap-5 button-single button-disabled"
                    >
                        {processing ? 'Creating Brand...' : 'Create Brand'}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={!canProceed}
                        className="flex items-center gap-5 button-single button-completed"
                    >
                        Next
                        <span className="heading-icon"><MoveRight/></span>
                    </button>
                )}
            </div> */}
            <div className="flex justify-between pt-4 setup-wizard-buttons">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onPrev}
                    disabled={currentStep === 1}
                    className="flex items-center gap-2 button-single"
                >
                    <span className="heading-icon"><MoveLeft/></span>
                    Previous
                </Button>

                {currentStep === totalSteps ? (
                    <Button
                        type="submit"
                        onClick={onSubmit}
                        disabled={!canProceed || processing}
                        className="flex items-center gap-2 button-single"
                    >
                        {processing ? 'Creating Brand...' : 'Create Brand'}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={onNext}
                        disabled={!canProceed}
                        className="flex items-center gap-2 button-single button-completed"
                    >
                        Next
                        <span className="heading-icon"><MoveRight/></span>
                    </Button>
                )}
            </div>
        </div>
    );
}
