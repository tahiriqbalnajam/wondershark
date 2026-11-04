import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { TrialPaywallPopup } from '@/components/trial-paywall-popup';
import { type BreadcrumbItem } from '@/types';
import { usePage } from '@inertiajs/react';
import { lazy, Suspense, type PropsWithChildren, useEffect } from 'react';
import { toast } from 'sonner';

// The paywall popups are the only components that reference the GoHighLevel
// (api.leadconnectorhq.com) booking host. Import them lazily and only mount them
// when their trigger is actually set, so neither their code nor the third-party
// URLs are part of the shared app-layout bundle served on every page.
const PitchExpiredPopup = lazy(() =>
    import('@/components/pitch-expired-popup').then((m) => ({ default: m.PitchExpiredPopup })),
);
const ComplimentaryPopup = lazy(() =>
    import('@/components/complimentary-popup').then((m) => ({ default: m.ComplimentaryPopup })),
);

interface AppLayoutSharedProps {
    auth?: {
        user?: { id?: number; agency_color?: string | null } | null;
        logged_in_at?: string | null;
    };
    flash?: { warning?: string | null };
    trial?: {
        show_expired_pitchwall?: boolean;
        show_complimentary_popup?: boolean;
    } | null;
}

export default function AppSidebarLayout({ children, breadcrumbs = [], title, logo, website }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[], title?: string, logo?: string, website?: string }>) {
    const { auth, flash, trial } = usePage().props as unknown as AppLayoutSharedProps;

    const showPitchExpired = !!trial?.show_expired_pitchwall && !!auth?.user?.id;
    const showComplimentary = !!trial?.show_complimentary_popup && !!auth?.user?.id && !!auth?.logged_in_at;

    useEffect(() => {
        if (flash?.warning) {
            toast.warning(flash.warning, { duration: 6000 });
        }
    }, [flash?.warning]);

    useEffect(() => {
        // Set the agency color CSS custom property
// const main_agencyId = auth.user?.agency_membership?.agency_id;
         // const agencyColor1 = auth.user?.agencyMembership?.agency?.agency_color;
        // console.log('Agency Color from membership:', auth.user);
        const agencyColor = auth?.user?.agency_color;
        if (agencyColor) {
            document.documentElement.style.setProperty('--agency-color', agencyColor);
        } else {
            document.documentElement.style.removeProperty('--agency-color');
        }
    }, [auth?.user?.agency_color]);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} title={title} logo={logo} website={website} />
                {children}
            </AppContent>
            <TrialPaywallPopup />
            {showPitchExpired && (
                <Suspense fallback={null}>
                    <PitchExpiredPopup />
                </Suspense>
            )}
            {showComplimentary && (
                <Suspense fallback={null}>
                    <ComplimentaryPopup />
                </Suspense>
            )}
        </AppShell>
    );
}
