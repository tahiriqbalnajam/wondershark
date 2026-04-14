import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Zap, X, Lock } from 'lucide-react';
import { Link } from '@inertiajs/react';

/**
 * Module-level state — survives SPA navigations (module not reloaded between pages).
 *
 * optionBStartedAt  Unix ms when the Option B countdown began.
 *   Non-null  = we are still in the countdown window (component may remount mid-countdown).
 *   null      = redirect has already fired (or user logged out / subscribed).
 *
 * optionAShownKey   `${userId}_${sessionId}` for Option A show-once-per-login tracking.
 */
let optionBStartedAt: number | null = null;
let optionAShownKey: string | null = null;

function sessionKey(prefix: string, userId: number, sessionId: string) {
    return `${prefix}_${userId}_${sessionId}`;
}

function useCountdown(endsAt: string | null) {
    const calc = () => {
        if (!endsAt) return { d: 0, h: 0, m: 0, s: 0 };
        const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
        const total = Math.floor(diff / 1000);
        return {
            d: Math.floor(total / 86400),
            h: Math.floor((total % 86400) / 3600),
            m: Math.floor((total % 3600) / 60),
            s: total % 60,
        };
    };
    const [time, setTime] = useState(calc);
    const ref = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    useEffect(() => {
        ref.current = setInterval(() => setTime(calc()), 1000);
        return () => {
            if (ref.current) clearInterval(ref.current);
        };
    }, [endsAt]);
    return time;
}

function getBillingUrl(roles: string[]): string {
    if (roles?.includes('agency')) return '/agency/billing';
    if (roles?.includes('brand')) return '/brand/billing';
    return '/billing';
}

const REDIRECT_DELAY = 5;

