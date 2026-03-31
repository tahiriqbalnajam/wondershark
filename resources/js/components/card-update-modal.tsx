import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { Loader2, CreditCard } from 'lucide-react';

interface CardUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stripePublishableKey: string;
  onSuccess?: () => void;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

const stripePromise = (publishableKey: string) => loadStripe(publishableKey);

const CardForm: React.FC<{ 
  existingCard: PaymentMethod | null;
  onSuccess?: () => void; 
  onCancel: () => void;
}> = ({ existingCard, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [showNewCardForm, setShowNewCardForm] = useState(!existingCard);

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower === 'visa') return '💳';
    if (brandLower === 'mastercard') return '💳';
    if (brandLower === 'amex') return '💳';
    return '💳';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Get setup intent client secret
      const setupResponse = await fetch('/agency/subscriptions/setup-intent', {
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

      // Attach payment method to customer
      const attachResponse = await fetch('/agency/subscriptions/attach-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          payment_method_id: setupIntent.payment_method,
        }),
      });

      const attachData = await attachResponse.json();

      if (attachData.success) {
        toast.success('Payment method updated successfully!');
        onSuccess?.();
        onCancel();
      } else {
        toast.error(attachData.error || 'Failed to attach payment method');
      }
    } catch (error) {
      console.error('Card setup error:', error);
      toast.error('Failed to update payment method');
    } finally {
      setLoading(false);
    }
  };

  if (existingCard && !showNewCardForm) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-slate-300">Current Card</div>
            <div className="text-2xl">{getCardBrandIcon(existingCard.brand)}</div>
          </div>
          <div className="space-y-2">
            <div className="text-lg font-semibold tracking-wider">
              •••• •••• •••• {existingCard.last4}
            </div>
            <div className="flex justify-between items-center text-sm text-slate-300">
              <div className="uppercase font-medium">{existingCard.brand}</div>
              <div>Exp: {String(existingCard.exp_month).padStart(2, '0')}/{existingCard.exp_year}</div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Close
          </Button>
          <Button type="button" onClick={() => setShowNewCardForm(true)}>
            Update Card
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {existingCard && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="text-muted-foreground">
            You're updating your card ending in <span className="font-semibold">••{existingCard.last4}</span>
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <label className="text-sm font-medium">New Card Details</label>
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
      </div>
      
      <div className="flex gap-2 justify-end">
        {existingCard && (
          <Button type="button" variant="ghost" onClick={() => setShowNewCardForm(false)}>
            Back
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Saving...' : existingCard ? 'Update Card' : 'Save Card'}
        </Button>
      </div>
    </form>
  );
};

export const CardUpdateModal: React.FC<CardUpdateModalProps> = ({
  open,
  onOpenChange,
  stripePublishableKey,
  onSuccess,
}) => {
  const [stripeElements] = useState(() => 
    stripePublishableKey ? stripePromise(stripePublishableKey) : null
  );
  const [existingCard, setExistingCard] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      // Reset state and fetch fresh data when modal opens
      setExistingCard(null);
      setLoading(true);
      fetchExistingCard();
    }
  }, [open]);

  const fetchExistingCard = async () => {
    try {
      const response = await fetch('/agency/subscriptions/payment-methods', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      const data = await response.json();

      if (data.default_payment_method) {
        // Find the default payment method from the list
        const defaultCard = data.payment_methods?.find((pm: PaymentMethod) => pm.is_default);
        setExistingCard(defaultCard || data.payment_methods?.[0] || null);
      } else if (data.payment_methods && data.payment_methods.length > 0) {
        setExistingCard(data.payment_methods[0]);
      } else {
        setExistingCard(null);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      setExistingCard(null);
    } finally {
      setLoading(false);
    }
  };

  if (!stripePublishableKey || !stripeElements) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {existingCard ? 'Manage Payment Method' : 'Add Payment Method'}
          </DialogTitle>
          <DialogDescription>
            {existingCard 
              ? 'Your current payment method is shown below. You can update it anytime.'
              : 'Add your payment card details. This card will be used for future subscription payments.'}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Elements stripe={stripeElements}>
            <CardForm 
              existingCard={existingCard}
              onSuccess={onSuccess} 
              onCancel={() => onOpenChange(false)} 
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CardUpdateModal;
