import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { UserCheck } from 'lucide-react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    return (
        <header className="border-b border-sidebar-border/50 px-6 pb-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4 mb-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 mb-2">
                <span className="heading-icon"><UserCheck /></span>
                <h2 className="pageheading">{breadcrumbs[breadcrumbs.length - 1]?.title}</h2>
            </div>
            <Breadcrumbs breadcrumbs={breadcrumbs} />
        </header>
    );
}
