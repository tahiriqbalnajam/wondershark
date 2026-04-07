import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Zap, X } from 'lucide-react';
import { Link } from '@inertiajs/react';

export function TrialPaywallPopup() {
    const { trial, auth } = usePage().props as any;
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!trial?.show_paywall || !auth?.user?.id) return;

        const key = `paywall_shown_${auth.user.id}`;
        if (!sessionStorage.getItem(key)) {
            // Small delay so the page finishes rendering first
            const t = setTimeout(() => setOpen(true), 800);
            return () => clearTimeout(t);
        }
    }, []);

    if (!trial?.show_paywall) return null;

    const handleClose = () => {
        sessionStorage.setItem(`paywall_shown_${auth.user.id}`, '1');
        setOpen(false);
    };

    const daysLeft = trial.trial_days_left as number;
    const discount = trial.trial_discount as number;

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                {/* Custom close button */}
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>

                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Clock className="h-5 w-5 text-orange-500" />
                        Your trial is ending soon!
                    </DialogTitle>
                    <DialogDescription>
                        You have{' '}
                        <strong className="text-foreground">
                            {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </strong>{' '}
                        left in your free trial.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Countdown block */}
                    <div className="flex justify-center">
                        <div className="flex flex-col items-center justify-center rounded-full border-4 border-orange-400 bg-orange-50 w-24 h-24">
                            <span className="text-3xl font-bold text-orange-500 leading-none">{daysLeft}</span>
                            <span className="text-xs text-orange-600 mt-1">day{daysLeft !== 1 ? 's' : ''} left</span>
                        </div>
                    </div>

                    {/* Discount offer */}
                    <div className="rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-4 text-center space-y-1">
                        <div className="text-4xl font-extrabold text-orange-500">{discount}% OFF</div>
                        <div className="text-sm font-medium text-orange-800">on your 1st month subscription</div>
                        <div className="text-xs text-orange-600">Available only during your trial period</div>
                    </div>

                    {/* CTA */}
                    <div className="flex gap-2">
                        <Link href="/billing" className="flex-1" onClick={handleClose}>
                            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                                <Zap className="h-4 w-4 mr-2" />
                                Subscribe Now — {discount}% Off
                            </Button>
                        </Link>
                        <Button variant="outline" onClick={handleClose}>
                            Later
                        </Button>
                    </div>

                    <p className="text-center text-xs text-muted-foreground">
                        Discount applied automatically at checkout during your trial.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
