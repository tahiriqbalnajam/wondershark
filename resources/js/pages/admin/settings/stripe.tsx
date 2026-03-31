import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Save, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface StripeSettings {
    stripe_mode: string;
    stripe_test_publishable_key: string;
    stripe_test_secret_key: string;
    stripe_live_publishable_key: string;
    stripe_live_secret_key: string;
}

interface Props {
    settings: StripeSettings;
}

export default function StripeSettings({ settings }: Props) {
    const { data, setData, post, processing } = useForm({
        stripe_mode: settings.stripe_mode || 'test',
        stripe_test_publishable_key: settings.stripe_test_publishable_key || '',
        stripe_test_secret_key: settings.stripe_test_secret_key || '',
        stripe_live_publishable_key: settings.stripe_live_publishable_key || '',
        stripe_live_secret_key: settings.stripe_live_secret_key || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/settings/stripe/update', {
            onSuccess: () => {
                toast.success('Stripe settings updated successfully');
            },
            onError: () => {
                toast.error('Failed to update Stripe settings');
            },
        });
    };

    return (
        <AppLayout title="Stripe Settings">
            <Head title="Stripe Settings" />

            <div className="mx-auto p-8">
                <form onSubmit={handleSubmit}>
                    <Card className="mb-6">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                <CardTitle>Stripe Configuration</CardTitle>
                            </div>
                            <CardDescription>
                                Configure your Stripe API keys and select the mode (test or live)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Mode Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="stripe_mode" className="text-base font-semibold">
                                    Stripe Mode
                                </Label>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            id="mode_test"
                                            name="stripe_mode"
                                            value="test"
                                            checked={data.stripe_mode === 'test'}
                                            onChange={(e) => setData('stripe_mode', e.target.value)}
                                            className="h-4 w-4"
                                        />
                                        <Label htmlFor="mode_test" className="font-normal cursor-pointer">
                                            Test Mode
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            id="mode_live"
                                            name="stripe_mode"
                                            value="live"
                                            checked={data.stripe_mode === 'live'}
                                            onChange={(e) => setData('stripe_mode', e.target.value)}
                                            className="h-4 w-4"
                                        />
                                        <Label htmlFor="mode_live" className="font-normal cursor-pointer">
                                            Live Mode
                                        </Label>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {data.stripe_mode === 'test' 
                                        ? 'Currently using test API keys. No real charges will be made.'
                                        : 'Currently using live API keys. Real charges will be processed.'}
                                </p>
                            </div>

                            <hr className="my-6" />

                            {/* Test Keys */}
                            <div className="space-y-4">
                                <h3 className="text-base font-semibold">Test API Keys</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="stripe_test_publishable_key">
                                        Test Publishable Key
                                    </Label>
                                    <Input
                                        id="stripe_test_publishable_key"
                                        type="text"
                                        value={data.stripe_test_publishable_key}
                                        onChange={(e) => setData('stripe_test_publishable_key', e.target.value)}
                                        placeholder="pk_test_..."
                                        className="font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Your Stripe test publishable key (starts with pk_test_)
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="stripe_test_secret_key">
                                        Test Secret Key
                                    </Label>
                                    <Input
                                        id="stripe_test_secret_key"
                                        type="password"
                                        value={data.stripe_test_secret_key}
                                        onChange={(e) => setData('stripe_test_secret_key', e.target.value)}
                                        placeholder="sk_test_..."
                                        className="font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Your Stripe test secret key (starts with sk_test_)
                                    </p>
                                </div>
                            </div>

                            <hr className="my-6" />

                            {/* Live Keys */}
                            <div className="space-y-4">
                                <h3 className="text-base font-semibold">Live API Keys</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="stripe_live_publishable_key">
                                        Live Publishable Key
                                    </Label>
                                    <Input
                                        id="stripe_live_publishable_key"
                                        type="text"
                                        value={data.stripe_live_publishable_key}
                                        onChange={(e) => setData('stripe_live_publishable_key', e.target.value)}
                                        placeholder="pk_live_..."
                                        className="font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Your Stripe live publishable key (starts with pk_live_)
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="stripe_live_secret_key">
                                        Live Secret Key
                                    </Label>
                                    <Input
                                        id="stripe_live_secret_key"
                                        type="password"
                                        value={data.stripe_live_secret_key}
                                        onChange={(e) => setData('stripe_live_secret_key', e.target.value)}
                                        placeholder="sk_live_..."
                                        className="font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Your Stripe live secret key (starts with sk_live_)
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing} className="gap-2">
                            <Save className="h-4 w-4" />
                            Save Stripe Settings
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
