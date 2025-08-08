import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Upload } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'General settings',
        href: '/settings/general',
    },
];

type GeneralForm = {
    agency_name: string;
    logo: File | null;
};

export default function General({ agencyData }: { agencyData?: { name: string; logo?: string } }) {
    const { auth } = usePage<SharedData>().props;
    const [previewUrl, setPreviewUrl] = useState<string | null>(agencyData?.logo || null);

    const { data, setData, post, errors, processing, recentlySuccessful } = useForm<GeneralForm>({
        agency_name: agencyData?.name || auth.user.name,
        logo: null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('settings.general.update'), {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('logo', file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="General settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="General Settings" description="Manage your agency information and branding" />

                    <form onSubmit={submit} className="space-y-6">
                        {/* Agency Name */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Agency Information</CardTitle>
                                <CardDescription>Update your agency name and basic information</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="agency_name">Agency Name</Label>
                                    <Input
                                        id="agency_name"
                                        className="mt-1 block w-full"
                                        value={data.agency_name}
                                        onChange={(e) => setData('agency_name', e.target.value)}
                                        required
                                        placeholder="Enter your agency name"
                                    />
                                    <InputError className="mt-2" message={errors.agency_name} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Logo Upload */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Agency Logo</CardTitle>
                                <CardDescription>Upload your agency logo (PNG, JPG, or SVG)</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4">
                                    {/* Logo Preview */}
                                    {previewUrl && (
                                        <div className="flex justify-center">
                                            <div className="relative h-32 w-32 rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden">
                                                <img 
                                                    src={previewUrl} 
                                                    alt="Agency logo preview" 
                                                    className="h-full w-full object-contain"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Upload Button */}
                                    <div className="flex justify-center">
                                        <label 
                                            htmlFor="logo-upload" 
                                            className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        >
                                            <Upload className="h-4 w-4" />
                                            {previewUrl ? 'Change Logo' : 'Upload Logo'}
                                        </label>
                                        <input
                                            id="logo-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="hidden"
                                        />
                                    </div>
                                    <InputError className="mt-2" message={errors.logo} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Save Button */}
                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>
                                {processing ? 'Saving...' : 'Save Changes'}
                            </Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-green-600">Changes saved successfully!</p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
