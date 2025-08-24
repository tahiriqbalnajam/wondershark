import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface Settings {
    post_creation: {
        allow_agency_post_creation: boolean;
        allow_brand_post_creation: boolean;
        enforce_brand_post_limits: boolean;
        default_monthly_post_limit: number;
    };
}

interface Props {
    settings: Settings;
}

export default function AdminSettings({ settings }: Props) {
    const { data, setData, post, processing } = useForm({
        allow_agency_post_creation: settings.post_creation.allow_agency_post_creation,
        allow_brand_post_creation: settings.post_creation.allow_brand_post_creation,
        enforce_brand_post_limits: settings.post_creation.enforce_brand_post_limits,
        default_monthly_post_limit: settings.post_creation.default_monthly_post_limit,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/settings/update', {
            onSuccess: () => {
                toast.success('Settings updated successfully');
            },
            onError: () => {
                toast.error('Failed to update settings');
            },
        });
    };

    return (
        <AppLayout>
            <Head title="System Settings" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
                        <p className="text-muted-foreground">
                            Manage system-wide settings and configurations
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Post Creation Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Post Creation Settings
                            </CardTitle>
                            <CardDescription>
                                Control who can create posts and manage post limits
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Agency Post Creation */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="allow-agency">Allow Agency Post Creation</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enable agencies to create posts for their brands
                                    </p>
                                </div>
                                <Checkbox
                                    id="allow-agency"
                                    checked={data.allow_agency_post_creation}
                                    onCheckedChange={(checked: boolean) => setData('allow_agency_post_creation', checked)}
                                />
                            </div>

                            {/* Brand Post Creation */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="allow-brand">Allow Brand Post Creation</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enable brands to create posts directly
                                    </p>
                                </div>
                                <Checkbox
                                    id="allow-brand"
                                    checked={data.allow_brand_post_creation}
                                    onCheckedChange={(checked: boolean) => setData('allow_brand_post_creation', checked)}
                                />
                            </div>

                            {/* Enforce Limits */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="enforce-limits">Enforce Post Limits</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enforce monthly post limits for each brand
                                    </p>
                                </div>
                                <Checkbox
                                    id="enforce-limits"
                                    checked={data.enforce_brand_post_limits}
                                    onCheckedChange={(checked: boolean) => setData('enforce_brand_post_limits', checked)}
                                />
                            </div>

                            {/* Default Monthly Limit */}
                            <div className="space-y-2">
                                <Label htmlFor="default-limit">Default Monthly Post Limit</Label>
                                <p className="text-sm text-muted-foreground">
                                    Default monthly post limit for new brands (0 = unlimited)
                                </p>
                                <Input
                                    id="default-limit"
                                    type="number"
                                    min="0"
                                    value={data.default_monthly_post_limit}
                                    onChange={(e) => setData('default_monthly_post_limit', parseInt(e.target.value) || 0)}
                                    className="max-w-xs"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Settings Status Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Current Settings Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="flex items-center space-x-2">
                                    <div className={`w-3 h-3 rounded-full ${data.allow_agency_post_creation ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-sm">Agency Creation: {data.allow_agency_post_creation ? 'Enabled' : 'Disabled'}</span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <div className={`w-3 h-3 rounded-full ${data.allow_brand_post_creation ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-sm">Brand Creation: {data.allow_brand_post_creation ? 'Enabled' : 'Disabled'}</span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <div className={`w-3 h-3 rounded-full ${data.enforce_brand_post_limits ? 'bg-orange-500' : 'bg-gray-500'}`}></div>
                                    <span className="text-sm">Limits: {data.enforce_brand_post_limits ? 'Enforced' : 'Disabled'}</span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <span className="text-sm">Default Limit: {data.default_monthly_post_limit === 0 ? 'Unlimited' : data.default_monthly_post_limit}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing}>
                            <Save className="w-4 h-4 mr-2" />
                            {processing ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