export function TrialPaywallPopup() {
    const page = usePage();
    const { trial, auth } = page.props as any;

    const shouldShowA: boolean = !!trial?.show_paywall;
    const shouldShowB: boolean = !!trial?.show_immediate_paywall;
    const shouldShowExpired: boolean = !!trial?.show_expired_paywall;
    const userId: number | null = auth?.user?.id ?? null;
    const loggedInAt: number | null = (auth as any)?.logged_in_at ?? null;
    const billingUrl = getBillingUrl(auth?.roles ?? []);

    const isOnBillingPage = typeof window !== 'undefined' && window.location.pathname.includes('/billing');

    const [open, setOpen] = useState(false);
    const [redirectIn, setRedirectIn] = useState<number | null>(null);

    // ── Option B: show popup on billing page ─────────────────────────────────
    useEffect(() => {
        if (!shouldShowB || !userId || !loggedInAt || !isOnBillingPage) return;

        const key = sessionKey('optionB', userId, String(loggedInAt));
        const alreadyShown = !!sessionStorage.getItem(key);
        
        if (!alreadyShown) {
            sessionStorage.setItem(key, '1');
            optionBStartedAt = Date.now();
            // Small delay to ensure page has loaded
            setTimeout(() => {
                setOpen(true);
            }, 500);
        } else if (optionBStartedAt !== null) {
            // resume mid-countdown
            const elapsed = Math.floor((Date.now() - optionBStartedAt) / 1000);
            const remaining = REDIRECT_DELAY - elapsed;
            if (remaining > 0) {
                setOpen(true);
            } else {
                optionBStartedAt = null;
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnBillingPage, shouldShowB, userId, loggedInAt]);

    // ── Option A: show once per login session on billing page ───────────────
    useEffect(() => {
        if (!shouldShowA || !userId || !loggedInAt || !isOnBillingPage) return;
        const key = sessionKey('optionA', userId, String(loggedInAt));
        if (optionAShownKey === key || sessionStorage.getItem(key)) return;
        optionAShownKey = key;
        sessionStorage.setItem(key, '1');
        const t = setTimeout(() => {
            setOpen(true);
        }, 500);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldShowA, userId, loggedInAt, isOnBillingPage]);

    // ── Expired Trial: show popup on billing page ───────────────
    useEffect(() => {
        if (!shouldShowExpired || !userId || !loggedInAt || !isOnBillingPage) return;
        const key = sessionKey('expiredTrial', userId, String(loggedInAt));
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
        const t = setTimeout(() => {
            setOpen(true);
        }, 500);
        return () => clearTimeout(t);
    }, [shouldShowExpired, userId, loggedInAt, isOnBillingPage]);

    // ── Reset module state on logout / subscription acquired ─────────────────
    useEffect(() => {
        if (!userId) {
            optionBStartedAt = null;
            optionAShownKey = null;
        }
    }, [userId]);

    useEffect(() => {
        if (!shouldShowB) optionBStartedAt = null;
    }, [shouldShowB]);

    // ── Auto-redirect countdown (not used for either option anymore) ────────
    // Option A shows on billing page (no redirect needed)
    // Option B already redirected server-side (no countdown needed)
    useEffect(() => {
        if (!open || redirectIn === null) return;
        if (redirectIn <= 0) {
            setOpen(false);
            setRedirectIn(null);
            return;
        }
        const t = setTimeout(() => setRedirectIn((s) => (s !== null ? s - 1 : 0)), 1000);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, redirectIn]);

    if (!shouldShowA && !shouldShowB && !shouldShowExpired) return null;

    const handleClose = () => {
        if (shouldShowB) return;
        setOpen(false);
        setRedirectIn(null);
    };

    const daysLeft = (trial?.trial_days_left as number) ?? 0;
    const discount = (trial?.trial_discount as number) ?? 50;
    const countdown = useCountdown(trial?.trial_ends_at ?? null);

    // ── Option B ─────────────────────────────────────────────────────────────
    if (shouldShowB) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Lock className="h-5 w-5 text-red-500" />
                            Subscription Required
                        </DialogTitle>
                        <DialogDescription>
                            A subscription is required to access the platform. Choose a plan to get started.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center space-y-1">
                            <div className="text-base font-semibold text-red-700">Full Access Locked</div>
                            <div className="text-sm text-red-600">Subscribe now to unlock all features.</div>
                        </div>
                        <div className="text-center text-sm text-muted-foreground">
                            Choose a plan below to get started with the platform.
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // ── Expired Trial ───────────────────────────────────────────────────────
    if (shouldShowExpired) {
        return (

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Lock className="h-5 w-5 text-red-500" />
                            Subscription Required
                        </DialogTitle>
                        <DialogDescription>
                            A subscription is required to access the platform. Choose a plan to get started.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center space-y-1">
                            <div className="text-base font-semibold text-red-700">Full Access Locked</div>
                            <div className="text-sm text-red-600">Subscribe now to unlock all features.</div>
                        </div>
                        <div className="text-center text-sm text-muted-foreground">
                            Choose a plan below to get started with the platform.
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            /*
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Lock className="h-5 w-5 text-red-500" />
                            Trial Expired
                        </DialogTitle>
                        <DialogDescription>
                            Your free trial has ended. Please subscribe to continue using the platform.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center space-y-1">
                            <div className="text-base font-semibold text-red-700">Access Locked</div>
                            <div className="text-sm text-red-600">Subscribe now to unlock all features.</div>
                        </div>
                        <div className="text-center text-sm text-muted-foreground">
                            Choose a plan below to get started with the platform.
                        </div>
                    </div>
                </DialogContent>
            </Dialog> */
        );
    }

    // ── Option A ─────────────────────────────────────────────────────────────
    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>

                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Zap className="h-5 w-5 text-orange-500" />
                        Welcome! You've Got {discount}% OFF
                    </DialogTitle>
                    <DialogDescription>
                        You have{' '}
                        <strong className="text-foreground">
                            {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </strong>{' '}
                        left in your free trial to claim this exclusive discount.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="flex justify-center gap-2">
                        {[
                            { value: countdown.d, label: 'Days' },
                            { value: countdown.h, label: 'Hrs' },
                            { value: countdown.m, label: 'Min' },
                            { value: countdown.s, label: 'Sec' },
                        ].map(({ value, label }) => (
                            <div
                                key={label}
                                className="flex flex-col items-center bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 min-w-[52px]"
                            >
                                <span className="text-2xl font-bold text-orange-500 leading-none tabular-nums">
                                    {String(value).padStart(2, '0')}
                                </span>
                                <span className="text-[10px] text-orange-600 mt-1 uppercase tracking-wide">
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-4 text-center space-y-1">
                        <div className="text-4xl font-extrabold text-orange-500">{discount}% OFF</div>
                        <div className="text-sm font-medium text-orange-800">on your 1st month subscription</div>
                        <div className="text-xs text-orange-600">Choose a plan below to get started</div>
                    </div>

                    <Button 
                        variant="outline" 
                        onClick={handleClose}
                        className="w-full"
                    >
                        Explore Plans Below
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                        Discount applied automatically when you subscribe during your trial period.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
