import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Mail } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

type MagicLinkForm = {
    email: string;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const [useMagicLink, setUseMagicLink] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    const magicLinkForm = useForm<MagicLinkForm>({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const submitMagicLink: FormEventHandler = (e) => {
        e.preventDefault();
        magicLinkForm.post(route('magic-link.send'), {
            preserveScroll: true,
        });
    };

    return (
        <AuthLayout title="Log in to your account" description="Enter your email and password below to log in">
            <Head title="Log in" />

            {status && <div className="mb-4 rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-600">{status}</div>}

            {/* Toggle between password and magic link */}
            <div className="mb-6 flex gap-2 rounded-lg bg-muted p-1">
                <button
                    type="button"
                    onClick={() => setUseMagicLink(false)}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        !useMagicLink
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Password
                </button>
                <button
                    type="button"
                    onClick={() => setUseMagicLink(true)}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        useMagicLink
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Magic Link
                </button>
            </div>

            {!useMagicLink ? (
                <form className="flex flex-col gap-6" onSubmit={submit}>
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="email@example.com"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Password</Label>
                                {canResetPassword && (
                                    <TextLink href={route('password.request')} className="ml-auto text-sm" tabIndex={5}>
                                        Forgot password?
                                    </TextLink>
                                )}
                            </div>
                            <Input
                                id="password"
                                type="password"
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Password"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="remember"
                                name="remember"
                                checked={data.remember}
                                onClick={() => setData('remember', !data.remember)}
                                tabIndex={3}
                            />
                            <Label htmlFor="remember">Remember me</Label>
                        </div>

                        <Button type="submit" className="mt-4 w-full" tabIndex={4} disabled={processing}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            Log in
                        </Button>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <TextLink href={route('register')} tabIndex={5}>
                            Sign up
                        </TextLink>
                    </div>
                </form>
            ) : (
                <form className="flex flex-col gap-6" onSubmit={submitMagicLink}>
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="magic-email">Email address</Label>
                            <Input
                                id="magic-email"
                                type="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                value={magicLinkForm.data.email}
                                onChange={(e) => magicLinkForm.setData('email', e.target.value)}
                                placeholder="email@example.com"
                            />
                            <InputError message={magicLinkForm.errors.email} />
                        </div>

                        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                            <div className="flex gap-2">
                                <Mail className="h-5 w-5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">No password needed!</p>
                                    <p className="mt-1 text-blue-700">
                                        We'll send you a secure login link via email. Click it to instantly access your account.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="mt-4 w-full" tabIndex={2} disabled={magicLinkForm.processing}>
                            {magicLinkForm.processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            <Mail className="h-4 w-4 mr-2" />
                            Send Magic Link
                        </Button>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <TextLink href={route('register')} tabIndex={3}>
                            Sign up
                        </TextLink>
                    </div>
                </form>
            )}
        </AuthLayout>
    );
}
