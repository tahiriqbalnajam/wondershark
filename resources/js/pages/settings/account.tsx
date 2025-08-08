import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Account settings',
        href: '/settings/account',
    },
];

type EmailForm = {
    email: string;
};

type PasswordForm = {
    current_password: string;
    password: string;
    password_confirmation: string;
};

export default function Account({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;

    // Email form
    const { 
        data: emailData, 
        setData: setEmailData, 
        patch: patchEmail, 
        errors: emailErrors, 
        processing: emailProcessing, 
        recentlySuccessful: emailRecentlySuccessful 
    } = useForm<Required<EmailForm>>({
        email: auth.user.email,
    });

    // Password form
    const { 
        data: passwordData, 
        setData: setPasswordData, 
        put: putPassword, 
        errors: passwordErrors, 
        processing: passwordProcessing, 
        recentlySuccessful: passwordRecentlySuccessful,
        reset: resetPassword
    } = useForm<Required<PasswordForm>>({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submitEmail: FormEventHandler = (e) => {
        e.preventDefault();
        patchEmail(route('profile.update'), {
            preserveScroll: true,
        });
    };

    const submitPassword: FormEventHandler = (e) => {
        e.preventDefault();
        putPassword(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => resetPassword(),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Account settings" />

            <SettingsLayout>
                <div className="space-y-8">
                    <HeadingSmall title="Account Settings" description="Manage your account security and preferences" />

                    {/* Email Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Address</CardTitle>
                            <CardDescription>Update your email address for account communications</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitEmail} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        className="max-w-md"
                                        value={emailData.email}
                                        onChange={(e) => setEmailData('email', e.target.value)}
                                        required
                                        autoComplete="username"
                                        placeholder="Email address"
                                    />
                                    <InputError className="mt-2" message={emailErrors.email} />
                                </div>

                                {mustVerifyEmail && auth.user.email_verified_at === null && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                        <p className="text-sm text-yellow-800">
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={route('verification.send')}
                                                method="post"
                                                as="button"
                                                className="text-yellow-800 underline hover:no-underline"
                                            >
                                                Click here to resend the verification email.
                                            </Link>
                                        </p>

                                        {status === 'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                A new verification link has been sent to your email address.
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center gap-4">
                                    <Button disabled={emailProcessing}>
                                        {emailProcessing ? 'Saving...' : 'Update Email'}
                                    </Button>

                                    <Transition
                                        show={emailRecentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-green-600">Email updated successfully!</p>
                                    </Transition>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Separator />

                    {/* Password Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Password</CardTitle>
                            <CardDescription>Change your password to keep your account secure</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitPassword} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="current_password">Current Password</Label>
                                    <Input
                                        id="current_password"
                                        type="password"
                                        className="max-w-md"
                                        value={passwordData.current_password}
                                        onChange={(e) => setPasswordData('current_password', e.target.value)}
                                        autoComplete="current-password"
                                        placeholder="Enter current password"
                                    />
                                    <InputError className="mt-2" message={passwordErrors.current_password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        className="max-w-md"
                                        value={passwordData.password}
                                        onChange={(e) => setPasswordData('password', e.target.value)}
                                        autoComplete="new-password"
                                        placeholder="Enter new password"
                                    />
                                    <InputError className="mt-2" message={passwordErrors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">Confirm New Password</Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        className="max-w-md"
                                        value={passwordData.password_confirmation}
                                        onChange={(e) => setPasswordData('password_confirmation', e.target.value)}
                                        autoComplete="new-password"
                                        placeholder="Confirm new password"
                                    />
                                    <InputError className="mt-2" message={passwordErrors.password_confirmation} />
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button disabled={passwordProcessing}>
                                        {passwordProcessing ? 'Updating...' : 'Update Password'}
                                    </Button>

                                    <Transition
                                        show={passwordRecentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-green-600">Password updated successfully!</p>
                                    </Transition>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
