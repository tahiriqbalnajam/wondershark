import { useEffect, useState } from 'react';
import { Bot, Sparkles, Brain, Zap, Target, TrendingUp, Search, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const loadingSteps = [
    { icon: Search, label: 'Analyzing content...', duration: 20 },
    { icon: Brain, label: 'Understanding context...', duration: 25 },
    { icon: Target, label: 'Identifying opportunities...', duration: 20 },
    { icon: Sparkles, label: 'Generating prompts...', duration: 25 },
    { icon: TrendingUp, label: 'Optimizing visibility...', duration: 10 },
];

const funFacts = [
    "Did you know? AI-powered prompts can increase brand visibility by up to 300%!",
    "Fun fact: Our AI analyzes thousands of conversation patterns to find the perfect prompts.",
    "Pro tip: Active prompts get analyzed daily to track your brand's performance.",
    "Did you know? The most effective prompts are specific and conversation-focused.",
    "Interesting: AI search is becoming the primary way users discover brands online.",
    "Fun fact: Well-crafted prompts can position your brand as the default answer.",
    "Did you know? Our system tracks sentiment, position, and visibility for each prompt.",
    "Pro tip: Regularly reviewing and updating prompts improves long-term results.",
];

export function PromptGenerationLoader() {
    const [currentStep, setCurrentStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const [currentFact, setCurrentFact] = useState(0);
    const [dots, setDots] = useState('');

    // Animate dots
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Progress animation
    useEffect(() => {
        const totalDuration = loadingSteps.reduce((sum, step) => sum + step.duration, 0);
        let elapsed = 0;
        
        const interval = setInterval(() => {
            elapsed += 0.1;
            const newProgress = Math.min((elapsed / totalDuration) * 100, 95);
            setProgress(newProgress);

            // Update current step based on elapsed time
            let cumulativeDuration = 0;
            for (let i = 0; i < loadingSteps.length; i++) {
                cumulativeDuration += loadingSteps[i].duration;
                if (elapsed * 10 < cumulativeDuration) {
                    setCurrentStep(i);
                    break;
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    // Rotate fun facts
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentFact(prev => (prev + 1) % funFacts.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    const CurrentIcon = loadingSteps[currentStep]?.icon || Bot;

    return (
        <div className="py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Main animated icon */}
                <div className="flex justify-center">
                    <div className="relative">
                        {/* Pulsing background circles */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-32 h-32 bg-primary/10 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 bg-primary/20 rounded-full animate-pulse"></div>
                        </div>
                        
                        {/* Main icon */}
                        <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg">
                            <CurrentIcon className="h-10 w-10 text-white animate-bounce" style={{ animationDuration: '1.5s' }} />
                        </div>

                        {/* Sparkle effects */}
                        <div className="absolute -top-2 -right-2">
                            <Sparkles className="h-6 w-6 text-yellow-400 animate-spin" style={{ animationDuration: '3s' }} />
                        </div>
                        <div className="absolute -bottom-1 -left-1">
                            <Zap className="h-5 w-5 text-orange-400 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Status text */}
                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">
                        Generating AI Prompts{dots}
                    </h3>
                    <p className="text-gray-600">
                        {loadingSteps[currentStep]?.label || 'Processing...'}
                    </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-3">
                    <Progress value={progress} className="h-3" />
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>{Math.round(progress)}% complete</span>
                        <span>~{Math.max(0, Math.ceil((100 - progress) / 3))}s remaining</span>
                    </div>
                </div>

                {/* Steps visualization */}
                <div className="flex justify-between items-center px-4">
                    {loadingSteps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = index === currentStep;
                        const isComplete = index < currentStep;
                        
                        return (
                            <div key={index} className="flex flex-col items-center gap-2 flex-1">
                                <div 
                                    className={`
                                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                                        ${isComplete ? 'scale-110' : isActive ? 'bg-primary scale-125 shadow-lg' : 'bg-gray-200'}
                                    `}
                                    style={isComplete ? { backgroundColor: 'var(--orange-1)' } : {}}
                                >
                                    <StepIcon className={`
                                        h-5 w-5 transition-all duration-300
                                        ${isComplete || isActive ? 'text-white' : 'text-gray-400'}
                                        ${isActive ? 'animate-pulse' : ''}
                                    `} />
                                </div>
                                <div className="h-0.5 w-full bg-gray-200 relative overflow-hidden">
                                    {isComplete && (
                                        <div className="absolute inset-0" style={{ backgroundColor: 'var(--orange-1)' }}></div>
                                    )}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-primary animate-pulse"></div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Fun fact card */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <div className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900 mb-1">While you wait...</p>
                                <p className="text-sm text-blue-800 transition-all duration-500">
                                    {funFacts[currentFact]}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Spinning refresh indicator */}
                <div className="flex justify-center">
                    <div className="flex items-center gap-2 text-gray-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Processing your request...</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
