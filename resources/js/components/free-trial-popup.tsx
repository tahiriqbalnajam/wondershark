import React, { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FreeTrialPopupProps {
    show: boolean;
}

export default function FreeTrialPopup({ show }: FreeTrialPopupProps) {
    const [open, setOpen] = useState(show);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPortal>
                <DialogOverlay />
                <DialogPrimitive.Content className="bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-2xl shadow-xl duration-200 sm:max-w-[420px] p-10 text-center">
                    <h2 className="text-3xl font-bold text-black mb-6">
                        Congratulation!
                    </h2>
                    <p className="text-lg text-gray-700 leading-relaxed mb-8">
                        You've got 7 days FREE Trial<br />
                        to explore truly amazing<br />
                        features of the platform.
                    </p>
                    <Button
                        className="rounded-full bg-black hover:bg-gray-900 text-white px-10 py-3 text-base font-medium"
                        onClick={() => setOpen(false)}
                    >
                        Let me explore...
                    </Button>
                </DialogPrimitive.Content>
            </DialogPortal>
        </DialogPrimitive.Root>
    );
}
