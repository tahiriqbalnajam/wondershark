import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Building2, LogOut, } from 'lucide-react';
import { Link, router, usePage } from '@inertiajs/react';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Agency Settings',
        href: '/settings/agency',
    },
];

type AgencyForm = {
    name: string;
    url: string;
    // can be a File when selected, or a string URL/path returned from the server
    logo: File | string | null;
};
type PasswordForm = {
    current_password: string;
    password: string;
    password_confirmation: string;
};

export default function Agency({ agency }: { agency: { name: string; url?: string; logo?: string } }) {
const { data, setData, post, errors, processing, recentlySuccessful } = useForm<AgencyForm>({
    name: agency.name || '',
    url: agency.url || '',
    logo: agency.logo || null,
});
const cleanup = useMobileNavigation();
const handleLogout = () => {
        cleanup();
        router.flushAll();
    };
const [logoPreview, setLogoPreview] = useState<string | undefined>(() => agency.logo || undefined);

useEffect(() => {
    let objectUrl: string | undefined;
    if (data.logo && typeof data.logo !== 'string') {
        objectUrl = URL.createObjectURL(data.logo);
        setLogoPreview(objectUrl);
    } else {
        setLogoPreview(typeof data.logo === 'string' ? data.logo : agency.logo);
    }
    return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
}, [data.logo, agency.logo]);

const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('settings.agency.update'), {
        forceFormData: true,
        preserveScroll: true,
    });
};
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
const submitPassword: FormEventHandler = (e) => {
        e.preventDefault();
        putPassword(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => resetPassword(),
        });
    };

    return (
        <AppLayout title="Agency Settings" breadcrumbs={breadcrumbs} logo={agency.logo} website={agency.url}>
            <Head title="Agency settings" />
            <div className="px-4 py-6">
                <div className="space-y-6">
                    <form onSubmit={submit} className="space-y-6">
                        <Card>
                            <CardHeader className='flex flex-row items-center gap-3'>
                                <span className="w-[45px] h-[45px] bg-gray-200 flex items-center justify-center rounded">
                                    <Building2 />
                                </span>
                                <div>
                                    <CardTitle>Edit Agency</CardTitle>
                                    <CardDescription>Update Your Agency Name, URL and Logo</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Agency Name</Label>
                                    <Input id="name" className="mt-1 block w-full form-control" value={data.name} onChange={(e) => setData('name', e.target.value)} required placeholder="Enter your agency name" />
                                    <InputError className="mt-2" message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="url">Agency URL</Label>
                                    <Input id="url" type="url" className="mt-1 block w-full form-control" value={data.url} onChange={(e) => setData('url', e.target.value)} placeholder="https://youragency.com" />
                                    <InputError className="mt-2" message={errors.url} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Agency Logo</Label>
                                    <div className="height=[150px] rounded-md border border-solid border-gray-300 flex items-center gap-4 flex-col justify-center min-h-50">
                                        <p className="text-xs text-muted-foreground"> PNG, JPG or SVG (max 2MB) </p>
                                        <div className='relative flex items-center gap-4'>
                                            <input type="file" id="logo" accept="image/*" className="hidden" onChange={(e) => setData('logo', e.target.files ? e.target.files[0] : null) } />
                                            <label htmlFor="logo" className="cursor-pointer rounded-md border border-dashed border-gray-300 px-6 py-4 text-sm text-gray-600 transition hover:border-primary hover:bg-muted" >
                                                {
                                                    // show selected file name, or basename of existing logo URL, or placeholder
                                                    data.logo
                                                        ? (typeof data.logo === 'string' ? data.logo.split('/').pop() : data.logo.name)
                                                        : (agency.logo ? agency.logo.split('/').pop() : 'Click to upload logo')
                                                }
                                            </label>
                                            {(logoPreview) && (
                                                <img src={logoPreview} alt="Logo Preview" className="h-14 w-14 rounded-md object-contain border" />
                                            )}
                                        </div>
                                    </div>
                                    <InputError className="mt-2" message={errors.logo} />
                                </div>
                                <div className="flex items-center justify-end">
                                    <div className="flex items-center gap-4">
                                        <Link href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                                            Cancel
                                        </Link>
                                        <Button type="submit" disabled={processing} className='primary-btn'>
                                            Save Changes
                                        </Button>
                                        <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0" >
                                            <p className="text-sm text-muted-foreground">Saved.</p>
                                        </Transition>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
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
                                <div className="flex items-center justify-end">
                                    <div className="flex items-center gap-4">
                                        <Button className='primary-btn' disabled={passwordProcessing}>
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
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                    <div className="flex justify-start">
                        <Link className="primary-btn btn-logout" method="post" href={route('logout')} as="button" onClick={handleLogout}>
                            <LogOut className="mr-2" />
                            Logout
                        </Link>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
