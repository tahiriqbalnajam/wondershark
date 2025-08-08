import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, Users, Shield, Building2, Plus } from 'lucide-react';
import AppLogo from './app-logo';
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

    // My Page - available to all authenticated users
    items.push({
        title: 'My Page',
        href: '/mypage',
        icon: LayoutGrid,
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

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const permissions = usePermissions();
    const mainNavItems = getMainNavItems(permissions);

    return (
        <Sidebar collapsible="icon" variant="inset">
            {/* <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader> */}

            <SidebarFooter>
                <NavUser />
                <NavFooter items={footerNavItems} className="mt-auto" />
            </SidebarFooter>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>
        </Sidebar>
    );
}
