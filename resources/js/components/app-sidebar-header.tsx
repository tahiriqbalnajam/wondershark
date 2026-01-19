import { Breadcrumbs } from '@/components/breadcrumbs';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { usePage } from '@inertiajs/react';

// Import all icons you might use
import { UserCheck, LayoutDashboard, Settings, BarChart3, Users,FileDown,Menu,UnfoldHorizontal } from 'lucide-react';
import { JSX } from 'react';

export function AppSidebarHeader({ breadcrumbs = [], title, logo, website }: { breadcrumbs?: BreadcrumbItemType[], title?: string, logo?: string, website?: string }) {
    const { url, props } = usePage(); // Current route path and page props

    // Get brand from page props if available
    const brand = (props as any).brand;

    // Map route → icon
    const iconMap: Record<string, JSX.Element> = {
        '/dashboard': <LayoutDashboard className="w-5 h-5" />,
        '/search-analytics': <Users className="w-5 h-5" />,
        '/users': <Settings className="w-5 h-5" />,
        '/admin': <BarChart3 className="w-5 h-5" />,
        '/profile': <UserCheck className="w-5 h-5" />,
    };

    // Generate logo.dev URL if no logo but website provided
    const generateApiLogoUrl = (site: string) => 
        `https://img.logo.dev/${site.replace(/^https?:\/\//, '').replace(/^www\./, '')}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`;

    // Determine logo and website - prioritize props, then brand from page props
    const finalLogo = logo || brand?.logo;
    const finalWebsite = website || brand?.website;

    // Pick icon based on current URL, fallback to a default
    const pageIcon = finalLogo ? (
        <img src={finalLogo.startsWith('http') ? finalLogo : `/storagee/${finalLogo}`}  alt="Brand logo" className="w-5 h-5 rounded object-contain" />
    ) : finalWebsite ? (
        <img 
            src={generateApiLogoUrl(finalWebsite)} 
            alt="Brand logo from API" 
            className="w-5 h-5 rounded object-contain"
            onError={(e) => {
                e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`;
            }}
        />
    ) : (
        iconMap[url] || <UserCheck className="w-5 h-5 text-muted-foreground" />
    );

    const isDashboard = url === '/dashboard';

    // Determine page title: use title prop if provided, otherwise use breadcrumbs
    const pageTitle = title || breadcrumbs[breadcrumbs.length - 1]?.title || 'Untitled Page';

    const { toggleSidebar } = useSidebar();
    return (
        <header className="border-b border-sidebar-border/50 pb-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 mb-6">
            <div className="lg:flex justify-between items-center mb-2">
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
