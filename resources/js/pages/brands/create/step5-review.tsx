import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MessageSquare, Users, Calendar } from 'lucide-react';
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
                        <div>
                            <Label>Description</Label>
                            <p className="text-sm text-muted-foreground">{data.description}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Content Prompts ({data.prompts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {data.prompts.slice(0, 3).map((prompt, index) => (
                                <p key={index} className="text-sm p-2 bg-muted rounded">
                                    {prompt.substring(0, 100)}{prompt.length > 100 ? '...' : ''}
                                </p>
                            ))}
                            {data.prompts.length > 3 && (
                                <p className="text-sm text-muted-foreground">
                                    ... and {data.prompts.length - 3} more prompts
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Target Subreddits ({data.subreddits.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {data.subreddits.map((subreddit, index) => (
                                <Badge key={index} variant="secondary">
                                    r/{subreddit}
                                </Badge>
                            ))}
                        </div>
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
