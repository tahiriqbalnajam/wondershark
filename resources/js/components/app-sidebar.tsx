import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { LogOut } from 'lucide-react';
import { Link, router} from '@inertiajs/react';
import { 
    LayoutGrid, 
    Users, 
    Shield, 
    Settings, 
    FileText, 
    Clock, 
    BarChart3, 
    MessageSquare, 
    Package, 
    Building2
} from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

const getGeneralNavItems = (permissions: ReturnType<typeof usePermissions>, selectedBrandId?: number, isRankingPage?: boolean): NavItem[] => {
    const items: NavItem[] = [];

    // Dashboard - available to all authenticated users
    if (permissions.can('viewDashboard')) {
        items.push({
            title: 'Dashboard',
            href: selectedBrandId ? `/brands/${selectedBrandId}` : '/dashboard',
            icon: LayoutGrid,
            permission: 'view-dashboard',
            alwaysOpenSubmenu: true,
            items: selectedBrandId && isRankingPage
                ? [
                    {
                        title: 'Ranking',
                        href: `/brands/${selectedBrandId}/ranking`,
                        icon: BarChart3,
                        // isActive: isRankingPage,
                    },
                ]
                : [],
        });
    }

    // Ranking - only show if brand is selected
    // if (selectedBrandId) {
    //     items.push({
    //         title: 'Ranking',
    //         href: `/brands/${selectedBrandId}/ranking`,
    //         icon: BarChart3,
    //     });
    // }

    // Posts - only for agency users
    if (permissions.hasRole('agency')) {
        items.push({
            title: 'Posts',
            href: selectedBrandId ? `/brands/${selectedBrandId}/posts` : '/posts',
            icon: FileText,
        });
    }

    // Search Analytics - for admin users
    if (permissions.hasRole('admin')) {
        items.push({
            title: 'Search Analytics',
            href: '/search-analytics',
            icon: BarChart3,
        });
    }

    return items;
};

const getPreferenceNavItems = (permissions: ReturnType<typeof usePermissions>, selectedBrandId?: number): NavItem[] => {
    const items: NavItem[] = [];

    // Only show for agency users
    if (permissions.hasRole('agency')) {
        items.push({
            title: 'Competitors',
            href: selectedBrandId ? `/brands/${selectedBrandId}/competitors` : '/competitors',
            icon: Shield,
        });

        items.push({
            title: 'Prompts',
            href: selectedBrandId ? `/brands/${selectedBrandId}/prompts` : '/prompts',
            icon: MessageSquare,
        });
    }

    return items;
};

const getSettingsNavItems = (permissions: ReturnType<typeof usePermissions>, selectedBrandId?: number): NavItem[] => {
    const items: NavItem[] = [];

    // People - for agency users
    if (permissions.hasRole('agency')) {
        items.push({
            title: 'People',
            href: '/agency/people',
            icon: Users,
        });

        items.push({
            title: 'Brand',
            href: selectedBrandId ? `/brands/${selectedBrandId}/edit` : '/brands',
            icon: Package,
        });

        items.push({
            title: 'Agency',
            href: '/settings/agency',
            icon: Building2,
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

    // Agencies - only for admin users
    if (permissions.hasRole('admin')) {
        items.push({
            title: 'Agencies',
            href: '/admin/agencies',
            icon: Building2,
        });
    }

    // Individual Brands - only for admin users
    if (permissions.hasRole('admin')) {
        items.push({
            title: 'Individual Brands',
            href: '/admin/brands',
            icon: Package,
        });
    }

    // Admin Panel - only for admin users (skip for agency and brand)
    if (permissions.can('viewAdminPanel') && permissions.hasRole('admin')) {
        items.push({
            title: 'Admin Panel',
            href: '/admin',
            icon: Settings,
            permission: 'view-admin-panel',
            items: [
                {
                    title: 'AI Models',
                    href: '/admin/ai-models',
                    icon: Settings,
                },
                {
                    title: 'Prompts',
                    href: '/admin/prompts',
                    icon: MessageSquare,
                    permission: 'view-admin-panel',
                },
                {
                    title: 'Competitors',
                    href: '/admin/competitors',
                    icon: Shield,
                    permission: 'view-admin-panel',
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

const getDocsFilesNavItems = (permissions: ReturnType<typeof usePermissions>): NavItem[] => {
    const items: NavItem[] = [];

    // Docs & Files - available to all authenticated users
    items.push({
        title: 'Docs & Files',
        href: '/docs-files',
        icon: FileText,
    });

    return items;
};

const getOrderNavItems = (permissions: ReturnType<typeof usePermissions>, selectedBrandId?: number): NavItem[] => {
    const items: NavItem[] = [];
    if (permissions.hasRole('agency')) {
        items.push({
            title: 'Paid PR',
            href: selectedBrandId ? `/brands/${selectedBrandId}/orders` : '/orders',
            icon: FileText,
        });
    }
    return items;
};

export function AppSidebar() {
    const cleanup = useMobileNavigation();
    const handleLogout = () => {
            cleanup();
            // router.flushAll();
        };
    const permissions = usePermissions();
    const page = usePage<SharedData>();
    const isRankingPage = page.url.includes('/ranking');
    // Extract brand ID from current URL path
    const getCurrentBrandId = (): number | undefined => {
        const path = page.url;
        const match = path.match(/\/brands\/(\d+)/);
        return match ? parseInt(match[1], 10) : undefined;
    };
    
    const currentBrandId = getCurrentBrandId();
    const selectedBrand = page.props.selectedBrand;
    
    // Prioritize currentBrandId from URL over selectedBrand from session
    // This ensures menu links update immediately when switching brands
    const brandIdForMenu = currentBrandId || selectedBrand?.id;
    
    const generalNavItems = getGeneralNavItems(permissions, brandIdForMenu, isRankingPage);
    const preferenceNavItems = getPreferenceNavItems(permissions, brandIdForMenu);
    const settingsNavItems = getSettingsNavItems(permissions, brandIdForMenu);
    const orderNavItems = getOrderNavItems(permissions, brandIdForMenu);
    const docsFilesNavItems = getDocsFilesNavItems(permissions);

    return (
        <Sidebar collapsible="icon" variant="inset" className='left-side-wrapp p-0 rounded-xl'>
            <SidebarHeader>
                {!permissions.hasRole('brand') && <NavUser />}
                
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
                {/* General Section */}
                {generalNavItems.length > 0 && (
                    <NavMain items={generalNavItems} label="General" />
                )}
                
                {/* Preference Section */}
                {preferenceNavItems.length > 0 && (
                    <NavMain items={preferenceNavItems} label="Preference" />
                )}
                
                {/* Docs & Files Section */}
                {docsFilesNavItems.length > 0 && (
                    <NavMain items={docsFilesNavItems} label="Docs & Files" />
                )}
                
                {/* Settings Section */}
                {settingsNavItems.length > 0 && (
                    <NavMain items={settingsNavItems} label="Settings" />
                )}
                {orderNavItems.length > 0 && (
                    <NavMain items={orderNavItems} label="Order" />
                )}
                {permissions.hasRole('brand') && (
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        onClick={handleLogout}
                        className="ml-4  flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Link>
                )}
            </SidebarContent>
        </Sidebar>
    );
}
