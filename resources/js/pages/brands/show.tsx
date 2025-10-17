import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { type BreadcrumbItem } from '@/types';
import { PermissionWrapper } from '@/components/permission-wrapper';
import { 
    Users, 
    Shield, 
    Settings, 
    BarChart3, 
    TrendingUp,
    Award
} from 'lucide-react';

interface Brand {
    id: number;
    name: string;
    website?: string;
    description?: string;
}

interface Props {
    brand: Brand;
}

export default function BrandDashboard({ brand }: Props) {
    const [selectedAIModel, setSelectedAIModel] = useState('openai');

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Brands',
            href: '/brands',
        },
        {
            title: brand.name,
            href: `/brands/${brand.id}`,
        },
    ];

    const aiModels = [
        { value: 'openai', label: 'OpenAI (GPT-4)' },
        { value: 'claude', label: 'Claude (Anthropic)' },
        { value: 'gemini', label: 'Google Gemini' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${brand.name} Dashboard`} />
            <div className="relative">
                <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                <div className="relative mx-auto max-w-7xl px-4 py-6 space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {brand.name} Dashboard
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Monitor your brand visibility and performance
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select AI Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {aiModels.map((model) => (
                                        <SelectItem key={model.value} value={model.value}>
                                            {model.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Visibility Score
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">87.5%</div>
                                <p className="text-xs text-muted-foreground">
                                    +2.1% from last month
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Market Position
                                </CardTitle>
                                <Award className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">#2</div>
                                <p className="text-xs text-muted-foreground">
                                    in your industry
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Sentiment Score
                                </CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">92.3%</div>
                                <p className="text-xs text-muted-foreground">
                                    +5.2% from last month
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Active Competitors
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">12</div>
                                <p className="text-xs text-muted-foreground">
                                    +2 this month
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Visibility Trends</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                    Visibility chart will be displayed here
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Industry Ranking</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">#1 Fiverr</span>
                                        <div className="flex gap-2">
                                            <Badge className="bg-green-100 text-green-800">positive</Badge>
                                            <Badge className="bg-blue-100 text-blue-800">high</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">#2 Upwork</span>
                                        <div className="flex gap-2">
                                            <Badge className="bg-green-100 text-green-800">positive</Badge>
                                            <Badge className="bg-blue-100 text-blue-800">high</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">#3 Influencity</span>
                                        <div className="flex gap-2">
                                            <Badge className="bg-yellow-100 text-yellow-800">neutral</Badge>
                                            <Badge className="bg-orange-100 text-orange-800">medium</Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <PermissionWrapper permission="view-admin-panel">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Admin Tools
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <PermissionWrapper permission="view-users">
                                        <Button variant="outline" className="justify-start">
                                            <Users className="w-4 h-4 mr-2" />
                                            User Management
                                        </Button>
                                    </PermissionWrapper>
                                    
                                    <Button variant="outline" className="justify-start">
                                        <Settings className="w-4 h-4 mr-2" />
                                        System Settings
                                    </Button>
                                    
                                    <Button variant="outline" className="justify-start">
                                        <BarChart3 className="w-4 h-4 mr-2" />
                                        Analytics Export
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </PermissionWrapper>
                </div>
            </div>
        </AppLayout>
    );
}
