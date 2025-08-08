import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Puzzle, Clock } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Integration settings',
        href: '/settings/integration',
    },
];

export default function Integration() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Integration settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Integration Settings" description="Connect your agency with third-party tools and services" />

                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                                <Clock className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                            <p className="text-muted-foreground max-w-md">
                                We're working on exciting integrations to help streamline your workflow. 
                                Stay tuned for updates on connecting with popular tools and platforms.
                            </p>
                            
                            <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm">
                                <div className="flex items-center gap-2 p-3 border rounded-lg opacity-50">
                                    <Puzzle className="h-5 w-5" />
                                    <span className="text-sm">Google Ads</span>
                                </div>
                                <div className="flex items-center gap-2 p-3 border rounded-lg opacity-50">
                                    <Puzzle className="h-5 w-5" />
                                    <span className="text-sm">Facebook Ads</span>
                                </div>
                                <div className="flex items-center gap-2 p-3 border rounded-lg opacity-50">
                                    <Puzzle className="h-5 w-5" />
                                    <span className="text-sm">Analytics</span>
                                </div>
                                <div className="flex items-center gap-2 p-3 border rounded-lg opacity-50">
                                    <Puzzle className="h-5 w-5" />
                                    <span className="text-sm">CRM Tools</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
