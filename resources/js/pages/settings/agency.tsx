import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Agency settings',
        href: '/settings/agency',
    },
];

type AgencyForm = {
    name: string;
    url: string;
};

export default function Agency({ agency }: { agency: { name: string; url?: string } }) {
    const { data, setData, post, errors, processing, recentlySuccessful } = useForm<AgencyForm>({
        name: agency.name || '',
        url: agency.url || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('settings.agency.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agency settings" />

            <div className="px-4 py-6">
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall title="Agency Settings" description="Manage your agency information" />

                    <form onSubmit={submit} className="space-y-6">
                        {/* Agency Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Agency Information</CardTitle>
                                <CardDescription>Update your agency name and URL</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Agency Name</Label>
                                    <Input
                                        id="name"
                                        className="mt-1 block w-full"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                        placeholder="Enter your agency name"
                                    />
                                    <InputError className="mt-2" message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="url">Agency URL</Label>
                                    <Input
                                        id="url"
                                        type="url"
                                        className="mt-1 block w-full"
                                        value={data.url}
                                        onChange={(e) => setData('url', e.target.value)}
                                        placeholder="https://youragency.com"
                                    />
                                    <InputError className="mt-2" message={errors.url} />
                                    <p className="text-sm text-muted-foreground">
                                        Your agency website or online presence
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Save Button */}
                        <div className="flex items-center gap-4">
                            <Button type="submit" disabled={processing}>
                                Save Changes
                            </Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-muted-foreground">Saved.</p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
