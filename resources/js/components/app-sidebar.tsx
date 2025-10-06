import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { LayoutGrid, Users, Shield, Building2, Plus, Settings, FileText, Clock, BarChart3 } from 'lucide-react';
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
                    title: 'Brand List',
                    href: '/brands',
                    icon: Building2,
                },
                {
                    title: 'Add Brand',
                    href: '/brands/create',
                    icon: Plus,
                },
                // We'll add dynamic brand list here later
            ]
        });
        
        items.push({
            title: 'Posts',
            href: '/posts',
            icon: FileText,
        });

        items.push({
            title: 'Search Analytics',
            href: '/search-analytics',
            icon: BarChart3,
        });

        items.push({
            title: 'Competitors',
            href: '/competitors',
            icon: Shield,
        });

        items.push({
            title: 'People',
            href: '/agency/people',
            icon: Users,
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
            items: [
                {
                    title: 'AI Models',
                    href: '/admin/ai-models',
                    icon: Settings,
                },
                {
                    title: 'Posts',
                    href: '/admin/posts',
                    icon: FileText,
                    permission: 'manage-system',
                },
                {
                    title: 'Post Permissions',
                    href: '/admin/post-permissions',
                    icon: Shield,
                    permission: 'manage-system',
                },
                {
                    title: 'Citation Check',
                    href: '/admin/citation-check',
                    icon: FileText,
                    permission: 'manage-citation-check',
                },
                {
                    title: 'Job Monitor',
                    href: '/admin/jobs',
                    icon: Clock,
                    permission: 'view-admin-panel',
                },
                {
                    title: 'System Settings',
                    href: '/admin/settings',
                    icon: Settings,
                    permission: 'manage-system',
                },
            ]
        });
    }

    return items;
};

export function AppSidebar() {
    const permissions = usePermissions();
    const mainNavItems = getMainNavItems(permissions);

    return (
        <Sidebar collapsible="icon" variant="inset" className='left-side-wrapp p-0 rounded-xl'>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <NavUser />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                
                {/* New Brand Button for Agency Users */}
                {/* {permissions.hasRole('agency') && (
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
                )} */}
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>
        </Sidebar>
    );
}
