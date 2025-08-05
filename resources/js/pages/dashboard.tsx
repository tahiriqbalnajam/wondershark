import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { usePermissions } from '@/hooks/use-permissions';
import { PermissionWrapper } from '@/components/permission-wrapper';
import { Users, Shield, Settings, BarChart3 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const { roles } = usePermissions();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
                {/* Welcome section */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome to your Dashboard</h1>
                    <p className="text-muted-foreground">
                        You are logged in with {roles.length > 0 ? `roles: ${roles.join(', ')}` : 'no specific roles'}
                    </p>
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

                {/* Statistics/Content Area */}
                <div className="relative min-h-[400px] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="h-5 w-5" />
                            <h2 className="text-xl font-semibold">Dashboard Statistics</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Your Roles</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{roles.length}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Assigned roles
                                    </p>
                                </CardContent>
                            </Card>
                            
                            <PermissionWrapper permission="view-dashboard">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Dashboard Access</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">✓</div>
                                        <p className="text-xs text-muted-foreground">
                                            Access granted
                                        </p>
                                    </CardContent>
                                </Card>
                            </PermissionWrapper>

                            <PermissionWrapper permission="manage-dashboard">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Dashboard Management</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">✓</div>
                                        <p className="text-xs text-muted-foreground">
                                            Management allowed
                                        </p>
                                    </CardContent>
                                </Card>
                            </PermissionWrapper>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Account Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">Active</div>
                                    <p className="text-xs text-muted-foreground">
                                        Account is active
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20 opacity-20 pointer-events-none" />
                </div>
            </div>
        </AppLayout>
    );
}
