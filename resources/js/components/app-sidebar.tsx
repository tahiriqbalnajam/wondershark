import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { LogOut } from 'lucide-react';
import { Link, router } from '@inertiajs/react';
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
    Building2,
    Terminal
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



const agency_member_rights = permissions.user?.agency_membership?.rights;

    // Posts - for agency and brand users, brand users must have brand ID
    if (permissions.hasAnyRole(['agency', 'brand']) && selectedBrandId) {
        items.push({
            title: 'Posts',
            href: `/brands/${selectedBrandId}/posts`,
            icon: FileText,
        });
    }

    if (permissions.hasAnyRole(['agency_manager', 'agency_member']) && selectedBrandId) { //// role is only agency_member
        if(agency_member_rights == "agency_manager" || agency_member_rights == "agency_admin" || agency_member_rights == "brand_user"){
            items.push({
                title: 'Posts',
                href: `/brands/${selectedBrandId}/posts`,
                icon: FileText,
            });
        }
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
    const agency_member_rights = permissions.user?.agency_membership?.rights;
    // Show for agency and brand users, brand users must have brand ID
    if (permissions.hasAnyRole(['agency', 'brand']) && selectedBrandId) {
        items.push({
            title: 'Competitors',
            href: `/brands/${selectedBrandId}/competitors`,
            icon: Shield,
        });

        items.push({
            title: 'Prompts',
            href: `/brands/${selectedBrandId}/prompts`,
            icon: MessageSquare,
        });
    }


     if (permissions.hasAnyRole(['agency_manager', 'agency_member']) && selectedBrandId) { //// role is only agency_member
        if(agency_member_rights == "agency_manager" || agency_member_rights == "agency_admin"){
            items.push({
                title: 'Competitors',
                href: `/brands/${selectedBrandId}/competitors`,
                icon: Shield,
            });

            items.push({
                title: 'Prompts',
                href: `/brands/${selectedBrandId}/prompts`,
                icon: MessageSquare,
            });
        }
    }


   


    return items;
};

const getSettingsNavItems = (permissions: ReturnType<typeof usePermissions>, selectedBrandId?: number): NavItem[] => {
    const items: NavItem[] = [];

    // People - for agency only
    if (permissions.hasRole('agency')) {
        items.push({
            title: 'People',
            href: '/agency/people',
            icon: Users,
        });
    }


     const agency_member_rights = permissions.user?.agency_membership?.rights;
     if (permissions.hasAnyRole(['agency_admin', 'agency_member']) && selectedBrandId) { //// role is only agency_member
        if(agency_member_rights == "agency_admin"){
            items.push({
                title: 'People',
                href: '/agency/people',
                icon: Users,
            });
        }
    }


    // Brand - for agency and brand users, brand users must have brand ID
    if (permissions.hasAnyRole(['agency', 'brand']) && selectedBrandId) {
        items.push({
            title: 'Brand',
            href: `/brands/${selectedBrandId}/edit`,
            icon: Package,
        });
    }


     if (permissions.hasAnyRole(['agency_admin', 'agency_member']) && selectedBrandId) { //// role is only agency_member
        if(agency_member_rights == "agency_admin"){
            items.push({
                title: 'Brand',
                href: `/brands/${selectedBrandId}/edit`,
                icon: Package,
            });
        }
    }

    // Agency settings - only for agency users
    if (permissions.hasRole('agency')) {
        items.push({
            title: 'Agency',
            href: '/settings/agency',
            icon: Building2,
        });
    }

 
     //if (permissions.hasAnyRole(['agency_admin', 'agency_member']) && selectedBrandId) { //// role is only agency_member
   //     if(agency_member_rights == "agency_admin"){
    //        items.push({
    //            title: 'Agency',
    //            href: '/settings/agency',
      //          icon: Building2,
     //       });
      //  }
   // }

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
                    title: 'Console Commands',
                    href: '/admin/console',
                    icon: Terminal,
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
    // if (permissions.hasRole('agency')) {
    //     items.push({
    //         title: 'Paid PR',
    //         href: selectedBrandId ? `/brands/${selectedBrandId}/orders` : '/orders',
    //         icon: FileText,
    //     });
    // }
    return items;
};

export function AppSidebar() {
    const cleanup = useMobileNavigation();
    const handleLogout = () => {
        cleanup();
        // router.flushAll();
    };
    const permissions = usePermissions();

    //console.log('permissions:', permissions);

    //const membership_rights = permissions.user?.agency_membership?.rights);




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
    const user = page.props.auth.user;
    const brands = page.props.brands || [];

    // For brand role users, use their assigned brand (first brand in the list)
    // For agency/admin users, prioritize currentBrandId from URL over selectedBrand from session
    let brandIdForMenu: number | undefined;
    if (permissions.hasRole('brand') && brands.length > 0) {
        brandIdForMenu = brands[0].id;
    } else {
        brandIdForMenu = currentBrandId || selectedBrand?.id;
    }

    const generalNavItems = getGeneralNavItems(permissions, brandIdForMenu, isRankingPage);
    const preferenceNavItems = getPreferenceNavItems(permissions, brandIdForMenu);
    const settingsNavItems = getSettingsNavItems(permissions, brandIdForMenu);
    const orderNavItems = getOrderNavItems(permissions, brandIdForMenu);
    const docsFilesNavItems = getDocsFilesNavItems(permissions);

    return (
        <Sidebar>
            <SidebarHeader>
                <NavUser />

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
            </SidebarContent>
        </Sidebar>
    );
}
