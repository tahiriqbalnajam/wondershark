import AppLayout from '@/layouts/app-layout';
import { Calendar, CreditCardIcon } from '@/components/billing-icons';
import { Briefcase, Loader2 } from 'lucide-react';
import CardUpdateModal from '@/components/card-update-modal';
import SubscriptionCardModal from '@/components/subscription-card-modal';
import CancelSubscriptionModal from '@/components/cancel-subscription-modal';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { usePage, router } from '@inertiajs/react';
import { Clock, Zap } from 'lucide-react';

interface SubscriptionData {
  plan_name: string;
  status: string;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  current_period_end: string;
}

interface AiModelData {
  name: string;
  display_name: string;
}

interface PageProps extends Record<string, unknown> {
  subscription: SubscriptionData | null;
  stripePublishableKey: string;
  aiModels: AiModelData[];
}

export default function BrandBillingPage() {
  const { subscription, stripePublishableKey, trial, aiModels = [] } = usePage<PageProps & { trial?: any }>().props;
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Auto-refresh when page regains focus (e.g., returning from billing portal)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !cardModalOpen && !subscriptionModalOpen && !cancelModalOpen) {
        // Page is visible again - reload to get fresh subscription data
        router.reload({ only: ['subscription'] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [cardModalOpen, subscriptionModalOpen, cancelModalOpen]);

  const hasActiveSubscription = !!subscription && subscription.status === 'active';
  const isOnTrial = !!(trial?.is_on_trial && !hasActiveSubscription && !trial?.has_ever_subscribed);
  const trialDiscount: number = trial?.trial_discount ?? 0;

  const [trialTimeLeft, setTrialTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!isOnTrial || !trial?.trial_ends_at) return;
    const compute = () => {
      const diff = new Date(trial.trial_ends_at).getTime() - Date.now();
      if (diff <= 0) { setTrialTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTrialTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [trial?.trial_ends_at, isOnTrial]);

  // Handle subscription actions
  const handleSubscribe = async () => {
    setLoading(true);
    setSubscribing(true);
    
    try {
      // Check if user has existing payment method
      const paymentMethodsResponse = await fetch('/brand/subscriptions/payment-methods', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      const paymentMethodsData = await paymentMethodsResponse.json();
      
      // If user has a payment method, subscribe directly
      if (paymentMethodsData.default_payment_method) {
        const subscribeResponse = await fetch('/brand/subscriptions/subscribe-with-card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          body: JSON.stringify({
            plan: 'brand_growth',
            payment_method_id: paymentMethodsData.default_payment_method.id,
          }),
        });

        const subscribeData = await subscribeResponse.json();

        if (subscribeData.success) {
          toast.success('Successfully subscribed to Growth plan!');
          // Use timeout to ensure toast is visible before reload
          setTimeout(() => {
            router.reload({ onSuccess: () => window.location.reload() });
          }, 500);
        } else {
          toast.error(subscribeData.error || 'Failed to create subscription');
          setSubscribing(false);
          setLoading(false);
        }
      } else {
        // No payment method, show card modal
        setLoading(false);
        setSubscribing(false);
        setSubscriptionModalOpen(true);
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      toast.error('Failed to process subscription');
      setLoading(false);
      setSubscribing(false);
    }
  };

  const handleSubscriptionSuccess = () => {
    toast.success('Subscription created successfully!');
    setTimeout(() => {
      router.reload({ onSuccess: () => window.location.reload() });
    }, 500);
  };

  const handleCancel = async () => {
    setCancelModalOpen(true);
  };

  const confirmCancel = async () => {
    setLoading(true);
    
    router.post('/brand/subscriptions/cancel', 
      {},
      {
        onSuccess: () => {
          toast.success('Subscription will be canceled at the end of the billing period.');
          setCancelModalOpen(false);
          // Page will auto-refresh with new subscription data from Inertia
        },
        onError: (errors) => {
          toast.error(Object.values(errors)[0] as string || 'Failed to cancel subscription');
          setLoading(false);
        },
        onFinish: () => {
          setLoading(false);
        },
      }
    );
  };

  const handleReactivate = async () => {
    setLoading(true);
    
    router.post('/brand/subscriptions/reactivate', 
      {},
      {
        onSuccess: () => {
          toast.success('Subscription has been reactivated successfully!');
          // Page will auto-refresh with new subscription data from Inertia
        },
        onError: (errors) => {
          toast.error(Object.values(errors)[0] as string || 'Failed to reactivate subscription');
          setLoading(false);
        },
        onFinish: () => {
          setLoading(false);
        },
      }
    );
  };

  const handleBillingPortal = async () => {
    if (!hasActiveSubscription) {
      toast.error('You need an active subscription to manage billing');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/brand/subscriptions/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      const data = await response.json();

      if (data.url) {
        // Open Stripe Billing Portal in new tab
        window.open(data.url, '_blank');
        setLoading(false);
      } else if (data.error) {
        toast.error(data.error);
        setLoading(false);
      }
    } catch (error) {
      toast.error('Failed to open billing portal');
      setLoading(false);
    }
  };

  const handleCardUpdate = () => {
    setCardModalOpen(true);
  };

  const handleCardUpdateSuccess = () => {
    toast.success('Card updated successfully!');
    router.reload();
  };

  return (
    <AppLayout title="Billing">
      <CardUpdateModal
        open={cardModalOpen}
        onOpenChange={setCardModalOpen}
        stripePublishableKey={stripePublishableKey}
        onSuccess={handleCardUpdateSuccess}
        setupIntentEndpoint="/brand/subscriptions/setup-intent"
        attachPaymentMethodEndpoint="/brand/subscriptions/attach-payment-method"
      />
      <SubscriptionCardModal
        open={subscriptionModalOpen}
        onOpenChange={setSubscriptionModalOpen}
        stripePublishableKey={stripePublishableKey}
        planName="brand_growth"
        planDisplayName="Growth"
        planPrice={isOnTrial && trialDiscount > 0
          ? `$${Math.round(199 * (1 - trialDiscount / 100))} (${trialDiscount}% off 1st month)`
          : '$199'}
        onSuccess={handleSubscriptionSuccess}
        subscribeEndpoint="/brand/subscriptions/subscribe-with-card"
      />
      <CancelSubscriptionModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        onConfirm={confirmCancel}
        loading={loading}
        cancelDate={subscription?.cancel_at || subscription?.current_period_end}
      />
      <div className="w-full overflow-x-hidden">
        <div className="mx-auto p-4 md:p-8">

        {isOnTrial && trialDiscount > 0 && (
          <div className="mb-6 rounded-xl border-2 border-orange-300 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-orange-500">{trialDiscount}% OFF</span>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 border border-orange-300">1st month only</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-0.5">Subscribe during your free trial and get <strong>{trialDiscount}% off</strong> your first month. Discount applied automatically.</p>
                </div>
              </div>
              {trialTimeLeft && (
                <div className="flex flex-col items-center sm:items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Trial ends in</span>
                  </div>
                  <div className="flex gap-1">
                    {trialTimeLeft.days > 0 && (
                      <div className="flex flex-col items-center rounded-lg bg-orange-500 px-2 py-1 text-white min-w-[40px]">
                        <span className="text-lg font-bold leading-none tabular-nums">{trialTimeLeft.days}</span>
                        <span className="text-[10px]">days</span>
                      </div>
                    )}
                    <div className="flex flex-col items-center rounded-lg bg-orange-500 px-2 py-1 text-white min-w-[40px]">
                      <span className="text-lg font-bold leading-none tabular-nums">{String(trialTimeLeft.hours).padStart(2, '0')}</span>
                      <span className="text-[10px]">hrs</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg bg-orange-500 px-2 py-1 text-white min-w-[40px]">
                      <span className="text-lg font-bold leading-none tabular-nums">{String(trialTimeLeft.minutes).padStart(2, '0')}</span>
                      <span className="text-[10px]">min</span>
                    </div>
                    <div className="flex flex-col items-center rounded-lg bg-orange-500 px-2 py-1 text-white min-w-[40px]">
                      <span className="text-lg font-bold leading-none tabular-nums">{String(trialTimeLeft.seconds).padStart(2, '0')}</span>
                      <span className="text-[10px]">sec</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-1">Plan</h2>
            <p className="text-muted-foreground">Designed for every stage of your journey. If you can't find something, message us</p>
          </div>
          {subscription && (
            <div className="border rounded-lg p-4 mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    Your plan
                    {subscription.cancel_at_period_end ? (
                      <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold border border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400">Canceling</span>
                    ) : (
                      <span className="inline-flex items-center border px-[6px] py-0.5 text-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap rounded-full bg-card text-muted-foreground font-medium">Current</span>
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="text-xl font-semibold tracking-tight text-strong-950">Growth</span> 
                    &nbsp;<span className="text-sm font-medium mb-0.5 text-muted-foreground">$199/month</span>
                  </div>
                  <div className="flex items-center gap-6 mt-2">
                    <div className="flex flex-wrap gap-6">
                      {/* Billing cycle */}
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-muted-foreground font-medium m-0">Billing cycle</p>
                          <p className="font-semibold leading-3 m-0 capitalize">month</p>
                        </div>
                      </div>
                      {/* Renews or Cancels */}
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                          <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-muted-foreground font-medium m-0">{subscription.cancel_at_period_end ? 'Cancels on' : 'Renews'}</p>
                          <p className="font-semibold leading-3 m-0">{subscription.cancel_at || subscription.current_period_end}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Base Plan</h2>
          <p className="text-muted-foreground mb-4">Select your desired subscription plan</p>
          {/* Growth Plan - Single Plan */}
          <div
            className={`border rounded-lg p-4 md:p-6 bg-background transition-all max-w-[480px] ${
              hasActiveSubscription
                ? ''
                : 'shadow-sm'
            }`}
            style={{
              ...(hasActiveSubscription
                ? {
                    borderColor: 'green',
                    boxShadow: `0 0 0 2px green, 0 1px 2px 0 rgb(0 0 0 / 0.05)`
                  } as React.CSSProperties
                : {})
            }}
          >
            <div className="mb-4 text-muted-foreground">Growth</div>
            {isOnTrial && trialDiscount > 0 ? (
              <div className="mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-black">${Math.round(199 * (1 - trialDiscount / 100))}</span>
                  <span className="text-sm line-through text-muted-foreground">$199</span>
                  <span className="text-base font-normal text-muted-foreground">/mo</span>
                </div>
              </div>
            ) : (
              <div className="text-2xl font-bold text-black mb-2">$199 <span className="text-base font-normal text-muted-foreground">/per month</span></div>
            )}
                          <div data-orientation="horizontal" role="none" className="shrink-0 bg-border h-px w-full mb-4"></div>
              
              <ul className="mb-4 space-y-1 text-sm">
                <li className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
                    AI citations tracking
                  </span>
                  <span className="font-semibold text-black">Unlimited</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-briefcase h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path><rect width="20" height="14" x="2" y="6" rx="2"></rect></svg>
                    Competitor analysis
                  </span>
                  <span className="font-semibold text-black">5 per brand</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder-open h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path></svg>
                    Posts tracking
                  </span>
                  <span className="font-semibold text-black">Unlimited</span>
                </li>
      
              </ul>
              {hasActiveSubscription ? (
                subscription?.cancel_at_period_end ? (
                  <button
                    className="w-full bg-primary text-primary-foreground font-semibold rounded-[6px] p-2 text-body-m opacity-80 transition-all duration-200 hover:opacity-100 focus:opacity-100 hover:scale-105 focus:scale-105"
                    onClick={(e) => { e.stopPropagation(); handleReactivate(); }}
                    disabled={loading}
                  >
                    Reactivate subscription
                  </button>
                ) : (
                  <button
                    className="w-full bg-muted text-muted-foreground border border-muted-foreground rounded-[6px] p-2 text-body-m opacity-80 transition-all duration-200 hover:opacity-100 focus:opacity-100 hover:scale-105 focus:scale-105"
                    onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                    disabled={loading}
                  >
                    Cancel subscription
                  </button>
                )
              ) : (
                <button
                  className="w-full bg-primary text-primary-foreground font-semibold flex items-center justify-center rounded-[6px] p-2 text-body-m opacity-80 transition-all duration-200 hover:opacity-100 focus:opacity-100 hover:scale-105 focus:scale-105" 
                  onClick={(e) => { e.stopPropagation(); handleSubscribe(); }}
                  disabled={loading || subscribing}
                >
                  {subscribing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    isOnTrial && trialDiscount > 0 ? `Subscribe — ${trialDiscount}% Off 1st Month` : 'Subscribe'
                  )}
                </button>
              )}
              <div data-orientation="horizontal" role="none" className="shrink-0 bg-border h-px w-full mb-4 mt-4"></div>
              {aiModels.length > 0 && (
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI MODELS</span>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    {aiModels.map((model) => (
                      <Tooltip key={model.name}>
                        <TooltipTrigger asChild>
                          <img
                            src={`/images/ai-models/${model.name}.svg`}
                            alt={model.display_name}
                            className="w-6 h-6 rounded-full bg-white border"
                          />
                        </TooltipTrigger>
                        <TooltipContent>{model.display_name}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </section>
        <div>
          <h1 className="font-semibold text-strong-950 text-base" aria-label="Billing">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your payment method and access invoices</p>
        </div>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
          <button
            className="button md:whitespace-nowrap text-sm font-normal focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:ring-offset-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground flex h-auto w-full items-center justify-start gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30 group disabled:pointer-events-none disabled:opacity-50"
            type="button"
            aria-label="Payment method: Update card or billing details"
            onClick={handleCardUpdate}
            disabled={loading}
          >


            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium">Payment method</p>
              <p className="text-sm text-muted-foreground">Update card or billing details</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
          </button>
          <button
            className="button md:whitespace-nowrap text-sm font-normal focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:ring-offset-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground flex h-auto w-full items-center justify-start gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30 group disabled:pointer-events-none disabled:opacity-50"
            type="button"
            aria-label="Invoices: View and download past invoices"
            onClick={handleBillingPortal}
            disabled={loading || !hasActiveSubscription}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              {/* FileText icon inline SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text h-5 w-5 text-muted-foreground" aria-hidden="true"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium">Invoices</p>
              <p className="text-sm text-muted-foreground">View and download past invoices</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
          </button>
        </section>
        </div>
      </div>
    </AppLayout>
  );
}
