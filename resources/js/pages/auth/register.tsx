import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle,Check } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AuthLayout from '@/layouts/auth-layout';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
};

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm<Required<RegisterForm>>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'brand', // Default to brand role
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout title="Account Type " description="">
            <Head title="Register" />
            <form className="flex flex-col gap-6" onSubmit={submit}>

                <div className="grid gap-3">
                    <RadioGroup value={data.role} onValueChange={(value: string) => setData('role', value)} className="grid grid-cols-1 lg:grid-cols-2 gap-3" >
                        <div className="rounded-lg border p-5 shadow-xl hover:shadow-2xl account-type">
                            <Label htmlFor="brand" className="flex-1 cursor-pointer">
                                <div className="font-bold text-orange-600 flex items-center justify-between text-2xl mb-5"><RadioGroupItem value="brand" id="brand" className='radio-btn'/> Brand</div>
                                <div className="text-md text-muted-foreground leading-5">We'll manage posts snd maximize AI visibility for a standalone brand.</div>
                                <hr className='my-5'/>
                                <ul className='p-0 m-0'>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600'/> Single brand</li>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600'/> Company analytics</li>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600'/> Brand optimization</li>
                                </ul>
                            </Label>
                        </div>
                        <div className="rounded-lg border p-5 shadow-xl hover:shadow-2xl account-type">
                            <Label htmlFor="agency" className="flex-1 cursor-pointer">
                                <div className="font-bold text-orange-600 flex items-center justify-between text-2xl mb-5"><RadioGroupItem value="agency" id="agency" className='radio-btn'/> Agency</div>
                                <div className="text-md text-muted-foreground leading-5">We'll enhance AI visibility and manage posts for an agency serving multiple brand clients.</div>
                                <hr className='my-5'/>
                                <ul className='p-0 m-0'>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600'/> Multiple brands</li>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600'/> Client Management</li>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600'/> Multi-brand analytics</li>
                                </ul>
                            </Label>
                        </div>
                    </RadioGroup>
                    <InputError message={errors.role} />
                </div>

                <div className="grid">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            className='form-control'
                            id="name"
                            type="text"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={processing}
                            placeholder="Full name"
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            className='form-control'
                            id="email"
                            type="email"
                            required
                            tabIndex={2}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            disabled={processing}
                            placeholder="email@example.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            className='form-control'
                            id="password"
                            type="password"
                            required
                            tabIndex={3}
                            autoComplete="new-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            disabled={processing}
                            placeholder="Password"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirm password</Label>
                        <Input
                            className='form-control'
                            id="password_confirmation"
                            type="password"
                            required
                            tabIndex={4}
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            disabled={processing}
                            placeholder="Confirm password"
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>
                    <Button type="submit" className="mt-5 w-full primary-btn uppercase font-bold" tabIndex={5} disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Create account
                    </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <TextLink href={route('login')} tabIndex={6}>
                        Log in
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
