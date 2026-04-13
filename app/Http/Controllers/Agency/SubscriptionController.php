<?php

namespace App\Http\Controllers\Agency;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Services\StripeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubscriptionController extends Controller
{
    protected StripeService $stripeService;

    public function __construct(StripeService $stripeService)
    {
        $this->stripeService = $stripeService;
    }

    /**
     * Subscribe to a plan - Create Stripe Checkout Session
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'plan' => 'required|in:agency_growth,agency_unlimited',
        ]);

        try {
            $user = Auth::user();
            $planName = $request->input('plan');

            // Check if user already has an active subscription
            $existingSubscription = Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->first();

            if ($existingSubscription) {
                return back()->with('error', 'You already have an active subscription. Please upgrade or cancel first.');
            }

            // Setup plans and get price IDs
            $plans = $this->stripeService->setupPlans();
            $planKey = $planName;

            if (!isset($plans[$planKey])) {
                return back()->withErrors(['plan' => 'Invalid plan selected']);
            }

            $priceId = $plans[$planKey]['price_id'];

            // Get or create Stripe customer
            $customer = $this->stripeService->getOrCreateCustomer(
                $user->email,
                $user->name,
                [
                    'user_id' => $user->id,
                    'user_type' => 'agency',
                ]
            );

            // Create Checkout Session
            $checkoutSession = $this->stripeService->createCheckoutSession(
                $customer->id,
                $priceId,
                [
                    'user_id' => $user->id,
                    'plan_name' => $planName,
                ]
            );

            // Redirect to Stripe Checkout
            return response()->json([
                'checkout_url' => $checkoutSession->url,
            ]);

        } catch (\Exception $e) {
            Log::error('Checkout session creation failed: ' . $e->getMessage());
            return back()->with('error', 'Failed to create checkout session: ' . $e->getMessage());
        }
    }

    /**
     * Handle successful checkout
     */
    public function success(Request $request)
    {
        try {
            $sessionId = $request->query('session_id');
            
            if (!$sessionId) {
                return redirect('/agency/billing')->with('error', 'Invalid checkout session');
            }

            // Retrieve the checkout session
            $session = $this->stripeService->getCheckoutSession($sessionId);

            if (!$session || !$session->subscription) {
                return redirect('/agency/billing')->with('error', 'Subscription not found');
            }

            $user = Auth::user();

            // Check if subscription already exists
            $existingSubscription = Subscription::where('stripe_subscription_id', $session->subscription->id)->first();
            
            if ($existingSubscription) {
                return redirect('/agency/billing')->with('success', 'Welcome back! Your subscription is active.');
            }

            // Store subscription in database
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'stripe_customer_id' => $session->customer->id,
                'stripe_subscription_id' => $session->subscription->id,
                'stripe_price_id' => $session->subscription->items->data[0]->price->id,
                'plan_name' => $session->subscription->metadata->plan_name ?? 'agency_growth',
                'status' => $session->subscription->status,
                'current_period_start' => date('Y-m-d H:i:s', $session->subscription->current_period_start),
                'current_period_end' => date('Y-m-d H:i:s', $session->subscription->current_period_end),
                'cancel_at_period_end' => false,
            ]);

