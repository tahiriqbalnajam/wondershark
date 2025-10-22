import { useState, useEffect, useMemo } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { usePermissions } from '@/hooks/use-permissions';
import { PermissionWrapper } from '@/components/permission-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartPieData } from '@/components/chart/sources-type';
import { BrandVisibilityIndex } from '@/components/dashboard-table/brand-visibility';
import { VisibilityChart } from '@/components/chart/visibility';
import { SourceUsageTable } from "@/components/dashboard-table/all-sources";
import { AiCitations } from "@/components/chat/ai-citations";
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

import {
    MessagesSquare,
    ChartNoAxesCombined,
    FileChartLine,
    Users,
    Shield,
    Settings,
    UsersRound,
    Calendar,
    CalendarRange,
    Sparkles,
    FolderTree,
    DatabaseZap,
    Globe
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
];

const aiModels = [
    { value: 'openai', label: 'OpenAI (GPT-4)' },
    { value: 'claude', label: 'Claude (Anthropic)' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'groq', label: 'Groq' },
    { value: 'deepseek', label: 'DeepSeek' },
];

const brands = [
    { value: 'all', label: 'All Brands' },
    { value: 'fiverr', label: 'Fiverr' },
    { value: 'upwork', label: 'Upwork' },
    { value: 'influencity', label: 'Influencity' },
    { value: 'famebit', label: 'FameBit' },
    { value: 'amazon', label: 'Amazon Creator Connections' },
];

export default function Dashboard() {
    const { roles } = usePermissions();
    const { props } = usePage<{ brands?: Array<{ id: number; name: string }> }>();
    const userBrands = useMemo(() => props.brands || [], [props.brands]);

    useEffect(() => {
        if (userBrands.length > 0) {
            const firstBrand = userBrands[0];
            router.visit(`/brands/${firstBrand.id}`);
        }
    }, [userBrands]);

    const [selectedBrand, setSelectedBrand] = useState('all');
    const [selectedAIModel, setSelectedAIModel] = useState('openai');
    const [selectedDateRange, setSelectedDateRange] = useState('30');
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});

    const handleDateRangeSelect = (days: string) => {
        setSelectedDateRange(days);
        if (days !== 'custom') setCustomDateRange({});
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-col gap-6 rounded-xl p-4 overflow-x-auto">
                {/* Filters Section */}
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Date Range Filter */}
                    <div className="flex gap-2 common-fields">
                        <CalendarRange />
                        <Select value={selectedDateRange} onValueChange={handleDateRangeSelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="14">Last 14 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                        </Select>
                        {selectedDateRange === 'custom' && (
                            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-fit">
                                        <Calendar className="h-4 w-4 mr-2" />
                                        {customDateRange.from ? (
                                            customDateRange.to ? (
                                                `${format(customDateRange.from, 'MMM dd')} - ${format(
                                                    customDateRange.to,
                                                    'MMM dd'
                                                )}`
                                            ) : (
                                                format(customDateRange.from, 'MMM dd, yyyy')
                                            )
                                        ) : (
                                            'Pick a date'
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <DayPicker
                                        mode="range"
                                        selected={{
                                            from: customDateRange.from,
                                            to: customDateRange.to,
                                        }}
                                        onSelect={(range) => setCustomDateRange(range || {})}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>

                    {/* Brand Filter */}
                    <div className="flex gap-2 common-fields">
                        <UsersRound />
                        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select brand" />
                            </SelectTrigger>
                            <SelectContent>
                                {brands.map((brand) => (
                                    <SelectItem key={brand.value} value={brand.value}>
                                        {brand.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* AI Model Filter */}
                    <div className="flex gap-2 common-fields">
                        <Sparkles />
                        <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select AI model" />
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

                {/* Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visibility Chart */}
                    <Card className="default-card">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className="bg-gray-200 w-10 h-10 rounded flex items-center justify-center">
                                    <ChartNoAxesCombined className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle>Visibility</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Percentage of chats mentioning each brand
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <VisibilityChart/>
                    </Card>

                    <Card className="default-card">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className="bg-gray-200 w-10 h-10 rounded flex items-center justify-center">
                                    <FileChartLine className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle>Brand Visibility Index</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        {/* Industry Ranking */}
                        <BrandVisibilityIndex />
                    </Card>
                </div>

                {/* Top Sources */}
                <div className="default-card py-10">
                    <CardHeader className="mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-gray-200 w-10 h-10 rounded flex items-center justify-center">
                                    <FolderTree className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle>Top Sources</CardTitle>
                                    <p className="text-sm text-muted-foreground">Sources across active models</p>
                                </div>
                            </div>
                            <div><Link href="/" className="primary-btn btn-sm">More Sources</Link></div>
                        </div>
                    </CardHeader>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-6">
                        <div className="">
                            <Card className="default-card">
                                <CardHeader className='mb-6'>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gray-200 w-10 h-10 rounded flex items-center justify-center">
                                            <DatabaseZap className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle>Sources Type</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <ChartPieData />
                            </Card>
                        </div>
                        <div className="col-span-2">
                            <Card className="default-card">
                                <CardHeader className='mb-6'>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gray-200 w-10 h-10 rounded flex items-center justify-center">
                                            <Globe className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle>All Sources</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <SourceUsageTable/>
                            </Card>
                        </div>
                    </div>
                </div>
                
                {/* AI Citations */}
                <div className="default-card py-10">
                    <CardHeader className="mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-gray-200 w-10 h-10 rounded flex items-center justify-center">
                                    <MessagesSquare className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className='flex gap-2 items-center'>Recent <img src="../images/b7.png" alt="icon"/> AI Citations</CardTitle>
                                    <p className="text-sm text-muted-foreground">Chats that FameBit mentioned</p>
                                </div>
                            </div>
                            <div><Link href="/" className="primary-btn btn-sm">All Citations</Link></div>
                        </div>
                    </CardHeader>
                    <AiCitations/>
                </div>

                {/* Quick Actions */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <PermissionWrapper permission="view-users">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">User Management</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Manage Users</div>
                                <p className="text-xs text-muted-foreground">View and manage system users</p>
                                <Button asChild className="mt-2" size="sm">
                                    <Link href="/users">Go to Users</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </PermissionWrapper>

                    <PermissionWrapper permission="view-admin-panel">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Admin Panel</CardTitle>
                                <Shield className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Admin Tools</div>
                                <p className="text-xs text-muted-foreground">Access admin functionality</p>
                                <Button asChild className="mt-2" size="sm">
                                    <Link href="/admin">Go to Admin</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </PermissionWrapper>

                    <PermissionWrapper permission="view-settings">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Settings</CardTitle>
                                <Settings className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Configure</div>
                                <p className="text-xs text-muted-foreground">Manage your settings</p>
                                <Button asChild className="mt-2" size="sm">
                                    <Link href="/settings/profile">Go to Settings</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </PermissionWrapper>
                </div>
            </div>
        </AppLayout>
    );
}
