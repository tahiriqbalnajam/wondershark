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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { usePermissions } from '@/hooks/use-permissions';
import { PermissionWrapper } from '@/components/permission-wrapper';
import { 
    Users, 
    Shield, 
    Settings, 
    BarChart3, 
    Calendar,
    Filter,
    TrendingUp,
    Award
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer 
} from 'recharts';
import { DayPicker } from 'react-day-picker';
import { format, addDays, subDays } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

const visibilityData: Array<any> = [];

const industryRanking: Array<any> = [];

const brands: Array<{value: string, label: string}> = [
    { value: 'all', label: 'All Brands' },
];

export default function Dashboard() {
    const { roles } = usePermissions();
    const { props } = usePage<{
        brands?: Array<{id: number, name: string}>, 
        isAdmin?: boolean,
        aiModels?: Array<{
            id: number;
            name: string;
            display_name: string;
            icon?: string;
            provider?: string;
        }>;
    }>();
    
    const userBrands = useMemo(() => props.brands || [], [props.brands]);
    
    const aiModelOptions = useMemo(() => {
        const models: Array<{
            value: string;
            label: string;
            logo: string | null;
        }> = [
            {
                value: 'all',
                label: 'All AI Models',
                logo: null,
            },
        ];

        // Add dynamic models from database
        const aiModelsData = props.aiModels || [];
        aiModelsData.forEach((model: {
            id: number;
            name: string;
            display_name: string;
            icon?: string;
            provider?: string;
        }) => {
            models.push({
                value: model.name,
                label: model.display_name,
                logo: model.icon ? `/storage/${model.icon}` : null,
            });
        });

        return models;
    }, [props.aiModels]);
    const isAdmin = props.isAdmin || false;
    const hasAgencyRole = roles.includes('agency');
    
    const [selectedBrand, setSelectedBrand] = useState('all');
    const [selectedAIModel, setSelectedAIModel] = useState('all');
    const [selectedDateRange, setSelectedDateRange] = useState('30');
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case 'positive':
                return 'bg-green-100 text-green-800';
            case 'neutral':
                return 'bg-yellow-100 text-yellow-800';
            case 'negative':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getVisibilityColor = (visibility: string) => {
        switch (visibility) {
            case 'high':
                return 'bg-blue-100 text-blue-800';
            case 'medium':
                return 'bg-orange-100 text-orange-800';
            case 'low':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleDateRangeSelect = (days: string) => {
        setSelectedDateRange(days);
        if (days !== 'custom') {
            setCustomDateRange({});
        }
    };

    return (
        <AppLayout>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 overflow-x-auto">
                {/* Welcome section */}

                {/* Filters Section */}
                        <div className="flex flex-wrap gap-4 items-end">
                            {/* Date Range Filter */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date Range</label>
                                <div className="flex gap-2">
                                    <Select value={selectedDateRange} onValueChange={handleDateRangeSelect}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="Select range" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7">7 days</SelectItem>
                                            <SelectItem value="14">14 days</SelectItem>
                                            <SelectItem value="30">30 days</SelectItem>
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
                                                            `${format(customDateRange.from, 'MMM dd')} - ${format(customDateRange.to, 'MMM dd')}`
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
                                                    selected={{ from: customDateRange.from, to: customDateRange.to }}
                                                    onSelect={(range) => setCustomDateRange(range || {})}
                                                    numberOfMonths={2}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </div>
                            </div>

                            {/* Brand Filter */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Brand</label>
                                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                    <SelectTrigger className="w-48">
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium">AI Model</label>
                                <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Select AI model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {aiModelOptions.map((model) => (
                                            <SelectItem key={model.value} value={model.value}>
                                                {model.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                <Separator />

                {/* Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visibility Chart */}
                    <Card className="col-span-1">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                <div>
                                    <CardTitle>Visibility</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Percentage of chats mentioning each brand
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={visibilityData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey="influencity" 
                                            stroke="#ff6900" 
                                            strokeWidth={2}
                                            name="Influencity"
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="famebit" 
                                            stroke="#ff4444" 
                                            strokeWidth={2}
                                            name="FameBit"
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="amazon" 
                                            stroke="#ffbb33" 
                                            strokeWidth={2}
                                            name="Amazon Creator Connections"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Industry Ranking Table */}
                    <Card className="col-span-1">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5" />
                                <div>
                                    <CardTitle>Industry Ranking</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Brands with highest visibility
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead>Position</TableHead>
                                        <TableHead>Sentiment</TableHead>
                                        <TableHead>Visibility</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {industryRanking.map((item, index) => (
                                        <TableRow key={item.brand}>
                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                            <TableCell className="font-medium">{item.brand}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">#{item.position}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getSentimentColor(item.sentiment)}>
                                                    {item.sentiment}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getVisibilityColor(item.visibility)}>
                                                    {item.visibility}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <PermissionWrapper permission="view-users">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">User Management</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Manage Users</div>
                                <p className="text-xs text-muted-foreground">
                                    View and manage system users
                                </p>
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
                                <p className="text-xs text-muted-foreground">
                                    Access admin functionality
                                </p>
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
                                <p className="text-xs text-muted-foreground">
                                    Manage your settings
                                </p>
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
