import { useEffect } from 'react';
import { X } from 'lucide-react';

interface BookCallDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const FORM_EMBED_SRC = 'https://link.msgsndr.com/js/form_embed.js';

export default function BookCallDialog({ open, onOpenChange }: BookCallDialogProps) {
    // Load the LeadConnector embed only while the dialog is open, and remove it on
    // close. Appending it to <body> on mount left the third-party script in the
    // document for the rest of the Inertia SPA session, i.e. on every page after
    // leaving login. Keeping it scoped to the open dialog means it only ever runs
    // here. (The booking iframe is also rendered only while open.)
    useEffect(() => {
        if (!open) return;

        if (document.querySelector(`script[src="${FORM_EMBED_SRC}"]`)) {
            return;
        }

        const script = document.createElement('script');
        script.src = FORM_EMBED_SRC;
        script.async = true;
        document.body.appendChild(script);

        return () => {
            script.remove();
        };
    }, [open]);

    // Close on Escape when open.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onOpenChange(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onOpenChange]);

    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center max-sm:items-start max-sm:overflow-y-auto max-sm:p-4"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="absolute inset-0 bg-black/80"
                onClick={() => onOpenChange(false)}
            />

            <div className="relative z-10 w-full max-w-2xl rounded-lg border bg-background p-6 shadow-lg sm:m-4 max-sm:p-4">
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                <h2 className="mb-4 text-lg font-semibold">Book a Call</h2>

                <iframe
                    src="https://api.leadconnectorhq.com/widget/booking/3diaqWZNmxUneIDxSWpn"
                    allow="payment"
                    style={{ width: '100%', border: 'none', overflow: 'hidden' }}
                    scrolling="no"
                    id="3diaqWZNmxUneIDxSWpn_1787319963389"
                    title="Book a call"
                    className="h-[600px] w-full max-sm:h-[70vh] max-sm:max-h-[600px]"
                />
            </div>
        </div>
    );
}