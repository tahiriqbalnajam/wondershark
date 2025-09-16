import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, FileText, Shield } from 'lucide-react';
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

                {/* Content Prompts */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Content Prompts ({data.prompts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.prompts.length > 0 ? (
                            <div className="space-y-2">
                                {data.prompts.slice(0, 3).map((prompt, index) => (
                                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                                        <p className="text-sm">{prompt}</p>
                                    </div>
                                ))}
                                {data.prompts.length > 3 && (
                                    <div className="text-center py-2">
                                        <Badge variant="outline">
                                            +{data.prompts.length - 3} more prompts
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-muted-foreground">
                                <p>No prompts added</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Competitors */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Competitors ({data.competitors.filter(c => c.status === 'accepted').length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.competitors.filter(c => c.status === 'accepted').length > 0 ? (
                            <div className="space-y-2">
                                {data.competitors.filter(c => c.status === 'accepted').slice(0, 3).map((competitor, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">{competitor.name}</p>
                                            <p className="text-xs text-muted-foreground">{competitor.domain}</p>
                                        </div>
                                        <Badge variant={competitor.source === 'ai' ? 'default' : 'secondary'}>
                                            {competitor.source.toUpperCase()}
                                        </Badge>
                                    </div>
                                ))}
                                {data.competitors.filter(c => c.status === 'accepted').length > 3 && (
                                    <div className="text-center py-2">
                                        <Badge variant="outline">
                                            +{data.competitors.filter(c => c.status === 'accepted').length - 3} more competitors
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-muted-foreground">
                                <p>No competitors added</p>
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
