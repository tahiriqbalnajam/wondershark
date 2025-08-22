import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle, Clock, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface JobStats {
    total_jobs: number;
    failed_jobs: number;
    processed_today: number;
}

interface Job {
    id: string;
    queue: string;
    job_name: string;
    attempts: number;
    created_at: string;
    available_at: string;
    status: string;
}

interface FailedJob {
    id: string;
    uuid: string;
    connection: string;
    queue: string;
    job_name: string;
    exception: string;
    failed_at: string;
}

interface CompletedJob {
    job_name: string;
    post_id?: string;
    completed_at: string;
    status: string;
}

interface Props {
    stats: JobStats;
    jobs: Job[];
    failedJobs: FailedJob[];
    completedJobs: CompletedJob[];
}

export default function JobsIndex({ stats, jobs, failedJobs, completedJobs }: Props) {
    const [loading, setLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'failed' | 'completed'>('pending');

    const handleRetry = async (jobId: string) => {
        setLoading(`retry-${jobId}`);
        try {
            await router.post(`/admin/jobs/${jobId}/retry`);
            toast.success('Job queued for retry');
            router.reload();
        } catch {
            toast.error('Failed to retry job');
        } finally {
            setLoading(null);
        }
    };

    const handleDelete = async (jobId: string) => {
        if (!confirm('Are you sure you want to delete this failed job?')) return;
        
        setLoading(`delete-${jobId}`);
        try {
            await router.delete(`/admin/jobs/${jobId}`);
            toast.success('Job deleted successfully');
            router.reload();
        } catch {
            toast.error('Failed to delete job');
        } finally {
            setLoading(null);
        }
    };

    const handleClear = async (type: 'failed' | 'pending') => {
        const message = type === 'failed' ? 'all failed jobs' : 'all pending jobs';
        if (!confirm(`Are you sure you want to clear ${message}?`)) return;
        
        setLoading(`clear-${type}`);
        try {
            await router.post('/admin/jobs/clear', { type });
            toast.success(`Cleared ${message} successfully`);
            router.reload();
        } catch {
            toast.error(`Failed to clear ${message}`);
        } finally {
            setLoading(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case 'completed':
                return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
            case 'failed':
                return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <AppLayout>
            <Head title="Job Monitor - Admin" />
            
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Job Monitor</h1>
                        <p className="text-muted-foreground">
                            Monitor and manage background jobs including prompt generation
                        </p>
                    </div>
                    <Button
                        onClick={() => router.reload()}
                        variant="outline"
                        size="sm"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_jobs}</div>
                            <p className="text-xs text-muted-foreground">
                                Jobs waiting to be processed
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{stats.failed_jobs}</div>
                            <p className="text-xs text-muted-foreground">
                                Jobs that failed processing
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Processed Today</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.processed_today}</div>
                            <p className="text-xs text-muted-foreground">
                                Jobs processed today
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Job Status Alert */}
                {stats.failed_jobs > 0 && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            You have {stats.failed_jobs} failed jobs that may need attention. 
                            Check the Failed Jobs tab to review and retry them.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Job Tables */}
                <div className="space-y-4">
                    {/* Tab Navigation */}
                    <div className="flex space-x-2 border-b">
                        <Button
                            variant={activeTab === 'pending' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('pending')}
                        >
                            Pending Jobs ({jobs.length})
                        </Button>
                        <Button
                            variant={activeTab === 'failed' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('failed')}
                        >
                            Failed Jobs ({failedJobs.length})
                        </Button>
                        <Button
                            variant={activeTab === 'completed' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('completed')}
                        >
                            Recently Completed ({completedJobs.length})
                        </Button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'pending' && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Pending Jobs</CardTitle>
                                    <CardDescription>Jobs waiting to be processed by the queue worker</CardDescription>
                                </div>
                                {jobs.length > 0 && (
                                    <Button
                                        onClick={() => handleClear('pending')}
                                        variant="outline"
                                        size="sm"
                                        disabled={loading === 'clear-pending'}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Clear All
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {jobs.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        No pending jobs
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Job Name</TableHead>
                                                <TableHead>Queue</TableHead>
                                                <TableHead>Attempts</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead>Available At</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {jobs.map((job) => (
                                                <TableRow key={job.id}>
                                                    <TableCell className="font-medium">{job.job_name}</TableCell>
                                                    <TableCell>{job.queue}</TableCell>
                                                    <TableCell>{job.attempts}</TableCell>
                                                    <TableCell>{job.created_at}</TableCell>
                                                    <TableCell>{job.available_at}</TableCell>
                                                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'failed' && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Failed Jobs</CardTitle>
                                    <CardDescription>Jobs that failed during processing</CardDescription>
                                </div>
                                {failedJobs.length > 0 && (
                                    <Button
                                        onClick={() => handleClear('failed')}
                                        variant="outline"
                                        size="sm"
                                        disabled={loading === 'clear-failed'}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Clear All
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {failedJobs.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        No failed jobs
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Job Name</TableHead>
                                                <TableHead>Queue</TableHead>
                                                <TableHead>Exception</TableHead>
                                                <TableHead>Failed At</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {failedJobs.map((job) => (
                                                <TableRow key={job.id}>
                                                    <TableCell className="font-medium">{job.job_name}</TableCell>
                                                    <TableCell>{job.queue}</TableCell>
                                                    <TableCell className="max-w-md truncate">{job.exception}</TableCell>
                                                    <TableCell>{job.failed_at}</TableCell>
                                                    <TableCell>
                                                        <div className="flex space-x-2">
                                                            <Button
                                                                onClick={() => handleRetry(job.id)}
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={loading === `retry-${job.id}`}
                                                            >
                                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                                Retry
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDelete(job.id)}
                                                                size="sm"
                                                                variant="destructive"
                                                                disabled={loading === `delete-${job.id}`}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'completed' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Recently Completed Jobs</CardTitle>
                                <CardDescription>Jobs that have been processed successfully</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {completedJobs.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        No recent completed jobs
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Job Name</TableHead>
                                                <TableHead>Post ID</TableHead>
                                                <TableHead>Completed At</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {completedJobs.map((job, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{job.job_name}</TableCell>
                                                    <TableCell>{job.post_id || '-'}</TableCell>
                                                    <TableCell>{job.completed_at}</TableCell>
                                                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
