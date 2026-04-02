import React, { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface FreeTrialPopupProps {
    show: boolean;
}

export default function FreeTrialPopup({ show }: FreeTrialPopupProps) {
    const [open, setOpen] = useState(show);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPortal>
                <DialogOverlay />
                <DialogPrimitive.Content className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-lg border shadow-lg duration-200 sm:max-w-[480px]">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 text-white text-center">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mx-auto mb-4">
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Your 7-Day Free Trial is Active!</h2>
                        <p className="text-indigo-100 text-sm">
                            You now have full access to all features for the next 7 days — no credit card required.
                        </p>
                    </div>
                    <div className="p-8 text-center">
                        <p className="text-muted-foreground mb-6">
                            Explore AI-powered brand visibility tracking, competitive analysis, and more. Make the most of your free trial!
                        </p>
                        <Button
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => setOpen(false)}
                        >
                            Let me explore
                        </Button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </DialogPrimitive.Root>
    );
}
