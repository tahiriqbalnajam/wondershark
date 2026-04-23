import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface CancelSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  cancelDate?: string;
  retentionEndpoint?: string;
  hasStripeSubscription?: boolean;
}

export default function CancelSubscriptionModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  cancelDate,
  retentionEndpoint = '/brand/subscriptions/retention-discount',
  hasStripeSubscription = false,
}: CancelSubscriptionModalProps) {
  const [step, setStep] = useState<'confirm' | 'retention'>('confirm');
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const handleOpenChange = (val: boolean) => {
    if (!val) setStep('confirm');
    onOpenChange(val);
  };

  const handleYesCancel = () => {
    if (!hasStripeSubscription) {
      onConfirm();
      return;
    }
    setStep('retention');
  };

  const handleKeepWithDiscount = async () => {
    setApplyingDiscount(true);
    try {
      const res = await fetch(retentionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('50% discount applied to your next billing cycle!');
        handleOpenChange(false);
      } else {
        toast.error(data.error || 'Failed to apply discount.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleCancelAnyway = () => {
    setStep('confirm');
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <DialogTitle className="text-xl">Cancel Subscription?</DialogTitle>
              </div>
              <DialogDescription className="text-base pt-2">
                Are you sure you want to cancel your subscription? You will continue to have access to all features until the end of your current billing period{cancelDate && ` on ${cancelDate}`}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Keep Subscription
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleYesCancel}
                disabled={loading}
              >
                {loading ? 'Canceling...' : 'Yes, Cancel'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
                  <Zap className="h-5 w-5 text-orange-500" />
                </div>
                <DialogTitle className="text-xl">Wait — Special Offer!</DialogTitle>
              </div>
              <DialogDescription asChild>
                <div className="pt-2 space-y-3">
                  <p className="text-base text-foreground">
                    Before you go, we'd like to offer you <strong className="text-orange-500">50% off your next month</strong> to stay with us.
                  </p>
                  <div className="rounded-xl border-2 border-orange-300 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 p-4 text-center">
                    <span className="text-3xl font-extrabold text-orange-500">50% OFF</span>
                    <p className="text-sm text-orange-700 mt-1">Applied automatically to your next billing cycle only.</p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
              <Button
                type="button"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                onClick={handleKeepWithDiscount}
                disabled={applyingDiscount}
              >
                {applyingDiscount ? 'Applying discount...' : 'Keep Subscription — Get 50% Off Next Month'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleCancelAnyway}
                disabled={applyingDiscount || loading}
              >
                No thanks, cancel anyway
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
