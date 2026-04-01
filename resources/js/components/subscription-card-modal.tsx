import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface SubscriptionCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stripePublishableKey: string;
  planName: 'agency_growth' | 'agency_unlimited' | 'brand_growth' | 'brand_unlimited';
  planDisplayName: string;
  planPrice: string;
  onSuccess?: () => void;
  setupIntentEndpoint?: string;
  subscribeEndpoint?: string;
}

const stripePromise = (publishableKey: string) => loadStripe(publishableKey);

const SubscriptionForm: React.FC<{ 
  planName: 'agency_growth' | 'agency_unlimited' | 'brand_growth' | 'brand_unlimited';
  planDisplayName: string;
  planPrice: string;
  onSuccess?: () => void; 
  onCancel: () => void;
  setupIntentEndpoint?: string;
  subscribeEndpoint?: string;
}> = ({ planName, planDisplayName, planPrice, onSuccess, onCancel, setupIntentEndpoint = '/agency/subscriptions/setup-intent', subscribeEndpoint = '/agency/subscriptions/subscribe-with-card' }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Get setup intent client secret
      const setupResponse = await fetch(setupIntentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      const setupData = await setupResponse.json();

      if (!setupData.client_secret) {
        throw new Error('Failed to create setup intent');
      }

      // Confirm card setup
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error, setupIntent } = await stripe.confirmCardSetup(setupData.client_secret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        toast.error(error.message || 'Failed to setup payment method');
        setLoading(false);
        return;
      }

      if (!setupIntent?.payment_method) {
        throw new Error('No payment method returned');
      }

      // Create subscription with payment method
      const subscribeResponse = await fetch(subscribeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          plan: planName,
          payment_method_id: setupIntent.payment_method,
        }),
      });

      const subscribeData = await subscribeResponse.json();

      if (subscribeData.success) {
        toast.success(`Successfully subscribed to ${planDisplayName} plan!`);
        onSuccess?.();
        onCancel();
      } else {
        toast.error(subscribeData.error || 'Failed to create subscription');
        setLoading(false);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to create subscription');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Plan</span>
          <span className="text-sm font-semibold">{planDisplayName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Price</span>
          <span className="text-sm font-semibold">{planPrice}/month</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Card Details</label>
        <div className="border rounded-md p-3 bg-background">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: 'hsl(var(--foreground))',
                  '::placeholder': {
                    color: 'hsl(var(--muted-foreground))',
                  },
                },
                invalid: {
                  color: 'hsl(var(--destructive))',
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your card will be charged {planPrice} immediately and then monthly.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Processing...' : 'Subscribe Now'}
        </Button>
      </div>
    </form>
  );
};

export const SubscriptionCardModal: React.FC<SubscriptionCardModalProps> = ({
  open,
  onOpenChange,
  stripePublishableKey,
  planName,
  planDisplayName,
  planPrice,
  onSuccess,
  setupIntentEndpoint = '/agency/subscriptions/setup-intent',
  subscribeEndpoint = '/agency/subscriptions/subscribe-with-card',
}) => {
  const [stripeElements] = useState(() => 
    stripePublishableKey ? stripePromise(stripePublishableKey) : null
  );

  if (!stripePublishableKey || !stripeElements) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Subscribe to {planDisplayName}</DialogTitle>
          <DialogDescription>
            Enter your card details to complete your subscription. You can cancel anytime.
          </DialogDescription>
        </DialogHeader>
        <Elements stripe={stripeElements}>
          <SubscriptionForm 
            planName={planName}
            planDisplayName={planDisplayName}
            planPrice={planPrice}
            onSuccess={onSuccess} 
            onCancel={() => onOpenChange(false)}
            setupIntentEndpoint={setupIntentEndpoint}
            subscribeEndpoint={subscribeEndpoint}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionCardModal;
