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
import { AlertTriangle, Building2, LogOut, Pipette, Trash2 } from 'lucide-react';
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
    color: string;
};
type PasswordForm = {
    current_password: string;
    password: string;
    password_confirmation: string;
};

export default function Agency({ agency }: { agency: { name: string; url?: string; logo?: string; color?: string } }) {
const { data, setData, post, errors, processing, recentlySuccessful } = useForm<AgencyForm>({
    name: agency.name || '',
    url: agency.url || '',
    logo: null, // Always null - only for new uploads
    color: agency.color || '',
});
const cleanup = useMobileNavigation();
const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const { delete: deleteAgency, processing: deleteProcessing } = useForm({});

const handleDeleteAgency = () => {
    deleteAgency(route('settings.agency.delete'), {
        onSuccess: () => {
            setShowDeleteConfirm(false);
        },
    });
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


    // Helper function to normalize color values
    const normalizeColor = (color: string): string => {
        if (!color) return '';
        
        // Remove any whitespace
        color = color.trim();
        
        // If it doesn't start with #, add it
        if (!color.startsWith('#')) {
            color = '#' + color;
        }
        
        // Convert 3-digit hex to 6-digit hex
        if (color.length === 4 && color.startsWith('#')) {
            color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        
        // Ensure it's lowercase for consistency
        return color.toLowerCase();
    };

    const handleColorChange = (value: string) => {
        const normalizedColor = normalizeColor(value);
        setData('color', normalizedColor);
    };

    const pickColorFromScreen = async () => {
        if (!('EyeDropper' in window)) {
            alert('Eyedropper is not supported in this browser.');
            return;
        }

        try {
            // @ts-ignore
            const eyeDropper = new window.EyeDropper();
            const result = await eyeDropper.open();
            handleColorChange(result.sRGBHex);
        } catch {
            // user cancelled
        }
    };


    return (
        <AppLayout title="Agency Settings" breadcrumbs={breadcrumbs} logo={agency.logo} website={agency.url}>
            <Head title="Agency settings" />
            <div className="lg:px-4 lg:py-6 px-0 py-0">
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
                                    <div className="height=[150px] rounded-md border border-solid border-gray-300 flex gap-4 flex-col justify-center min-h-70 px-10">
                                        <p className="text-xs text-muted-foreground"> PNG, JPG or SVG (max 2MB) </p>
                                        <div className='relative lg:flex block items-center gap-4'>
                                            <input type="file" id="logo" accept="image/*" className="hidden" onChange={(e) => setData('logo', e.target.files ? e.target.files[0] : null) } />
                                            <label htmlFor="logo" className="cursor-pointer block rounded-md border border-dashed border-gray-300 px-6 py-4 text-sm text-gray-600 transition hover:border-primary hover:bg-muted lg:mb-0 mb-5" >
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
                                        <div className="flex items-center justify-end">
                                            <div className="lg:flex block items-center gap-4 w-full">
                                              {/*   <Link href="/" className="cancle-btn primary-btn lg:mb-0 mb-5">
                                                    Cancel
                                                </Link>*/}

                                                <Button type="submit" disabled={processing} className='primary-btn lg:w-auto w-full'>
                                                    Update logo
                                                </Button>
                                                <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0" >
                                                    <p className="text-sm text-muted-foreground">Saved.</p>
                                                </Transition>
                                            </div>
                                        </div>
                                    </div>
                                    <InputError className="mt-2" message={errors.logo} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Agency Color</Label>
                                    <div className="height=[150px] rounded-md border border-solid border-gray-300 flex gap-4 flex-col justify-center min-h-70 px-10">

                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-4">
                                                
                                                {/* Eyedropper */}
                                                <div className="flex items-center gap-2 clorsvg">
                                                    {/* <span className="text-sm text-gray-600">Pick from screen:</span> */}
                                                    <Button type="button" variant="outline" onClick={pickColorFromScreen} className="text-sm h-20 w-20 " ><Pipette/> </Button>
                                                </div>
                                                {/* Native color picker */}
                                                {/* <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-600">Color Picker:</span>
                                                    <input
                                                        type="color"
                                                        value={data.color}
                                                        onChange={(e) => handleColorChange(e.target.value)}
                                                        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                                                        title="Select agency color"
                                                    />
                                                </div> */}
                                                <hr className='v-line'/>

                                                {/* Manual input */}
                                                <div className="flex gap-10">
                                                    <div className="gap-2">
                                                        <span className="text-sm text-gray-600">Color Picker:</span>
                                                        <Input
                                                            type="text"
                                                            value={data.color}
                                                            onChange={(e) => handleColorChange(e.target.value)}
                                                            placeholder="#3b82f6 or #abc"
                                                            className="form-control text-sm"
                                                        />
                                                    </div>
                                                    {/* Preview */}
                                                    <div className="gap-2">
                                                        <span className="text-sm text-gray-500">Preview:</span>
                                                        <div
                                                            className="w-16 h-12 rounded-md border border-gray-300"
                                                            style={{ backgroundColor: data.color }}
                                                            title={`Color: ${data.color}`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                           
                                        </div>

                                        <InputError className="mt-2" message={errors.color} />
                                        
                                        <div className="flex items-center justify-end">
                                            <div className="lg:flex block items-center gap-4 w-full">
                                               {/* <Link href="/" className="cancle-btn primary-btn lg:mb-0 mb-5">
                                                    Cancel
                                                </Link> */}
                                                <Button type="submit" disabled={processing} className='primary-btn lg:w-auto w-full'>
                                                    Update color   
                                                </Button>
                                                <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0" >
                                                    <p className="text-sm text-muted-foreground">Saved.</p>
                                                </Transition>
                                            </div>
                                        </div>
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
                            <form onSubmit={submitPassword} className="">
                                <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
                                    <div className="grid gap-2">
                                        <Label htmlFor="current_password">Current Password</Label>
                                        <Input
                                            id="current_password"
                                            type="password"
                                            className="max-w-md form-control"
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
                                            className="max-w-md form-control"
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
                                            className="max-w-md form-control"
                                            value={passwordData.password_confirmation}
                                            onChange={(e) => setPasswordData('password_confirmation', e.target.value)}
                                            autoComplete="new-password"
                                            placeholder="Confirm new password"
                                        />
                                        <InputError className="mt-2" message={passwordErrors.password_confirmation} />
                                    </div>
                                </div>

                                <div className="flex items-center">
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

                    {/* Danger Zone */}
                    <Card className="border-red-200">
                        <CardHeader>
                            <CardTitle className="text-red-600">Danger Zone</CardTitle>
                            <CardDescription>Irreversible and destructive actions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Delete Agency Account</p>
                                    <p className="text-sm text-muted-foreground">Permanently delete this agency and all associated data</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Agency
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Delete Confirmation Dialog */}
                    {showDeleteConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-red-600">Delete Agency Account</h2>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <p className="text-sm font-medium">Are you absolutely sure? This action <span className="font-bold underline">cannot be undone</span>.</p>
                                    <div className="rounded-md bg-red-50 border border-red-200 p-3 space-y-2">
                                        <p className="text-sm font-semibold text-red-700">The following will be permanently deleted:</p>
                                        <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                                            <li>Your agency account and profile</li>
                                            <li>All brands associated with this agency</li>
                                            <li>All brand data including posts, mentions, and analytics</li>
                                            <li>All agency members and their access</li>
                                            <li>All settings, integrations, and configurations</li>
                                        </ul>
                                    </div>
                                    <p className="text-sm text-muted-foreground">This process is <span className="font-bold text-red-600">irreversible</span>. Once deleted, there is no way to recover any of this data.</p>
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={deleteProcessing}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        onClick={handleDeleteAgency}
                                        disabled={deleteProcessing}
                                    >
                                        {deleteProcessing ? 'Deleting...' : 'Yes, Delete Everything'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
