import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { StepProps } from './types';

export default function Step6AccountSetup({ }: StepProps) {
    return (
        <div className="space-y-6">
            <div className="text-center py-8">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                        <Check className="w-12 h-12 text-green-600 dark:text-green-500" />
                    </div>
                </div>

                <h3 className="text-2xl font-semibold mb-3">Ready to Complete Setup!</h3>
                <p className="text-muted-foreground text-lg mb-6">
                    You've successfully configured your brand. Click "Finish" below to activate your brand and start using the platform.
                </p>

                <Card className="max-w-2xl mx-auto">
                    <CardContent className="pt-6">
                        <div className="space-y-4 text-left">
                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">Basic Information</p>
                                    <p className="text-sm text-muted-foreground">Brand name, website, and details configured</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">Competitors</p>
                                    <p className="text-sm text-muted-foreground">Competitive analysis setup complete</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">Marketing Prompts</p>
                                    <p className="text-sm text-muted-foreground">AI-generated prompts configured</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">Monthly Posts Settings</p>
                                    <p className="text-sm text-muted-foreground">Post creation limits configured</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-sm text-muted-foreground mt-6">
                    Click "Finish" to activate your brand and access the dashboard.
                </p>
            </div>
        </div>
    );
}
