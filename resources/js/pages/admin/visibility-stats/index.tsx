import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import AppLayout from '@/layouts/app-layout';
import { BarChart3, CalendarDays, RotateCcw, Pencil, Check, X, AlertCircle } from 'lucide-react';

type Stat = {
    id: number;
    entity_type: 'brand' | 'competitor';
    entity_name: string;
    entity_url?: string;
    visibility: number;
    sentiment: number;
    position: number;
    competitor_id?: number;
    has_manual_override: boolean;
    analyzed_at?: string;
};

type DayRow = {
    date: string;
    ai_visibility: number | null;
    manual_visibility: number | null;
    override_reason: string | null;
};

type Agency = { id: number; name: string };
type Brand  = { id: number; name: string; agency_id: number | null };

type Props = {
    agencies: Agency[];
    brands: Brand[];
    stats: Stat[];
    selectedBrand: { id: number; name: string } | null;
    filters: { agency_id?: string; brand_id?: string };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Visibility Stats', href: '/admin/visibility-stats' },
];

export default function AdminVisibilityStatsIndex({ agencies, brands, stats, selectedBrand, filters }: Props) {
    const [drawerOpen, setDrawerOpen]         = useState(false);
    const [drawerStat, setDrawerStat]         = useState<Stat | null>(null);
    const [days, setDays]                     = useState<DayRow[]>([]);
    const [daysLoading, setDaysLoading]       = useState(false);
    const [editingDate, setEditingDate]       = useState<string | null>(null);
    const [editValue, setEditValue]           = useState('');
    const [editReason, setEditReason]         = useState('');
    const [saving, setSaving]                 = useState(false);

    const { data: filterData, setData: setFilterData, processing } = useForm({
        agency_id: filters.agency_id || 'all',
        brand_id:  filters.brand_id  || 'all',
    });

    const filteredBrands = filterData.agency_id && filterData.agency_id !== 'all'
        ? brands.filter(b => b.agency_id != null && b.agency_id.toString() === filterData.agency_id)
        : brands;

    const handleFilter = () => {
        router.get('/admin/visibility-stats', {
            agency_id: filterData.agency_id === 'all' ? '' : filterData.agency_id,
            brand_id:  filterData.brand_id  === 'all' ? '' : filterData.brand_id,
        }, { preserveState: true, preserveScroll: true });
    };

    const clearFilters = () => {
        setFilterData({ agency_id: 'all', brand_id: 'all' });
        router.get('/admin/visibility-stats');
    };

    const openDailyDrawer = async (stat: Stat) => {
        setDrawerStat(stat);
        setEditingDate(null);
        setDrawerOpen(true);
        setDaysLoading(true);
        try {
            const params = new URLSearchParams({
                brand_id:    selectedBrand!.id.toString(),
                entity_type: stat.entity_type,
                days:        '30',
            });
            if (stat.competitor_id) params.set('competitor_id', stat.competitor_id.toString());
            const res  = await fetch(`/admin/visibility-stats/daily?${params}`);
            const data = await res.json();
            setDays(data.days);
        } catch {
            toast.error('Failed to load daily data.');
        } finally {
            setDaysLoading(false);
        }
    };

    const startEdit = (day: DayRow) => {
        setEditingDate(day.date);
        setEditValue((day.manual_visibility ?? day.ai_visibility ?? '').toString());
        setEditReason(day.override_reason ?? '');
    };

    const cancelEdit = () => { setEditingDate(null); setEditValue(''); setEditReason(''); };

    const saveEdit = async (day: DayRow) => {
        if (!drawerStat || !selectedBrand) return;
        setSaving(true);
        try {
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const res  = await fetch('/admin/visibility-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
                body: JSON.stringify({
                    brand_id:        selectedBrand.id,
                    entity_type:     drawerStat.entity_type,
                    competitor_id:   drawerStat.competitor_id ?? null,
                    entity_name:     drawerStat.entity_name,
                    entity_url:      drawerStat.entity_url ?? null,
                    date:            day.date,
                    visibility:      parseFloat(editValue),
                    override_reason: editReason || null,
                }),
            });
            if (!res.ok) throw new Error();
            setDays(prev => prev.map(d => d.date === day.date
                ? { ...d, manual_visibility: parseFloat(editValue), override_reason: editReason || null }
                : d));
            cancelEdit();
            toast.success('Day override saved.');
            router.reload({ only: ['stats'] });
        } catch {
            toast.error('Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const resetDay = async (day: DayRow) => {
        if (!drawerStat || !selectedBrand) return;
        if (!confirm(`Remove manual override for ${day.date}?`)) return;
        const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        await fetch('/admin/visibility-stats/reset', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
            body: JSON.stringify({
                brand_id:      selectedBrand.id,
                entity_type:   drawerStat.entity_type,
                competitor_id: drawerStat.competitor_id ?? null,
                date:          day.date,
            }),
        });
        setDays(prev => prev.map(d => d.date === day.date
            ? { ...d, manual_visibility: null, override_reason: null }
            : d));
        toast.success('Override removed.');
        router.reload({ only: ['stats'] });
    };

    const resetAll = async (stat: Stat) => {
        if (!selectedBrand) return;
        if (!confirm(`Remove ALL manual overrides for "${stat.entity_name}"?`)) return;
        const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        await fetch('/admin/visibility-stats/reset', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
            body: JSON.stringify({
                brand_id:      selectedBrand.id,
                entity_type:   stat.entity_type,
                competitor_id: stat.competitor_id ?? null,
            }),
        });
        toast.success('All overrides removed.');
        router.reload({ only: ['stats'] });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Visibility Stats" />
            <div className="space-y-6">
                <HeadingSmall
                    title="Visibility Stats"
                    description="Set manual visibility values for specific days. The average is recalculated automatically."
                />

                {/* Filters */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-2">
                                <Label>Agency</Label>
                                <Select value={filterData.agency_id} onValueChange={v => { setFilterData('agency_id', v); setFilterData('brand_id', 'all'); }}>
                                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="All agencies" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All agencies</SelectItem>
                                        {agencies.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Brand</Label>
                                <Select value={filterData.brand_id} onValueChange={v => setFilterData('brand_id', v)}>
                                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select a brand" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Select a brand</SelectItem>
                                        {filteredBrands.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleFilter} disabled={processing} style={{ backgroundColor: 'var(--orange-1)' }}>Load Stats</Button>
                            <Button variant="outline" onClick={clearFilters}>Clear</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Entity table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                {selectedBrand ? `${selectedBrand.name} — Current Averages` : 'Select a brand to view stats'}
                            </div>
                            {selectedBrand && stats.length > 0 && (() => {
                                const overrideCount = stats.filter(s => s.has_manual_override).length;
                                return overrideCount > 0 ? (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {overrideCount} {overrideCount === 1 ? 'entity' : 'entities'} with overrides
                                    </Badge>
                                ) : null;
                            })()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedBrand ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">Choose a brand above and click "Load Stats".</p>
                        ) : stats.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">No stats found. Run an analysis first.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Entity</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Visibility (avg)</TableHead>
                                        <TableHead>Overrides</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.map(stat => (
                                        <TableRow key={stat.id}>
                                            <TableCell>
                                                <div className="font-medium text-sm">{stat.entity_name}</div>
                                                {stat.entity_url && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{stat.entity_url.replace(/^https?:\/\//, '')}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={stat.entity_type === 'brand' ? 'default' : 'secondary'} className="capitalize">{stat.entity_type}</Badge>
                                            </TableCell>
                                            <TableCell className="font-semibold">{stat.visibility.toFixed(1)}%</TableCell>
                                            <TableCell>
                                                {stat.has_manual_override
                                                    ? <Badge className="bg-amber-100 text-amber-800 border-amber-200">Has manual days</Badge>
                                                    : <span className="text-xs text-muted-foreground">AI only</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className={`h-8 px-2 text-xs gap-1 ${stat.has_manual_override ? 'text-amber-700 hover:text-amber-800' : ''}`}
                                                        onClick={() => openDailyDrawer(stat)}
                                                    >
                                                        <CalendarDays className="h-3.5 w-3.5" />
                                                        Edit Days
                                                        {stat.has_manual_override && (
                                                            <AlertCircle className="h-3 w-3 text-amber-600" />
                                                        )}
                                                    </Button>
                                                    {stat.has_manual_override && (
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Reset all overrides" onClick={() => resetAll(stat)}>
                                                            <RotateCcw className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Daily breakdown drawer */}
            <Drawer open={drawerOpen} onOpenChange={open => { setDrawerOpen(open); if (!open) cancelEdit(); }} direction="right">
                <DrawerContent className="h-screen ml-auto fixed top-0 bottom-0 right-0 flex flex-col mt-0 rounded-none" style={{ width: '40%' }}>
                    <DrawerHeader>
                        <DrawerTitle className="flex items-center justify-between">
                            <span>Daily Values — {drawerStat?.entity_name}</span>
                            {!daysLoading && (() => {
                                const overriddenCount = days.filter(d => d.manual_visibility !== null).length;
                                return overriddenCount > 0 ? (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {overriddenCount} {overriddenCount === 1 ? 'day' : 'days'} overridden
                                    </Badge>
                                ) : null;
                            })()}
                        </DrawerTitle>
                        <p className="text-sm text-muted-foreground">Edit individual days. The period average updates automatically.</p>
                    </DrawerHeader>

                    <div className="flex-1 overflow-y-auto px-4">
                        {daysLoading ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>AI Value</TableHead>
                                        <TableHead>Manual</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {days.map(day => (
                                        <TableRow key={day.date} className={day.manual_visibility !== null ? 'bg-amber-50' : ''}>
                                            <TableCell className="text-sm font-mono">{day.date}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {day.ai_visibility !== null ? `${day.ai_visibility}%` : '—'}
                                            </TableCell>
                                            <TableCell>
                                                {editingDate === day.date ? (
                                                    <div className="space-y-1">
                                                        <Input
                                                            type="number" min="0" max="100" step="0.01"
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            className="h-7 w-24 text-sm"
                                                            autoFocus
                                                        />
                                                        <Input
                                                            placeholder="Reason (optional)"
                                                            value={editReason}
                                                            onChange={e => setEditReason(e.target.value)}
                                                            className="h-7 text-xs"
                                                        />
                                                    </div>
                                                ) : (
                                                    day.manual_visibility !== null
                                                        ? <span className="text-sm font-semibold text-amber-700">{day.manual_visibility}%</span>
                                                        : <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingDate === day.date ? (
                                                    <div className="flex gap-1">
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(day)} disabled={saving}>
                                                            <Check className="h-3.5 w-3.5 text-green-600" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEdit}>
                                                            <X className="h-3.5 w-3.5 text-red-500" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1">
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(day)} title="Edit">
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        {day.manual_visibility !== null && (
                                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => resetDay(day)} title="Remove override">
                                                                <RotateCcw className="h-3.5 w-3.5 text-red-500" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <DrawerFooter>
                        <DrawerClose asChild><Button variant="outline">Close</Button></DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </AppLayout>
    );
}
