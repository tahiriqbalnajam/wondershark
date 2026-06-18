import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, ExternalLink } from 'lucide-react';

const BOOKING_URL = 'https://api.leadconnectorhq.com/widget/bookings/marcs-calendar-zxeoy';

export function PitchExpiredPopup() {
    const page = usePage();
    const { trial, auth } = page.props as any;

    const shouldShow: boolean = !!trial?.show_expired_pitchwall;
    const userId: number | null = auth?.user?.id ?? null;

    const [open, setOpen] = useState(false);
    const hasTriggeredRef = useRef(false);

    useEffect(() => {
        if (!shouldShow || !userId) return;
        if (hasTriggeredRef.current) return;
        if (open) return;

        hasTriggeredRef.current = true;

        // Small delay to let the page settle before showing the modal
        const t = setTimeout(() => {
            setOpen(true);
        }, 300);
        return () => clearTimeout(t);
    }, [shouldShow, userId, open]);

    // Reset trigger when user navigates away so popup shows again on next redirect
    useEffect(() => {
        return () => {
            hasTriggeredRef.current = false;
        };
    }, []);

    // Reset on logout
    useEffect(() => {
        if (!userId) {
            setOpen(false);
            hasTriggeredRef.current = false;
        }
    }, [userId]);

    if (!shouldShow) return null;

    const handleContact = () => {
        window.open(BOOKING_URL, '_blank');
    };

    return (
        <Dialog open={open}>
            <DialogContent
                className="sm:max-w-md [&>button]:hidden"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Lock className="h-5 w-5 text-red-500" />
                        Campaign Required
                    </DialogTitle>
                    <DialogDescription>
                        A campaign is required to access the platform.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center space-y-3">
                        <div className="text-base font-semibold text-red-700">
                            Full Access Locked
                        </div>
                    </div>
                    <Button className="w-full" onClick={handleContact}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Contact us to unlock your account
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
