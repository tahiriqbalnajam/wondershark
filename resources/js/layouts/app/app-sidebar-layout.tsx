import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem } from '@/types';
import { usePage } from '@inertiajs/react';
import { type PropsWithChildren, useEffect } from 'react';

export default function AppSidebarLayout({ children, breadcrumbs = [], title, logo, website }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[], title?: string, logo?: string, website?: string }>) {
    const { auth } = usePage().props as any;
    
    useEffect(() => {
        // Set the agency color CSS custom property
// const main_agencyId = auth.user?.agency_membership?.agency_id;
         // const agencyColor1 = auth.user?.agencyMembership?.agency?.agency_color;
        // console.log('Agency Color from membership:', auth.user);
        const agencyColor = auth.user?.agency_color;
        if (agencyColor) {
            document.documentElement.style.setProperty('--agency-color', agencyColor);
        } else {
            document.documentElement.style.removeProperty('--agency-color');
        }
    }, [auth.user?.agency_color]);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} title={title} logo={logo} website={website} />
                {children}
            </AppContent>
        </AppShell>
    );
}
