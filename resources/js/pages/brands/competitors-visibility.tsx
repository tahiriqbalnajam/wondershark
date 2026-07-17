import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import {
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Trophy,
    TrendingUp,
    TrendingDown,
    ArrowLeft,
} from 'lucide-react';

interface ReportEntity {
    entity_type: 'brand' | 'competitor';
    entity_name: string;
    entity_domain: string;
    competitor_id: number | null;
    current_period: {
        visibility: number | null;
        sentiment: number | null;
        position: number | null;
    };
    previous_period: {
        visibility: number | null;
        sentiment: number | null;
        position: number | null;
    };
    changes: {
        visibility_change_pct: number | null;
        sentiment_change_pct: number | null;
        position_change: number | null;
        visibility_trend: 'up' | 'down' | 'stable';
        sentiment_trend: 'up' | 'down' | 'stable';
        position_trend: 'up' | 'down' | 'stable';
    };
    has_data: boolean;
}

interface ReportData {
    brand: {
        id: number;
        name: string;
        website: string;
    };
    report_period: {
        current_week_start: string;
        current_week_end: string;
        previous_week_start: string;
        previous_week_end: string;
    };
    entities: ReportEntity[];
}

interface Props {
    brand: {
        id: number;
        name: string;
        website: string;
        logo?: string;
    };
    reportData: ReportData;
    days: number;
    brandColor: string | null;
}

export default function BrandCompetitors({ brand, reportData, days, brandColor }: Props) {
    const [selectedDays, setSelectedDays] = useState(String(days));

    const agencyColor = brandColor || 'var(--agency-color, #16a34a)';

    const getBrowserTimezone = () => {
        const offset = -new Date().getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
        const hours = pad(Math.floor(Math.abs(offset) / 60));
        const minutes = pad(Math.abs(offset) % 60);
        return `${sign}${hours}:${minutes}`;
    };

    const handleDateRangeChange = (value: string) => {
        setSelectedDays(value);
        router.get(route('brands.competitors-visibility', brand.id), { days: value, timezone: getBrowserTimezone() }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['reportData', 'days'],
        });
    };

    useEffect(() => {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('timezone')) {
            router.get(route('brands.competitors-visibility', brand.id), { days: selectedDays, timezone: getBrowserTimezone() }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['reportData'],
            });
        }
    }, []);

    const brandEntity = reportData?.entities?.find(e => e.entity_type === 'brand');
    const competitorEntities = reportData?.entities?.filter(e => e.entity_type === 'competitor') || [];

    const allEntities = [brandEntity, ...competitorEntities].filter(Boolean) as ReportEntity[];

    const TrendBadge = ({ trend, value, suffix = '' }: { trend: string; value: number | null; suffix?: string }) => {
        if (value === null) return <span className="text-muted-foreground text-sm">N/A</span>;

        const isPositive = trend === 'up';
        const isNegative = trend === 'down';
        const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;
        const colorClass = isPositive ? 'text-green-600' : isNegative ? 'text-red-500' : 'text-gray-500';

        return (
            <div className="flex items-center gap-1" style={{ color: isPositive ? agencyColor : undefined }}>
                <Icon className={`w-4 h-4 ${colorClass}`} style={{ color: isPositive ? agencyColor : undefined }} />
                <span className="font-medium text-sm" style={{ color: isPositive ? agencyColor : undefined }}>
                    {isPositive ? '+' : ''}{value.toFixed(1)}{suffix}
                </span>
            </div>
        );
    };

    return (
        <AppLayout>
            <Head title={`Competitors - ${brand.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link href={route('brands.weekly-report', brand.id)}>
                                <Button variant="ghost" size="sm" className="gap-1">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Weekly Report
                                </Button>
                            </Link>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Trophy className="w-6 h-6" style={{ color: agencyColor }} />
                            Competitor Visibility
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {brand.name} — {reportData?.report_period?.current_week_start} to {reportData?.report_period?.current_week_end}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={selectedDays} onValueChange={handleDateRangeChange}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">7 days</SelectItem>
                                <SelectItem value="14">14 days</SelectItem>
                                <SelectItem value="30">30 days</SelectItem>
                                <SelectItem value="60">60 days</SelectItem>
                                <SelectItem value="90">90 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Full Competitor Table */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-muted-foreground" />
                            All Competitors ({allEntities.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {allEntities.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No competitor data available for this period.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Competitor</TableHead>
                                        <TableHead>Visibility Change</TableHead>
                                        <TableHead>Current Visibility</TableHead>
                                        <TableHead>Position</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allEntities.map((entity) => (
                                        <TableRow
                                            key={entity.competitor_id ?? 'brand'}
                                            className={entity.entity_type === 'brand' ? 'bg-blue-50/40' : ''}
                                        >
                                            <TableCell className="text-sm font-medium">
                                                {entity.entity_name}
                                                {entity.entity_type === 'brand' && (
                                                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Brand</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <TrendBadge
                                                    trend={entity.changes.visibility_trend}
                                                    value={entity.changes.visibility_change_pct}
                                                    suffix="%"
                                                />
                                            </TableCell>
                                            <TableCell className="text-sm font-bold" style={{ color: entity.entity_type === 'brand' ? agencyColor : undefined }}>
                                                {entity.current_period.visibility?.toFixed(0) ?? 0}%
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                                #{entity.current_period.position?.toFixed(0) ?? '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