            return redirect('/agency/billing')->with('success', 'Successfully subscribed to ' . ucfirst($subscription->plan_name) . ' plan!');

        } catch (\Exception $e) {
            Log::error('Subscription success handler failed: ' . $e->getMessage());
            return redirect('/agency/billing')->with('error', 'An error occurred while processing your subscription.');
        }
    }

    /**
     * Create subscription with payment method (on-page flow)
     */
    public function subscribeWithPaymentMethod(Request $request)
    {
        $request->validate([
            'plan' => 'required|in:agency_growth,agency_unlimited',
            'payment_method_id' => 'required|string',
        ]);

        try {
            $user = Auth::user();
            $planName = $request->input('plan');
            $paymentMethodId = $request->input('payment_method_id');

            // Check if user already has an active subscription
            $existingSubscription = Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->first();

            if ($existingSubscription) {
                return response()->json(['error' => 'You already have an active subscription. Please upgrade or cancel first.'], 400);
            }

            // Setup plans and get price IDs
            $plans = $this->stripeService->setupPlans();
            $planKey = $planName;

            if (!isset($plans[$planKey])) {
                return response()->json(['error' => 'Invalid plan selected'], 400);
            }

            $priceId = $plans[$planKey]['price_id'];

            // Get or create Stripe customer
            $customer = $this->stripeService->getOrCreateCustomer(
                $user->email,
                $user->name,
                [
                    'user_id' => $user->id,
                    'user_type' => 'agency',
                ]
            );

            // Attach payment method to customer
            $this->stripeService->attachPaymentMethod($paymentMethodId, $customer->id);

            // Apply trial discount only on first-ever subscription (not re-subscribes after cancel)
            $hasEverSubscribed = Subscription::where('user_id', $user->id)->exists();
            $discountPercent = ($user->isOnTrial() && $user->trial_discount > 0 && !$hasEverSubscribed)
                ? (int) $user->trial_discount
                : null;

            // Create subscription
            $stripeSubscription = $this->stripeService->createSubscriptionWithPaymentMethod(
                $customer->id,
                $priceId,
                $paymentMethodId,
                [
                    'user_id' => $user->id,
                    'plan_name' => $planName,
                ],
                $discountPercent
            );

            // Store subscription in database
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'stripe_customer_id' => $customer->id,
                'stripe_subscription_id' => $stripeSubscription->id,
                'stripe_price_id' => $priceId,
                'plan_name' => $planName,
                'status' => $stripeSubscription->status,
                'current_period_start' => date('Y-m-d H:i:s', $stripeSubscription->current_period_start),
                'current_period_end' => date('Y-m-d H:i:s', $stripeSubscription->current_period_end),
                'cancel_at_period_end' => false,
            ]);

            return response()->json([
                'success' => true,
                'subscription' => [
                    'plan_name' => $subscription->plan_name,
                    'status' => $subscription->status,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Subscription with payment method failed: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create subscription: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Upgrade or downgrade subscription
     */
    public function update(Request $request)
    {
        $request->validate([
            'plan' => 'required|in:agency_growth,agency_unlimited',
        ]);

        try {
            $user = Auth::user();
            $newPlanName = $request->input('plan');

            // Get current subscription
            $subscription = Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->firstOrFail();

            if ($subscription->plan_name === $newPlanName) {
                return back()->with('error', 'You are already subscribed to this plan.');
            }

            // Setup plans and get new price ID
            $plans = $this->stripeService->setupPlans();
            $planKey = $newPlanName; // Use the plan name directly
            
            if (!isset($plans[$planKey])) {
                return back()->with('error', 'Invalid plan selected.');
            }
            
            $newPriceId = $plans[$planKey]['price_id'];

            // For manual subscriptions, update plan locally without Stripe
            if ($subscription->is_manual || ! $subscription->stripe_subscription_id) {
                $subscription->update([
                    'plan_name' => $newPlanName,
                ]);

                $action = $newPlanName === 'agency_unlimited' ? 'Upgraded' : 'Downgraded';
                $planDisplay = str_replace('agency_', '', $newPlanName);
                return back()->with('success', $action . ' to ' . ucfirst($planDisplay) . ' plan successfully!');
            }

            // Update subscription on Stripe
            $stripeSubscription = $this->stripeService->updateSubscription(
                $subscription->stripe_subscription_id,
                $newPriceId
            );

            // Update subscription in database
            $subscription->update([
                'stripe_price_id' => $newPriceId,
                'plan_name' => $newPlanName,
                'status' => $stripeSubscription->status,
                'current_period_start' => date('Y-m-d H:i:s', $stripeSubscription->current_period_start),
                'current_period_end' => date('Y-m-d H:i:s', $stripeSubscription->current_period_end),
            ]);

            $action = $newPlanName === 'agency_unlimited' ? 'Upgraded' : 'Downgraded';
            $planDisplay = str_replace('agency_', '', $newPlanName);
            return back()->with('success', $action . ' to ' . ucfirst($planDisplay) . ' plan successfully!');
        } catch (\Exception $e) {
            Log::error('Subscription update failed: ' . $e->getMessage());
            return back()->with('error', 'Failed to update subscription: ' . $e->getMessage());
        }
    }

    /**
     * Handle Stripe webhooks
     */
    public function webhook(Request $request)
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $webhookSecret = SystemSetting::get('stripe_webhook_secret');
        
        try {
            // Verify webhook signature if webhook secret is configured
            if ($webhookSecret) {
                try {
                    $event = \Stripe\Webhook::constructEvent(
                        $payload,
                        $sigHeader,
                        $webhookSecret
                    );
                } catch (\UnexpectedValueException $e) {
                    // Invalid payload
                    Log::error('Invalid webhook payload: ' . $e->getMessage());
                    return response()->json(['error' => 'Invalid payload'], 400);
                } catch (\Stripe\Exception\SignatureVerificationException $e) {
                    // Invalid signature
                    Log::error('Invalid webhook signature: ' . $e->getMessage());
                    return response()->json(['error' => 'Invalid signature'], 400);
                }
            } else {
                // No webhook secret configured - parse manually (not recommended for production)
                Log::warning('Stripe webhook secret not configured. Signature verification skipped.');
                $event = json_decode($payload);
            }

            Log::info('Stripe webhook received: ' . $event->type, ['event_id' => $event->id ?? 'unknown']);

            switch ($event->type) {
                case 'checkout.session.completed':
                    $this->handleCheckoutSessionCompleted($event->data->object);
                    break;

                case 'customer.subscription.updated':
                    $this->handleSubscriptionUpdated($event->data->object);
                    break;

                case 'customer.subscription.deleted':
                    $this->handleSubscriptionDeleted($event->data->object);
                    break;

                case 'invoice.payment_succeeded':
                    Log::info('Payment succeeded for invoice: ' . $event->data->object->id);
                    break;

                case 'invoice.payment_failed':
                    Log::warning('Payment failed for invoice: ' . $event->data->object->id);
                    // Optionally handle failed payments (send email notification, etc.)
                    break;
            }

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            Log::error('Webhook handling failed: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Handle checkout session completed event
     */
    protected function handleCheckoutSessionCompleted($session)
    {
        if ($session->mode !== 'subscription') {
            return;
        }

        // Subscription is already created in the success method
        // This is a backup in case user closes browser before redirect
        Log::info('Checkout completed for subscription: ' . $session->subscription);
    }

    /**
     * Handle subscription updated event
     */
    protected function handleSubscriptionUpdated($stripeSubscription)
    {
        $subscription = Subscription::where('stripe_subscription_id', $stripeSubscription->id)->first();

        if ($subscription) {
            $updateData = [
                'status' => $stripeSubscription->status,
                'current_period_start' => date('Y-m-d H:i:s', $stripeSubscription->current_period_start),
                'current_period_end' => date('Y-m-d H:i:s', $stripeSubscription->current_period_end),
                'cancel_at_period_end' => $stripeSubscription->cancel_at_period_end ?? false,
            ];

            // Update plan if it changed
            if (isset($stripeSubscription->items->data[0]->price->id)) {
                $stripePriceId = $stripeSubscription->items->data[0]->price->id;
                $growthPriceId = SystemSetting::get('stripe_price_id_growth');
                $unlimitedPriceId = SystemSetting::get('stripe_price_id_unlimited');

                if ($stripePriceId === $growthPriceId) {
                    $updateData['plan_name'] = 'agency_growth';
                } elseif ($stripePriceId === $unlimitedPriceId) {
                    $updateData['plan_name'] = 'agency_unlimited';
                }
                $updateData['stripe_price_id'] = $stripePriceId;
            }

            $subscription->update($updateData);

            Log::info('Subscription updated locally', [
                'subscription_id' => $subscription->id,
                'status' => $stripeSubscription->status,
                'cancel_at_period_end' => $stripeSubscription->cancel_at_period_end ?? false
            ]);
        } else {
            Log::warning('Subscription not found for Stripe subscription ID: ' . $stripeSubscription->id);
        }
    }

    /**
     * Handle subscription deleted event
     */
    protected function handleSubscriptionDeleted($stripeSubscription)
    {
        $subscription = Subscription::where('stripe_subscription_id', $stripeSubscription->id)->first();

        if ($subscription) {
            $subscription->update([
                'status' => 'canceled',
                'cancel_at_period_end' => false,
            ]);

            Log::info('Subscription canceled locally', [
                'subscription_id' => $subscription->id,
                'stripe_subscription_id' => $stripeSubscription->id,
                'canceled_at' => now()
            ]);

            // Optionally send cancellation email notification to user
            // Mail::to($subscription->user)->send(new SubscriptionCanceledMail($subscription));
        } else {
            Log::warning('Subscription not found for deletion. Stripe subscription ID: ' . $stripeSubscription->id);
        }
    }


    /**
     * Cancel subscription
     */
    public function cancel(Request $request)
    {
        try {
            $user = Auth::user();

            // Get current subscription
            $subscription = Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->firstOrFail();

            // For manual subscriptions (no Stripe), cancel locally only
            if ($subscription->is_manual || ! $subscription->stripe_subscription_id) {
                $subscription->update([
                    'status' => 'canceled',
                    'cancel_at_period_end' => false,
                    'cancel_at' => now(),
                ]);

                return back()->with('success', 'Subscription has been canceled.');
            }

            // Cancel subscription on Stripe at period end (not immediately)
            $stripeSubscription = $this->stripeService->cancelSubscription(
                $subscription->stripe_subscription_id,
                false // Cancel at period end
            );

            // Update subscription in database
            $cancelAt = $stripeSubscription->cancel_at
                ? date('Y-m-d H:i:s', $stripeSubscription->cancel_at)
                : null;

            $subscription->update([
                'cancel_at_period_end' => true,
                'cancel_at' => $cancelAt,
            ]);

            return back()->with('success', 'Subscription will be canceled at the end of the current billing period.');
        } catch (\Exception $e) {
            Log::error('Subscription cancellation failed: ' . $e->getMessage());
            return back()->with('error', 'Failed to cancel subscription: ' . $e->getMessage());
        }
    }

    /**
     * Reactivate subscription that was scheduled for cancellation
     */
    public function reactivate(Request $request)
    {
        try {
            $user = Auth::user();

            // Get current subscription
            $subscription = Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->where('cancel_at_period_end', true)
                ->firstOrFail();

            // Reactivate subscription on Stripe
            $stripeSubscription = $this->stripeService->reactivateSubscription(
                $subscription->stripe_subscription_id
            );

            // Update subscription in database
            $subscription->update([
                'cancel_at_period_end' => false,
                'cancel_at' => null,
            ]);

            return back()->with('success', 'Subscription has been reactivated successfully.');
        } catch (\Exception $e) {
            Log::error('Subscription reactivation failed: ' . $e->getMessage());
            return back()->with('error', 'Failed to reactivate subscription: ' . $e->getMessage());
        }
    }

    /**
     * Get current subscription status
     */
    public function getStatus()
    {
        try {
            $user = Auth::user();

            $subscription = Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->first();

            if (!$subscription) {
                return response()->json([
                    'has_subscription' => false,
                    'plan_name' => null,
                ]);
            }

            return response()->json([
                'has_subscription' => true,
                'plan_name' => $subscription->plan_name,
                'status' => $subscription->status,
                'cancel_at_period_end' => $subscription->cancel_at_period_end,
                'current_period_end' => $subscription->current_period_end?->format('M d, Y'),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get subscription status: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get subscription status'], 500);
        }
    }

    /**
     * Manually sync subscription with Stripe and return updated status
     */
    /**
     * Create billing portal session for updating payment methods
     */
    public function billingPortal(Request $request)
    {
        try {
            $user = Auth::user();

            // Get active subscription
            $subscription = Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->first();

            if (!$subscription) {
                return response()->json(['error' => 'No active subscription found'], 404);
            }

            // Create billing portal session
            $returnUrl = url('/agency/billing');
            $session = $this->stripeService->createBillingPortalSession(
                $subscription->stripe_customer_id,
                $returnUrl
            );

            return response()->json([
                'url' => $session->url,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create billing portal session: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create billing portal session'], 500);
        }
    }

    /**
     * Create SetupIntent for adding/updating payment method
     */
    public function createSetupIntent(Request $request)
    {
        try {
            $user = Auth::user();

            // Get or create customer
            $customer = $this->stripeService->getOrCreateCustomer(
                $user->email,
                $user->name,
                ['user_id' => $user->id]
            );

            // Create setup intent
            $setupIntent = $this->stripeService->createSetupIntent($customer->id);

            return response()->json([
                'client_secret' => $setupIntent->client_secret,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create setup intent: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create setup intent'], 500);
        }
    }

    /**
     * Attach payment method to customer
     */
    public function attachPaymentMethod(Request $request)
    {
        $request->validate([
            'payment_method_id' => 'required|string',
        ]);

        try {
            $user = Auth::user();

            // Get or create customer
            $customer = $this->stripeService->getOrCreateCustomer(
                $user->email,
                $user->name,
                ['user_id' => $user->id]
            );

            // Attach payment method and set as default
            $paymentMethod = $this->stripeService->attachPaymentMethod(
                $request->payment_method_id,
                $customer->id
            );

            // Update subscription customer_id if exists
            Subscription::where('user_id', $user->id)
                ->update(['stripe_customer_id' => $customer->id]);

            return response()->json([
                'success' => true,
                'payment_method' => [
                    'id' => $paymentMethod->id,
                    'brand' => $paymentMethod->card->brand,
                    'last4' => $paymentMethod->card->last4,
                    'exp_month' => $paymentMethod->card->exp_month,
                    'exp_year' => $paymentMethod->card->exp_year,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to attach payment method: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to attach payment method'], 500);
        }
    }

    /**
     * Get customer payment methods
     */
    public function getPaymentMethods(Request $request)
    {
        try {
            $user = Auth::user();

            // First check if user has an active subscription
            $subscription = Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->first();

            $customerId = null;

            if ($subscription) {
                $customerId = $subscription->stripe_customer_id;
            } else {
                // If no subscription, try to find customer by email
                try {
                    $customer = $this->stripeService->getOrCreateCustomer(
                        $user->email,
                        $user->name,
                        ['user_id' => $user->id]
                    );
                    $customerId = $customer->id;
                } catch (\Exception $e) {
                    // Customer doesn't exist and we can't create one right now
                    return response()->json([
                        'payment_methods' => [],
                        'default_payment_method' => null,
                    ]);
                }
            }

            if (!$customerId) {
                return response()->json([
                    'payment_methods' => [],
                    'default_payment_method' => null,
                ]);
            }

            $paymentMethods = $this->stripeService->getPaymentMethods($customerId);
            $defaultPaymentMethod = $this->stripeService->getDefaultPaymentMethod($customerId);

            $methods = [];
            foreach ($paymentMethods->data as $pm) {
                $methods[] = [
                    'id' => $pm->id,
                    'brand' => $pm->card->brand,
                    'last4' => $pm->card->last4,
                    'exp_month' => $pm->card->exp_month,
                    'exp_year' => $pm->card->exp_year,
                    'is_default' => $defaultPaymentMethod && $defaultPaymentMethod->id === $pm->id,
                ];
            }

            return response()->json([
                'payment_methods' => $methods,
                'default_payment_method' => $defaultPaymentMethod ? [
                    'id' => $defaultPaymentMethod->id,
                    'brand' => $defaultPaymentMethod->card->brand,
                    'last4' => $defaultPaymentMethod->card->last4,
                ] : null,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get payment methods: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get payment methods'], 500);
        }
    }

    /**
     * Sync subscription status with Stripe
     * Checks if local subscription still exists on Stripe and updates accordingly
     */
    public function syncSubscriptionStatus($userId)
    {
        try {
            // Get the most recent subscription for this user (active or not)
            $subscription = Subscription::where('user_id', $userId)
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$subscription || !$subscription->stripe_subscription_id) {
                // Auto-expire manual subscriptions past their period end
                if ($subscription && $subscription->is_manual && $subscription->status === 'active' && $subscription->current_period_end && $subscription->current_period_end->isPast()) {
                    $subscription->update(['status' => 'canceled']);
                    Log::info('Manual subscription auto-expired', ['subscription_id' => $subscription->id, 'user_id' => $userId]);
                }
                return $subscription;
            }

            // Check if subscription exists on Stripe
            try {
                $stripeSubscription = $this->stripeService->getSubscription($subscription->stripe_subscription_id);

                // Get period dates from subscription items (Stripe stores them there)
                $periodStart = null;
                $periodEnd = null;
                
                if (isset($stripeSubscription->items->data[0])) {
                    $periodStart = $stripeSubscription->items->data[0]->current_period_start ?? null;
                    $periodEnd = $stripeSubscription->items->data[0]->current_period_end ?? null;
                }

                // Log the raw Stripe data for debugging
                Log::info('Stripe subscription data retrieved', [
                    'subscription_id' => $subscription->id,
                    'stripe_subscription_id' => $stripeSubscription->id,
                    'stripe_status' => $stripeSubscription->status,
                    'stripe_cancel_at_period_end' => $stripeSubscription->cancel_at_period_end ?? false,
                    'stripe_cancel_at' => $stripeSubscription->cancel_at ?? null,
                    'stripe_canceled_at' => $stripeSubscription->canceled_at ?? null,
                    'current_period_start' => $periodStart,
                    'current_period_end' => $periodEnd,
                    'current_period_start_formatted' => $periodStart ? date('Y-m-d H:i:s', $periodStart) : 'null',
                    'current_period_end_formatted' => $periodEnd ? date('Y-m-d H:i:s', $periodEnd) : 'null',
                ]);

                // Check if period dates are missing
                if (!$periodStart || !$periodEnd) {
                    Log::error('Stripe subscription missing period dates', [
                        'subscription_id' => $subscription->id,
                        'stripe_subscription_id' => $stripeSubscription->id,
                    ]);
                    return $subscription; // Return existing subscription without updating
                }

                // Determine if subscription is canceling
                // Check both cancel_at_period_end flag AND cancel_at timestamp
                $isCanceling = ($stripeSubscription->cancel_at_period_end ?? false) || ($stripeSubscription->cancel_at !== null);

                // Update local subscription with Stripe data
                $updateData = [
                    'status' => $stripeSubscription->status,
                    'cancel_at_period_end' => $isCanceling,
                    'cancel_at' => $stripeSubscription->cancel_at ? date('Y-m-d H:i:s', $stripeSubscription->cancel_at) : null,
                    'current_period_start' => date('Y-m-d H:i:s', $periodStart),
                    'current_period_end' => date('Y-m-d H:i:s', $periodEnd),
                ];

                Log::info('Update data prepared', [
                    'cancel_at_raw' => $stripeSubscription->cancel_at,
                    'cancel_at_formatted' => $updateData['cancel_at'],
                ]);

                // If subscription is canceled/expired on Stripe, update locally
                if (in_array($stripeSubscription->status, ['canceled', 'incomplete_expired', 'unpaid'])) {
                    $updateData['status'] = 'canceled';
                }

                // Check if plan changed
                if (isset($stripeSubscription->items->data[0]->price->id)) {
                    $stripePriceId = $stripeSubscription->items->data[0]->price->id;
                    $updateData['stripe_price_id'] = $stripePriceId;
                    
                    $growthPriceId = \App\Models\SystemSetting::get('stripe_price_id_growth');
                    $unlimitedPriceId = \App\Models\SystemSetting::get('stripe_price_id_unlimited');

                    if ($stripePriceId === $growthPriceId) {
                        $updateData['plan_name'] = 'agency_growth';
                    } elseif ($stripePriceId === $unlimitedPriceId) {
                        $updateData['plan_name'] = 'agency_unlimited';
                    }
                }

                $subscription->update($updateData);

                Log::info('Subscription synced with Stripe', [
                    'subscription_id' => $subscription->id,
                    'stripe_status' => $stripeSubscription->status,
                    'local_status' => $updateData['status'],
                    'cancel_at_period_end' => $updateData['cancel_at_period_end'],
                ]);

                // Return fresh subscription data (including active subscriptions scheduled for cancellation)
                $freshSub = $subscription->fresh();
                return $freshSub->status === 'active' ? $freshSub : null;

            } catch (\Stripe\Exception\InvalidRequestException $e) {
                // Subscription doesn't exist on Stripe (was deleted)
                if (strpos($e->getMessage(), 'No such subscription') !== false) {
                    $subscription->update([
                        'status' => 'canceled',
                        'cancel_at_period_end' => false,
                    ]);

                    Log::warning('Subscription not found on Stripe, marked as canceled locally', [
                        'subscription_id' => $subscription->id,
                        'stripe_subscription_id' => $subscription->stripe_subscription_id,
                    ]);

                    return null; // Return null since subscription is canceled
                }
                
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Failed to sync subscription status: ' . $e->getMessage(), [
                'user_id' => $userId,
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Return existing active subscription even if sync fails
            return Subscription::where('user_id', $userId)
                ->where('status', 'active')
                ->first();
        }
    }
}
