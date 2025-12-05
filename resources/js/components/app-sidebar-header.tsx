import { Breadcrumbs } from '@/components/breadcrumbs';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { usePage } from '@inertiajs/react';

// Import all icons you might use
import { UserCheck, LayoutDashboard, Settings, BarChart3, Users,FileDown,Menu,UnfoldHorizontal } from 'lucide-react';
import { JSX } from 'react';

export function AppSidebarHeader({ breadcrumbs = [], title }: { breadcrumbs?: BreadcrumbItemType[], title?: string }) {
    const { url } = usePage(); // Current route path

    // Map route → icon
    const iconMap: Record<string, JSX.Element> = {
        '/dashboard': <LayoutDashboard className="w-5 h-5" />,
        '/search-analytics': <Users className="w-5 h-5" />,
        '/users': <Settings className="w-5 h-5" />,
        '/admin': <BarChart3 className="w-5 h-5" />,
        '/profile': <UserCheck className="w-5 h-5" />,
    };

    // Pick icon based on current URL, fallback to a default
    const pageIcon = iconMap[url] || <UserCheck className="w-5 h-5 text-muted-foreground" />;

    const isDashboard = url === '/dashboard';

    // Determine page title: use title prop if provided, otherwise use breadcrumbs
    const pageTitle = title || breadcrumbs[breadcrumbs.length - 1]?.title || 'Untitled Page';

    const { toggleSidebar } = useSidebar();
    return (
        <header className="border-b border-sidebar-border/50 pb-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 mb-6">
            <div className="block mb-2">
                <div className="flex items-center gap-2 md:justify-start justify-between">
                    {/* <SidebarTrigger className="order-1 md:order-0 block md:none"/>
                    <SidebarTrigger className="order-1 md:order-0 none md:block">
                        <Menu className="w-5 h-5" />
                    </SidebarTrigger> */}
                    <button onClick={toggleSidebar} className="order-1 md:order-0 p-2" >
                        <UnfoldHorizontal className="w-5 h-5 hidden md:block"/>
                        <span className='block md:hidden w-10 h-10 mobile-icon-btn'><Menu className="w-5 h-5"/></span>
                    </button>
                    <h2 className="pageheading font-semibold text-lg flex items-center gap-2">
                        <span className="heading-icon">{pageIcon}</span>
                        {pageTitle}
                    </h2>
                </div>

                {/* 👇 Button only visible on Dashboard */}
                {isDashboard && (
                    <Button
                        onClick={() => console.log('Dashboard button clicked')}
                        className="primary-btn"
                    >
                        Generate a PDF Report <FileDown/>
                    </Button>
                )}
            </div>
        </header>
    );
}
