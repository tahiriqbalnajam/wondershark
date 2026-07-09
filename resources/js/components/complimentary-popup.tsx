import { usePage, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ComplimentaryPopup() {
    const page = usePage();
    const { trial, auth } = page.props as any;

    const shouldShow = !!trial?.show_complimentary_popup;
    const loggedInAt = (auth as any)?.logged_in_at ?? null;

    const [open, setOpen] = useState(false);
    const [deactivating, setDeactivating] = useState(false);

    const handleDeactivate = () => {
        setDeactivating(true);
        router.post(
            route('request-deactivation'),
            {},
            {
                onSuccess: () => {
                    toast.success('Deactivation request sent successfully.');
                    setOpen(false);
                },
                onError: () => {
                    toast.error('Failed to send request. Please try again later.');
                },
                onFinish: () => setDeactivating(false),
            }
        );
    };

    useEffect(() => {
        if (!shouldShow || !loggedInAt || !auth?.user?.id) return;

        const key = `complimentary_${auth.user.id}_${loggedInAt}`;
        let count = parseInt(sessionStorage.getItem(key) || '0', 10);
        count += 1;
        sessionStorage.setItem(key, String(count));

        if (count !== 2) return;

        const t = setTimeout(() => setOpen(true), 500);
        return () => clearTimeout(t);
    }, [loggedInAt, shouldShow, auth?.user?.id]);

    // Clear session storage on logout
    useEffect(() => {
        if (!auth?.user?.id) {
            Object.keys(sessionStorage).forEach((key) => {
                if (key.startsWith('complimentary_')) sessionStorage.removeItem(key);
            });
        }
    }, [auth?.user?.id]);

    if (!shouldShow) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Gift className="h-5 w-5 text-blue-500" />
                        Welcome to your complimentary Wondershark.ai account
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm text-gray-700">
                    <p>
                        This is a complimentary account provided by Wondershark.ai. We hope you find it useful for monitoring your visibility across AI platforms.
                    </p>
                    <p>
                        If you would like to increase how often your brand appears in AI platforms like ChatGPT, Gemini, Claude, Perplexity, and Google AI Overviews, we would be happy to help. We are confident we can recommend a plan that fits your needs and budget.
                    </p>
                    <Button asChild className="w-full">
                        <a
                            href="https://api.leadconnectorhq.com/widget/bookings/marcs-calendar-zxeoy"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Click here to speak with us
                        </a>
                    </Button>
                    <div className="border-t pt-4">
                        <p className="font-medium text-gray-900">
                            Not interested in monitoring your AI visibility for free?
                        </p>
                        <button
                            onClick={handleDeactivate}
                            disabled={deactivating}
                            className="text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deactivating ? 'Sending request...' : 'Click here to deactivate your complimentary account.'}
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                            We will not contact you again.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
