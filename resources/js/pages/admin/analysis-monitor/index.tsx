import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, RefreshCw, Activity, Calendar, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Agency {
    id: number;
    name: string;
}

interface Owner {
    id: number;
    name: string;
    email: string;
}

interface Plan {
    selected_option: string;
    trial_ends_at: string | null;
}

interface Brand {
    id: number;
    name: string;
    agency: Agency | null;
    owner: Owner | null;
    plan: Plan;
    total_active_prompts: number;
    last_analysis_date: string | null;
    days_since_analysis: number | null;
    analyzed_this_month: boolean;
}

interface Props {
    brands: Brand[];
    currentMonth: string;
    totalCount: number;
}

export default function AnalysisMonitorIndex({ brands, currentMonth, totalCount }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredBrands = brands.filter((brand) =>
        brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.agency?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.owner?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.plan?.selected_option?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(brand.id).includes(searchTerm)
    );

    const getDaysBadge = (days: number | null) => {
        if (days === null) {
            return <Badge variant="destructive">Never</Badge>;
        }
        if (days > 30) {
            return <Badge variant="destructive">{days} days</Badge>;
        }
        if (days > 14) {
            return <Badge variant="outline" className="text-orange-600 border-orange-300">{days} days</Badge>;
        }
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">{days} days</Badge>;
    };

    return (
        <AppLayout>
            <Head title="Analysis Monitor - Admin" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Analysis Monitor</h1>
                        <p className="text-muted-foreground">
                            Brands with no analysis completed in {currentMonth}
                        </p>
                    </div>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        size="sm"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Stale Brands</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{totalCount}</div>
                            <p className="text-xs text-muted-foreground">
                                No analysis this month
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Never Analyzed</CardTitle>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {brands.filter(b => b.last_analysis_date === null).length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                No analysis ever run
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{currentMonth}</div>
                            <p className="text-xs text-muted-foreground">
                                Showing stale brands
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {totalCount > 0 && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {totalCount} active brand{totalCount !== 1 ? 's' : ''} ha{totalCount !== 1 ? 've' : 's'} not been analyzed in {currentMonth}.
                            Run <code className="font-mono bg-black/10 px-1 rounded">brand:analyze-prompts --all --force</code> to process them.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Search */}
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search by brand name, agency, email, option, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex h-9 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <span className="text-sm text-muted-foreground">
                        Showing {filteredBrands.length} of {totalCount}
                    </span>
                </div>

                {/* Brands Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Brands Missing Analysis
                        </CardTitle>
                        <CardDescription>
                            Active brands with prompts that have not been analyzed in {currentMonth}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredBrands.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                {searchTerm ? 'No brands match your search' : 'All brands have been analyzed this month!'}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Brand Name</TableHead>
                                        <TableHead>Agency</TableHead>
                                        <TableHead>Owner Email</TableHead>
                                        <TableHead>Selected Option</TableHead>
                                        <TableHead>Trial Ends</TableHead>
                                        <TableHead>Active Prompts</TableHead>
                                        <TableHead>Last Analysis</TableHead>
                                        <TableHead>Days Since</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBrands.map((brand) => (
                                        <TableRow key={brand.id}>
                                            <TableCell className="font-mono text-sm">#{brand.id}</TableCell>
                                            <TableCell className="font-medium">{brand.name}</TableCell>
                                            <TableCell>
                                                {brand.agency ? (
                                                    <span className="text-sm">{brand.agency.name}</span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Direct</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {brand.owner ? (
                                                    <span className="text-sm font-mono">{brand.owner.email}</span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs font-mono">
                                                    Option {brand.plan?.selected_option}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {brand.plan?.trial_ends_at ? (
                                                    <span className="text-sm">
                                                        {new Date(brand.plan.trial_ends_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{brand.total_active_prompts}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {brand.last_analysis_date ? (
                                                    <span className="text-sm">
                                                        {new Date(brand.last_analysis_date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Never</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{getDaysBadge(brand.days_since_analysis)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/brands/${brand.id}`}>
                                                        <Button variant="outline" size="sm">
                                                            View
                                                        </Button>
                                                    </Link>
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
        </AppLayout>
    );
}
