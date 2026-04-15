<?php

namespace App\Http\Controllers\Brand;

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
            'plan' => 'required|in:brand_growth',
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
            $plans = $this->stripeService->setupBrandPlans();
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
                    'user_type' => 'brand',
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
                return redirect('/brand/billing')->with('error', 'Invalid checkout session');
            }

            // Retrieve the checkout session
            $session = $this->stripeService->getCheckoutSession($sessionId);

            if (!$session || !$session->subscription) {
                return redirect('/brand/billing')->with('error', 'Subscription not found');
            }

            $user = Auth::user();

            // Check subscription status and payment status from Stripe
            $subscriptionStatus = $session->subscription->status;
            $paymentIntentStatus = null;
            
            if (isset($session->subscription->latest_invoice->payment_intent)) {
                $paymentIntentStatus = $session->subscription->latest_invoice->payment_intent->status;
            }

            // Only proceed if both subscription is active and payment succeeded
            if ($subscriptionStatus !== 'active' || $paymentIntentStatus !== 'succeeded') {
                $errorMessage = 'Payment failed or is incomplete. Your subscription was not activated.';
                
                // Add more specific error details if available
                if ($paymentIntentStatus === 'requires_payment_method' && 
                    isset($session->subscription->latest_invoice->payment_intent->last_payment_error)) {
                    $errorMessage .= ' Reason: ' . $session->subscription->latest_invoice->payment_intent->last_payment_error->message;
                }
                
                Log::warning('Checkout session payment failed', [
                    'user_id' => $user->id,
                    'session_id' => $sessionId,
                    'subscription_status' => $subscriptionStatus,
                    'payment_status' => $paymentIntentStatus,
                ]);
                
                return redirect('/brand/billing')->with('error', $errorMessage);
            }

            // Check if subscription already exists
            $existingSubscription = Subscription::where('stripe_subscription_id', $session->subscription->id)->first();
            
            if ($existingSubscription) {
                return redirect('/brand/billing')->with('success', 'Welcome back! Your subscription is active.');
            }

            // Store subscription in database
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'stripe_customer_id' => $session->customer->id,
                'stripe_subscription_id' => $session->subscription->id,
                'stripe_price_id' => $session->subscription->items->data[0]->price->id,
                'plan_name' => $session->subscription->metadata->plan_name ?? 'brand_growth',
                'status' => $session->subscription->status,
                'current_period_start' => date('Y-m-d H:i:s', $session->subscription->current_period_start),
                'current_period_end' => date('Y-m-d H:i:s', $session->subscription->current_period_end),
                'cancel_at_period_end' => false,
            ]);

            return redirect('/brand/billing')->with('success', 'Successfully subscribed to ' . ucfirst($subscription->plan_name) . ' plan!');

        } catch (\Exception $e) {
            Log::error('Subscription success handler failed: ' . $e->getMessage());
            return redirect('/brand/billing')->with('error', 'An error occurred while processing your subscription.');
        }
    }

    /**
     * Create subscription with payment method (on-page flow)
     */
    public function subscribeWithPaymentMethod(Request $request)
    {
        $request->validate([
            'plan' => 'required|in:brand_growth',
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
            $plans = $this->stripeService->setupBrandPlans();
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
                    'user_type' => 'brand',
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

            // Check if payment was successful
            $subscriptionStatus = $stripeSubscription->status;
            $paymentIntentStatus = null;

            if (isset($stripeSubscription->latest_invoice->payment_intent)) {
                $paymentIntentStatus = $stripeSubscription->latest_invoice->payment_intent->status;
            }

            // Subscription is good if active or trialing
            $isSubscriptionGood = in_array($subscriptionStatus, ['active', 'trialing']);
            // Payment is good if there's no payment_intent (free/$0 invoice) or it succeeded
            $isPaymentGood = ($paymentIntentStatus === null || $paymentIntentStatus === 'succeeded');

            if (!$isSubscriptionGood || !$isPaymentGood) {
                // Cancel the incomplete Stripe subscription so nothing is left dangling
                try {
                    $this->stripeService->cancelSubscription($stripeSubscription->id);
                } catch (\Exception $cancelEx) {
                    Log::error('Failed to cancel incomplete subscription: ' . $cancelEx->getMessage());
                }

                // Build a user-facing error message — prefer Stripe's own error text
                $stripeError = $stripeSubscription->latest_invoice->payment_intent->last_payment_error->message ?? null;

                if ($stripeError) {
                    $errorMessage = $stripeError;
                } elseif ($paymentIntentStatus === 'requires_action') {
                    $errorMessage = 'Your card requires additional authentication.';
                } else {
                    $errorMessage = 'Payment failed. Please try a different payment method.';
                }

                Log::warning('Subscription payment failed', [
                    'user_id' => $user->id,
                    'subscription_status' => $subscriptionStatus,
                    'payment_intent_status' => $paymentIntentStatus,
                    'stripe_subscription_id' => $stripeSubscription->id,
                ]);

                return response()->json(['error' => $errorMessage], 402);
            }

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
            'plan' => 'required|in:brand_growth',
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
            $plans = $this->stripeService->setupBrandPlans();
            $planKey = $newPlanName;
            
            if (!isset($plans[$planKey])) {
                return back()->with('error', 'Invalid plan selected.');
            }
            
            $newPriceId = $plans[$planKey]['price_id'];

            // For manual subscriptions, update plan locally without Stripe
            if ($subscription->is_manual || ! $subscription->stripe_subscription_id) {
                $subscription->update([
                    'plan_name' => $newPlanName,
                ]);

                $planDisplay = str_replace('brand_', '', $newPlanName);
                return back()->with('success', 'Updated to ' . ucfirst($planDisplay) . ' plan successfully!');
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

            $planDisplay = str_replace('brand_', '', $newPlanName);
            return back()->with('success', 'Updated to ' . ucfirst($planDisplay) . ' plan successfully!');
        } catch (\Exception $e) {
            Log::error('Subscription update failed: ' . $e->getMessage());
            return back()->with('error', 'Failed to update subscription: ' . $e->getMessage());
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
            $returnUrl = url('/brand/billing');
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
                ['user_id' => $user->id, 'user_type' => 'brand']
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
                ['user_id' => $user->id, 'user_type' => 'brand']
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
                        ['user_id' => $user->id, 'user_type' => 'brand']
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
                // No subscription locally, nothing to sync
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

                // Check if period dates are missing
                if (!$periodStart || !$periodEnd) {
                    Log::error('Stripe subscription missing period dates', [
                        'subscription_id' => $subscription->id,
                        'stripe_subscription_id' => $stripeSubscription->id,
                    ]);
                    return $subscription; // Return existing subscription without updating
                }

                // Determine if subscription is canceling
                $isCanceling = ($stripeSubscription->cancel_at_period_end ?? false) || ($stripeSubscription->cancel_at !== null);

                // Update local subscription with Stripe data
                $updateData = [
                    'status' => $stripeSubscription->status,
                    'cancel_at_period_end' => $isCanceling,
                    'cancel_at' => $stripeSubscription->cancel_at ? date('Y-m-d H:i:s', $stripeSubscription->cancel_at) : null,
                    'current_period_start' => date('Y-m-d H:i:s', $periodStart),
                    'current_period_end' => date('Y-m-d H:i:s', $periodEnd),
                ];

                // If subscription is canceled/expired on Stripe, update locally
                if (in_array($stripeSubscription->status, ['canceled', 'incomplete_expired', 'unpaid'])) {
                    $updateData['status'] = 'canceled';
                }

                // Check if plan changed
                if (isset($stripeSubscription->items->data[0]->price->id)) {
                    $stripePriceId = $stripeSubscription->items->data[0]->price->id;
                    $updateData['stripe_price_id'] = $stripePriceId;
                    
                    $growthPriceId = \App\Models\SystemSetting::get('stripe_brand_price_id_growth');

                    if ($stripePriceId === $growthPriceId) {
                        $updateData['plan_name'] = 'brand_growth';
                    }
                }

                $subscription->update($updateData);

                Log::info('Brand subscription synced with Stripe', [
                    'subscription_id' => $subscription->id,
                    'stripe_status' => $stripeSubscription->status,
                    'cancel_at_period_end' => $isCanceling,
                ]);

                return $subscription->fresh();

            } catch (\Stripe\Exception\InvalidRequestException $e) {
                // Subscription doesn't exist on Stripe anymore
                if (str_contains($e->getMessage(), 'No such subscription')) {
                    Log::warning('Subscription not found on Stripe, marking as canceled', [
                        'subscription_id' => $subscription->id,
                        'stripe_subscription_id' => $subscription->stripe_subscription_id,
                    ]);

                    $subscription->update([
                        'status' => 'canceled',
                        'cancel_at_period_end' => false,
                    ]);

                    return $subscription->fresh();
                }

                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Failed to sync brand subscription status: ' . $e->getMessage(), [
                'user_id' => $userId,
                'exception' => get_class($e),
            ]);

            // Return the subscription as-is if sync fails
            return $subscription ?? null;
        }
    }
}
