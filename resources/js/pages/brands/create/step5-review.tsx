import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Calendar } from 'lucide-react';
import { StepProps } from './types';

export default function Step5Review({ data }: StepProps) {
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
                        {data.country && (
                            <div>
                                <Label>Country</Label>
                                <p className="font-medium">{data.country}</p>
                            </div>
                        )}
                        {data.description && (
                            <div>
                                <Label>Description</Label>
                                <p className="text-sm text-muted-foreground">{data.description}</p>
                            </div>
                        )}
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
}
