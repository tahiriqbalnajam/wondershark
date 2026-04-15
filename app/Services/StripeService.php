<?php

namespace App\Services;

use App\Models\SystemSetting;
use Stripe\Stripe;
use Stripe\Customer;
use Stripe\Product;
use Stripe\Price;
use Stripe\Subscription;
use Stripe\StripeClient;

class StripeService
{
    protected StripeClient $stripe;
    protected string $mode;

    public function __construct()
    {
        $this->mode = SystemSetting::get('stripe_mode', 'test');
        
        if ($this->mode === 'live') {
            $secretKey = SystemSetting::get('stripe_live_secret_key');
        } else {
            $secretKey = SystemSetting::get('stripe_test_secret_key');
        }

        if (!$secretKey) {
            throw new \Exception('Stripe secret key not configured for ' . $this->mode . ' mode');
        }

        Stripe::setApiKey($secretKey);
        $this->stripe = new StripeClient($secretKey);
    }

    /**
     * Get or create a Stripe customer
     */
    public function getOrCreateCustomer(string $email, string $name, array $metadata = [])
    {
        // Search for existing customer
        $customers = $this->stripe->customers->search([
            'query' => "email:'{$email}'",
            'limit' => 1,
        ]);

        if (count($customers->data) > 0) {
            return $customers->data[0];
        }

        // Create new customer
        return $this->stripe->customers->create([
            'email' => $email,
            'name' => $name,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Get or create a Stripe product
     */
    public function getOrCreateProduct(string $name, string $description = '')
    {
        // Search for existing product by name
        $products = $this->stripe->products->search([
            'query' => "name:'{$name}' AND active:'true'",
            'limit' => 1,
        ]);

        if (count($products->data) > 0) {
            return $products->data[0];
        }

        // Create new product
        return $this->stripe->products->create([
            'name' => $name,
            'description' => $description,
        ]);
    }

    /**
     * Get or create a recurring price for a product
     */
    public function getOrCreatePrice(string $productId, int $amountInCents, string $currency = 'usd', string $interval = 'month')
    {
        // Search for existing price
        $prices = $this->stripe->prices->search([
            'query' => "product:'{$productId}' AND active:'true' AND type:'recurring'",
            'limit' => 10,
        ]);

        foreach ($prices->data as $price) {
            if ($price->unit_amount === $amountInCents && 
                $price->currency === $currency && 
                $price->recurring->interval === $interval) {
                return $price;
            }
        }

        // Create new price
        return $this->stripe->prices->create([
            'product' => $productId,
            'unit_amount' => $amountInCents,
            'currency' => $currency,
            'recurring' => ['interval' => $interval],
        ]);
    }

    /**
     * Create a subscription
     */
    public function createSubscription(string $customerId, string $priceId, array $metadata = [])
    {
        return $this->stripe->subscriptions->create([
            'customer' => $customerId,
            'items' => [
                ['price' => $priceId],
            ],
            'metadata' => $metadata,
        ]);
    }

    /**
     * Update a subscription (upgrade/downgrade)
     */
    public function updateSubscription(string $subscriptionId, string $newPriceId)
    {
        $subscription = $this->stripe->subscriptions->retrieve($subscriptionId);
        
        return $this->stripe->subscriptions->update($subscriptionId, [
            'items' => [
                [
                    'id' => $subscription->items->data[0]->id,
                    'price' => $newPriceId,
                ],
            ],
            'proration_behavior' => 'create_prorations',
        ]);
    }

    /**
     * Cancel a subscription
     */
    public function cancelSubscription(string $subscriptionId, bool $immediately = false)
    {
        if ($immediately) {
            return $this->stripe->subscriptions->cancel($subscriptionId);
        }

        // Cancel at period end
        return $this->stripe->subscriptions->update($subscriptionId, [
            'cancel_at_period_end' => true,
        ]);
    }

    /**
     * Reactivate a subscription that was scheduled for cancellation
     */
    public function reactivateSubscription(string $subscriptionId)
    {
        return $this->stripe->subscriptions->update($subscriptionId, [
            'cancel_at_period_end' => false,
        ]);
    }

    /**
     * Get customer's active subscriptions
     */
    public function getCustomerSubscriptions(string $customerId)
    {
        return $this->stripe->subscriptions->all([
            'customer' => $customerId,
            'status' => 'active',
            'limit' => 10,
        ]);
    }

    /**
     * Get subscription by ID
     */
    public function getSubscription(string $subscriptionId)
    {
        return $this->stripe->subscriptions->retrieve($subscriptionId);
    }

    /**
     * Create a Checkout Session for subscription
     */
    public function createCheckoutSession(string $customerId, string $priceId, array $metadata = [])
    {
        $successUrl = url('/agency/subscriptions/success?session_id={CHECKOUT_SESSION_ID}');
        $cancelUrl = url('/agency/billing');

        return $this->stripe->checkout->sessions->create([
            'customer' => $customerId,
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price' => $priceId,
                'quantity' => 1,
            ]],
            'mode' => 'subscription',
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'subscription_data' => [
                'metadata' => $metadata,
            ],
            'payment_method_collection' => 'always',
            'customer_update' => [
                'name' => 'auto',
                'address' => 'auto',
            ],
            'allow_promotion_codes' => true,
        ]);
    }

    /**
     * Retrieve a checkout session
     */
    public function getCheckoutSession(string $sessionId)
    {
        return $this->stripe->checkout->sessions->retrieve($sessionId, [
            'expand' => ['subscription', 'customer', 'subscription.latest_invoice.payment_intent'],
        ]);
    }

    /**
     * Setup plans (Agency Growth and Agency Unlimited)
     */
    public function setupPlans()
    {
        $plans = [
            [
                'name' => 'Agency Growth',
                'key' => 'agency_growth',
                'price' => 299*100, // $299 in cents
                'description' => 'Growth plan with up to 3 brands',
            ],
            [
                'name' => 'Agency Unlimited',
                'key' => 'agency_unlimited',
                'price' => 999*100, // $999 in cents
                'description' => 'Unlimited plan with unlimited brands',
            ],
        ];

        $result = [];

        foreach ($plans as $plan) {
            $product = $this->getOrCreateProduct($plan['name'], $plan['description']);
            $price = $this->getOrCreatePrice($product->id, $plan['price']);
            
            $result[$plan['key']] = [
                'product_id' => $product->id,
                'price_id' => $price->id,
                'amount' => $plan['price'],
            ];
        }

        return $result;
    }

    /**
     * Setup brand plans (Brand Growth and Brand Unlimited)
     */
    public function setupBrandPlans()
    {
        $plans = [
            [
                'name' => 'Brand Growth',
                'key' => 'brand_growth',
                'price' => 199*100, // $199 in cents
                'description' => 'Growth plan for brand users',
            ]
        ];

        $result = [];

        foreach ($plans as $plan) {
            $product = $this->getOrCreateProduct($plan['name'], $plan['description']);
            $price = $this->getOrCreatePrice($product->id, $plan['price']);
            
            $result[$plan['key']] = [
                'product_id' => $product->id,
                'price_id' => $price->id,
                'amount' => $plan['price'],
            ];
        }

        return $result;
    }

    /**
     * Create a Billing Portal Session for managing payment methods and invoices
     */
    public function createBillingPortalSession(string $customerId, string $returnUrl)
    {
        return $this->stripe->billingPortal->sessions->create([
            'customer' => $customerId,
            'return_url' => $returnUrl,
        ]);
    }

    /**
     * Create a SetupIntent for collecting payment method
     */
    public function createSetupIntent(string $customerId)
    {
        return $this->stripe->setupIntents->create([
            'customer' => $customerId,
            'payment_method_types' => ['card'],
        ]);
    }

    /**
     * Attach payment method to customer and set as default
     */
    public function attachPaymentMethod(string $paymentMethodId, string $customerId)
    {
        // Retrieve current state of the payment method
        $paymentMethod = $this->stripe->paymentMethods->retrieve($paymentMethodId);

        if ($paymentMethod->customer && $paymentMethod->customer !== $customerId) {
            // PM is attached to a different customer — cannot reuse across accounts
            throw new \Exception('This card is already associated with another account. Please use a different card.');
        }

        // Only attach if not already attached to this customer (SetupIntent may have already done it)
        if (!$paymentMethod->customer) {
            $this->stripe->paymentMethods->attach($paymentMethodId, [
                'customer' => $customerId,
            ]);
        }

        // Set as default payment method
        $this->stripe->customers->update($customerId, [
            'invoice_settings' => [
                'default_payment_method' => $paymentMethodId,
            ],
        ]);

        return $this->stripe->paymentMethods->retrieve($paymentMethodId);
    }

    /**
     * Get customer's payment methods
     */
    public function getPaymentMethods(string $customerId)
    {
        return $this->stripe->paymentMethods->all([
            'customer' => $customerId,
            'type' => 'card',
        ]);
    }

    /**
     * Get customer's default payment method
     */
    public function getDefaultPaymentMethod(string $customerId)
    {
        $customer = $this->stripe->customers->retrieve($customerId);
        
        if (isset($customer->invoice_settings->default_payment_method)) {
            return $this->stripe->paymentMethods->retrieve(
                $customer->invoice_settings->default_payment_method
            );
        }

        return null;
    }

    /**
     * Create subscription with specific payment method
     */
    public function createSubscriptionWithPaymentMethod(
        string $customerId,
        string $priceId,
        string $paymentMethodId,
        array $metadata = [],
        ?int $discountPercent = null
    ) {
        $params = [
            'customer' => $customerId,
            'items' => [
                ['price' => $priceId],
            ],
            'default_payment_method' => $paymentMethodId,
            'metadata' => $metadata,
            'expand' => ['latest_invoice.payment_intent'],
        ];

        if ($discountPercent && $discountPercent > 0 && $discountPercent <= 100) {
            $coupon = $this->getOrCreateTrialCoupon($discountPercent);
            $params['discounts'] = [['coupon' => $coupon->id]];
        }

        return $this->stripe->subscriptions->create($params);
    }

    /**
     * Get or create a one-time trial discount coupon (applies to first invoice only).
     */
    public function getOrCreateTrialCoupon(int $percentOff): \Stripe\Coupon
    {
        $couponId = 'trial_discount_' . $percentOff . 'pct';

        try {
            return $this->stripe->coupons->retrieve($couponId);
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            // Coupon doesn't exist yet, create it
            return $this->stripe->coupons->create([
                'id'          => $couponId,
                'percent_off' => $percentOff,
                'duration'    => 'once',
                'name'        => "{$percentOff}% off first month (trial)",
            ]);
        }
    }
}
