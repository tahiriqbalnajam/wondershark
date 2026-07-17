import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Eye,
    Smile,
    FileText,
    Quote,
    Calendar,
    Clock,
    Download,
    Mail,
    Trophy,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    RefreshCw,
    ExternalLink,
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

interface PostItem {
    id: number;
    title: string;
    url: string;
    status: string;
    post_type: string;
    created_at: string;
}

interface Props {
    brand: {
        id: number;
        name: string;
        website: string;
        logo?: string;
    };
    reportData: ReportData;
    posts: PostItem[];
    promptStats: {
        added: number;
        removed: number;
        active: number;
        suggested: number;
    };
    citationStats: {
        brand_citations: number;
        competitor_citations: number;
        top_sources: string[];
    };
    days: number;
    brandColor: string | null;
}

export default function WeeklyReport({ brand, reportData, posts, promptStats, citationStats, days, brandColor }: Props) {
    const [selectedDays, setSelectedDays] = useState(String(days));
    const [isExporting, setIsExporting] = useState(false);
    const [isEmailing, setIsEmailing] = useState(false);

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
        router.get(route('brands.weekly-report', brand.id), { days: value, timezone: getBrowserTimezone() }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['reportData', 'posts', 'promptStats', 'citationStats', 'days'],
        });
    };

    // Ensure timezone is present on initial load so data matches other pages
    useEffect(() => {
        const url = new URL(window.location.href);
        if (! url.searchParams.has('timezone')) {
            router.get(route('brands.weekly-report', brand.id), { days: selectedDays, timezone: getBrowserTimezone() }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['reportData'],
            });
        }
    }, []);

    // Get brand entity from report data
    const brandEntity = reportData?.entities?.find(e => e.entity_type === 'brand');
    const competitorEntities = reportData?.entities?.filter(e => e.entity_type === 'competitor') || [];

    const currentVisibility = brandEntity?.current_period?.visibility ?? 0;
    const previousVisibility = brandEntity?.previous_period?.visibility ?? 0;
    const visibilityChange = brandEntity?.changes?.visibility_change_pct ?? 0;
    const visibilityTrend = brandEntity?.changes?.visibility_trend ?? 'stable';

    const currentSentiment = brandEntity?.current_period?.sentiment ?? 0;
    const previousSentiment = brandEntity?.previous_period?.sentiment ?? 0;
    const sentimentChange = brandEntity?.changes?.sentiment_change_pct ?? 0;
    const sentimentTrend = brandEntity?.changes?.sentiment_trend ?? 'stable';

    // Generate key changes insights
    const keyChanges = useMemo(() => {
        const changes: string[] = [];

        if (brandEntity && brandEntity.has_data) {
            const visChange = brandEntity.changes.visibility_change_pct;
            if (visChange !== null && Math.abs(visChange) > 1) {
                const direction = visChange > 0 ? 'increased' : 'decreased';
                changes.push(`${brand.name} visibility ${direction} from ${previousVisibility}% to ${currentVisibility}%.`);
            }

            const sentChange = brandEntity.changes.sentiment_change_pct;
            if (sentChange !== null && Math.abs(sentChange) > 2) {
                const direction = sentChange > 0 ? 'improved' : 'declined';
                changes.push(`Brand sentiment ${direction} by ${Math.abs(sentChange).toFixed(1)}% over the last ${days} days.`);
            }
        }

        if (posts.length > 0) {
            changes.push(`${posts.length} new post${posts.length !== 1 ? 's' : ''} published across blog and forum sources.`);
        }

        if (promptStats.added > 0) {
            changes.push(`${promptStats.added} new prompt${promptStats.added !== 1 ? 's' : ''} added for brand visibility tracking.`);
        }

        const topCompetitor = competitorEntities
            .filter(c => c.has_data && c.changes.visibility_change_pct !== null)
            .sort((a, b) => (b.changes.visibility_change_pct ?? 0) - (a.changes.visibility_change_pct ?? 0))[0];

        if (topCompetitor && (topCompetitor.changes.visibility_change_pct ?? 0) > 5) {
            changes.push(`${topCompetitor.entity_name} gained significant visibility (+${topCompetitor.changes.visibility_change_pct?.toFixed(1)}%).`);
        }

        if (changes.length === 0) {
            changes.push('No significant changes detected this reporting period.');
        }

        return changes;
    }, [brandEntity, brand.name, previousVisibility, currentVisibility, posts.length, promptStats.added, competitorEntities, days]);

    const handleExportPDF = () => {
        setIsExporting(true);
        setTimeout(() => setIsExporting(false), 2000);
    };

    const handleEmailReport = () => {
        setIsEmailing(true);
        router.post(route('brands.weekly-report.email', brand.id), {}, {
            preserveScroll: true,
            onFinish: () => setIsEmailing(false),
        });
    };

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
            <Head title={`Weekly Report - ${brand.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold tracking-tight">Weekly Report</h1>
                            {brand.logo && (
                                <img src={brand.logo} alt="" className="w-6 h-6 rounded object-contain" />
                            )}
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Updated every week with your latest AI visibility changes and activity summary.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>Next update: {new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
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

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPDF}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        Export as PDF
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleEmailReport}
                        disabled={isEmailing}
                        style={{ backgroundColor: agencyColor, color: 'white' }}
                    >
                        {isEmailing ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Mail className="w-4 h-4 mr-2" />
                        )}
                        Email Report
                    </Button>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Current Visibility */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Current Visibility</p>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: `${agencyColor}20` }}
                                        >
                                            <Eye className="w-6 h-6" style={{ color: agencyColor }} />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold" style={{ color: agencyColor }}>
                                                {currentVisibility.toFixed(0)}%
                                            </p>
                                            <TrendBadge trend={visibilityTrend} value={visibilityChange} suffix="%" />
                                            <p className="text-xs text-muted-foreground mt-1">vs previous {days} days</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sentiment Change */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Sentiment Change</p>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: `${agencyColor}20` }}
                                        >
                                            <Smile className="w-6 h-6" style={{ color: agencyColor }} />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold" style={{ color: agencyColor }}>
                                                {sentimentChange > 0 ? '+' : ''}{sentimentChange.toFixed(0)}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">AI sentiment score</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* New Posts Added */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">New Posts Added</p>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: `${agencyColor}20` }}
                                        >
                                            <FileText className="w-6 h-6" style={{ color: agencyColor }} />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold" style={{ color: agencyColor }}>
                                                {posts.length}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">blogs, forums and UGC</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* New AI Citations */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">New AI Citations</p>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: `${agencyColor}20` }}
                                        >
                                            <Quote className="w-6 h-6" style={{ color: agencyColor }} />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold" style={{ color: agencyColor }}>
                                                {citationStats.brand_citations + citationStats.competitor_citations}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">brand and competitor mentions</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Prompt Changes + Citation Movement */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Prompt Changes */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                                Prompt Changes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[
                                    { label: 'Prompts Added', value: promptStats.added },
                                    { label: 'Prompts Removed', value: promptStats.removed },
                                    { label: 'Active Prompts', value: promptStats.active },
                                    { label: 'Suggested', value: promptStats.suggested },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                                        <span className="text-sm text-muted-foreground">{item.label}</span>
                                        <span className="text-sm font-medium">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Citation Movement */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-muted-foreground" />
                                Citation Movement
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-5">
                                {/* Two big stats side by side */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 rounded-lg bg-gray-50/50">
                                        <p className="text-xs text-muted-foreground mb-1">Brand Citations</p>
                                        <p className="text-2xl font-bold" style={{ color: agencyColor }}>
                                            {citationStats.brand_citations}
                                        </p>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-gray-50/50">
                                        <p className="text-xs text-muted-foreground mb-1">Competitor Citations</p>
                                        <p className="text-2xl font-bold text-blue-500">
                                            {citationStats.competitor_citations}
                                        </p>
                                    </div>
                                </div>

                                {/* Separate bars side by side */}
                                <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-medium" style={{ color: agencyColor }}>Brand Citations</span>
                                            <span className="text-lg font-bold" style={{ color: agencyColor }}>{citationStats.brand_citations}</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(100, (citationStats.brand_citations / Math.max(1, citationStats.brand_citations + citationStats.competitor_citations)) * 100)}%`,
                                                    backgroundColor: agencyColor,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-px bg-gray-200 mx-2" />
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-medium text-blue-500">Competitor Citations</span>
                                            <span className="text-lg font-bold text-blue-500">{citationStats.competitor_citations}</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(100, (citationStats.competitor_citations / Math.max(1, citationStats.brand_citations + citationStats.competitor_citations)) * 100)}%`,
                                                    backgroundColor: '#3b82f6',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Top cited sources */}
                                {citationStats.top_sources.length > 0 && (
                                    <div className="pt-1">
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                                            Top Cited Sources
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {citationStats.top_sources.map((source, i) => (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                                                >
                                                    {source}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {citationStats.brand_citations === 0 && citationStats.competitor_citations === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-2">
                                        No citations recorded for this period.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* New Posts Published + Competitor Visibility Changes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* New Posts Published */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                                New Posts Published
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {posts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No new posts published in the last {days} days.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Publication</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Posted Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {posts.map((post) => (
                                            <TableRow key={post.id}>
                                                <TableCell className="max-w-[200px] truncate text-sm">
                                                    <Link href={post.url} target="_blank" className="hover:underline">
                                                        {post.title}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-xs capitalize">
                                                        {post.post_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={post.status === 'published' ? 'default' : 'secondary'}
                                                        className="text-xs capitalize"
                                                        style={post.status === 'published' ? { backgroundColor: agencyColor } : undefined}
                                                    >
                                                        {post.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(post.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                            {posts.length > 0 && (
                                <div className="mt-4">
                                    <Link href={`/brands/${brand.id}/posts`}>
                                        <Button variant="outline" size="sm">View All Posts</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Competitor Visibility Changes */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                                Competitor Visibility Changes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {competitorEntities.length === 0 ? (
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
                                        {competitorEntities.map((comp) => (
                                            <TableRow key={comp.competitor_id}>
                                                <TableCell className="text-sm font-medium">{comp.entity_name}</TableCell>
                                                <TableCell>
                                                    <TrendBadge
                                                        trend={comp.changes.visibility_trend}
                                                        value={comp.changes.visibility_change_pct}
                                                        suffix="%"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {comp.current_period.visibility?.toFixed(0) ?? 0}%
                                                </TableCell>
                                                <TableCell className="text-sm font-medium">
                                                    #{comp.current_period.position?.toFixed(0) ?? '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                            {competitorEntities.length > 0 && (
                                <div className="mt-4">
                                    <Link href={`/brands/${brand.id}/competitors-visibility?days=${selectedDays}&timezone=${encodeURIComponent(getBrowserTimezone())}`}>
                                        <Button variant="outline" size="sm">View All Competitors</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Key Changes This Week */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <StarIcon agencyColor={agencyColor} />
                            Key Changes This Week
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {keyChanges.map((change, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <CheckCircle2
                                        className="w-5 h-5 mt-0.5 shrink-0"
                                        style={{ color: agencyColor }}
                                    />
                                    <p className="text-sm text-muted-foreground">{change}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function StarIcon({ agencyColor }: { agencyColor: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    );
}
