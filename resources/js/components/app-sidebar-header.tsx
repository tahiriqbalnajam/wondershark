import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { usePage } from '@inertiajs/react';

// Import all icons you might use
import { UserCheck, LayoutDashboard, Settings, BarChart3, Users,FileDown,UnfoldHorizontal } from 'lucide-react';
import { JSX } from 'react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
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

    return (
        <header className="border-b border-sidebar-border/50 px-6 pb-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4 mb-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                        <SidebarTrigger className=""/>
                    <span className="heading-icon">{pageIcon}</span>
                    <h2 className="pageheading font-semibold text-lg">
                        {breadcrumbs[breadcrumbs.length - 1]?.title || 'Untitled Page'}
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

            {!isDashboard && <Breadcrumbs breadcrumbs={breadcrumbs} />}
        </header>
    );
}
