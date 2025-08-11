import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, Users, Shield, Building2, Plus, Settings } from 'lucide-react';
import AppLogo from './app-logo';
import AgencyLogo from './agency-logo';
import { usePermissions } from '@/hooks/use-permissions';

const getMainNavItems = (permissions: ReturnType<typeof usePermissions>): NavItem[] => {
    const items: NavItem[] = [];

    // Dashboard - available to all authenticated users
    if (permissions.can('viewDashboard')) {
        items.push({
            title: 'Dashboard',
            href: '/dashboard',
            icon: LayoutGrid,
            permission: 'view-dashboard',
        });
    }

    // Settings - available to all authenticated users
    items.push({
        title: 'Settings',
        href: '/settings',
        icon: Settings,
    });


    // Brands menu - only for agency users
    if (permissions.hasRole('agency')) {
        items.push({
            title: 'Brands',
            href: '/brands',
            icon: Building2,
            items: [
                {
                    title: 'Add Brand',
                    href: '/brands/create',
                    icon: Plus,
                },
                // We'll add dynamic brand list here later
            ]
        });
    }

    // User Management - only for admin users (skip for agency and brand)
    if (permissions.can('viewUsers') && permissions.hasRole('admin')) {
        items.push({
            title: 'User Management',
            href: '/users',
            icon: Users,
            permission: 'view-users',
        });
    }

    // Admin Panel - only for admin users (skip for agency and brand)
    if (permissions.can('viewAdminPanel') && permissions.hasRole('admin')) {
        items.push({
            title: 'Admin Panel',
            href: '/admin',
            icon: Shield,
            permission: 'view-admin-panel',
        });
    }

    return items;
};

// Remove footer nav items (repository and documentation)
const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const permissions = usePermissions();
    const mainNavItems = getMainNavItems(permissions);
    const { auth } = usePage<SharedData>().props;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                {permissions.hasRole('agency') ? (
                                    <>
                                        <AgencyLogo agencyName={auth.user.name} />
                                        <div className="ml-1 grid flex-1 text-left text-sm">
                                            <span className="mb-0.5 truncate leading-tight font-semibold">{auth.user.name}</span>
                                        </div>
                                    </>
                                ) : (
                                    <AppLogo />
                                )}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                
                {/* New Brand Button for Agency Users */}
                {permissions.hasRole('agency') && (
                    <div className="px-2 mt-2">
                        <Button 
                            asChild 
                            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                            size="sm"
                        >
                            <Link href="/brands/create" prefetch>
                                <Plus className="h-4 w-4" />
                                New Brand
                            </Link>
                        </Button>
                    </div>
                )}
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
                {footerNavItems.length > 0 && <NavFooter items={footerNavItems} className="mt-auto" />}
            </SidebarFooter>
        </Sidebar>
    );
}
