import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Check, Eye, EyeOff } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CountrySelector } from '@/components/ui/country-selector';
import AuthLayout from '@/layouts/auth-layout';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
    website?: string;
    country?: string;
};

type ValidationErrors = {
    name?: string;
    email?: string;
    website?: string;
    password?: string;
    password_confirmation?: string;
};

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm<Required<RegisterForm>>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'brand', // Default to brand role
        website: '',
        country: '',
    });

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    const validateName = (name: string): string | undefined => {
        if (!name.trim()) {
            return 'Name is required';
        }
        if (/^\d+$/.test(name.trim())) {
            return 'Name cannot contain only digits';
        }
        if (name.trim().length < 2) {
            return 'Name must be at least 2 characters';
        }
        return undefined;
    };

    const validateEmail = (email: string): string | undefined => {
        if (!email.trim()) {
            return 'Email address is required';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return 'Please enter a valid email address (e.g., email@example.com)';
        }
        return undefined;
    };

    const validateWebsite = (website: string): string | undefined => {
        if (data.role === 'brand' && !website.trim()) {
            return 'Website URL is required';
        }
        if (website.trim() && !website.startsWith('http://') && !website.startsWith('https://')) {
            return 'Website URL should start with https://';
        }
        return undefined;
    };

    const validatePassword = (password: string): string | undefined => {
        if (!password) {
            return 'Password is required';
        }
        if (password.length < 8) {
            return 'Password must be at least 8 characters';
        }
        return undefined;
    };

    const validatePasswordConfirmation = (password: string, confirmation: string): string | undefined => {
        if (!confirmation) {
            return 'Please confirm your password';
        }
        if (password !== confirmation) {
            return 'Passwords do not match';
        }
        return undefined;
    };

    const handleNameChange = (value: string) => {
        setData('name', value);
        const error = validateName(value);
        setValidationErrors((prev) => ({ ...prev, name: error }));
    };

    const handleEmailChange = (value: string) => {
        setData('email', value);
        const error = validateEmail(value);
        setValidationErrors((prev) => ({ ...prev, email: error }));
    };

    const handleWebsiteChange = (value: string) => {
        let processedValue = value;
        
        // Auto-add https:// if user starts typing without protocol
        if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
            processedValue = 'https://' + value;
        }
        
        setData('website', processedValue);
        const error = validateWebsite(processedValue);
        setValidationErrors((prev) => ({ ...prev, website: error }));
    };

    const handlePasswordChange = (value: string) => {
        setData('password', value);
        const error = validatePassword(value);
        setValidationErrors((prev) => ({ ...prev, password: error }));
        
        // Revalidate confirmation if it exists
        if (data.password_confirmation) {
            const confirmError = validatePasswordConfirmation(value, data.password_confirmation);
            setValidationErrors((prev) => ({ ...prev, password_confirmation: confirmError }));
        }
    };

    const handlePasswordConfirmationChange = (value: string) => {
        setData('password_confirmation', value);
        const error = validatePasswordConfirmation(data.password, value);
        setValidationErrors((prev) => ({ ...prev, password_confirmation: error }));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        // Validate all fields
        const nameError = validateName(data.name);
        const emailError = validateEmail(data.email);
        const websiteError = data.role === 'brand' ? validateWebsite(data.website) : undefined;
        const passwordError = validatePassword(data.password);
        const passwordConfirmError = validatePasswordConfirmation(data.password, data.password_confirmation);

        const newErrors: ValidationErrors = {
            name: nameError,
            email: emailError,
            website: websiteError,
            password: passwordError,
            password_confirmation: passwordConfirmError,
        };

        setValidationErrors(newErrors);

        // Check if there are any validation errors
        const hasErrors = Object.values(newErrors).some((error) => error !== undefined);

        if (hasErrors) {
            // Show an alert with the first error
            const firstError = Object.values(newErrors).find((error) => error !== undefined);
            alert(firstError);
            return;
        }

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
                                <div className="font-bold text-orange-600 flex items-center justify-between text-2xl mb-5"><RadioGroupItem value="brand" id="brand" className='radio-btn' /> Brand</div>
                                <div className="text-md text-muted-foreground leading-5">We'll manage posts snd maximize AI visibility for a standalone brand.</div>
                                <hr className='my-5' />
                                <ul className='p-0 m-0'>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600' /> Single brand</li>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600' /> Company analytics</li>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600' /> Brand optimization</li>
                                </ul>
                            </Label>
                        </div>
                        <div className="rounded-lg border p-5 shadow-xl hover:shadow-2xl account-type">
                            <Label htmlFor="agency" className="flex-1 cursor-pointer">
                                <div className="font-bold text-orange-600 flex items-center justify-between text-2xl mb-5"><RadioGroupItem value="agency" id="agency" className='radio-btn' /> Agency</div>
                                <div className="text-md text-muted-foreground leading-5">We'll enhance AI visibility and manage posts for an agency serving multiple brand clients.</div>
                                <hr className='my-5' />
                                <ul className='p-0 m-0'>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600' /> Multiple brands</li>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600' /> Client Management</li>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600' /> Multi-brand analytics</li>
                                </ul>
                            </Label>
                        </div>
                    </RadioGroup>
                    <InputError message={errors.role} />
                </div>



                <div className="grid">
                    <div className="grid gap-2 mb-5">
                        <Label htmlFor="name">{data.role === 'brand' ? 'Brand Name' : 'Agency Name'}</Label>
                        <Input
                            className='form-control !mb-0'
                            id="name"
                            type="text"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="name"
                            value={data.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            disabled={processing}
                            placeholder={data.role === 'brand' ? 'Your brand name' : 'Your agency name'}
                        />
                        <InputError message={validationErrors.name || errors.name} className="-mt-1" />
                    </div>

                    <div className="grid gap-2 mb-5">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            className='form-control !mb-0'
                            id="email"
                            type="email"
                            required
                            tabIndex={2}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            disabled={processing}
                            placeholder="email@example.com"
                        />
                        <InputError message={validationErrors.email || errors.email} className="-mt-1" />
                    </div>

                    {data.role === 'brand' && (
                        <>
                            <div className="grid gap-2 mb-5">
                                <Label htmlFor="website">Website/URL</Label>
                                <Input
                                    className='form-control !mb-0'
                                    id="website"
                                    type="text"
                                    required
                                    tabIndex={3}
                                    autoComplete="url"
                                    value={data.website}
                                    onChange={(e) => handleWebsiteChange(e.target.value)}
                                    disabled={processing}
                                    placeholder="example.com"
                                />
                                <InputError message={validationErrors.website || errors.website} className="-mt-1" />
                            </div>

                            <div className="grid gap-2 mb-5">
                                <Label htmlFor="country">Country</Label>
                                <CountrySelector
                                    value={data.country}
                                    onValueChange={(value) => setData('country', value)}
                                    placeholder="Select country..."
                                    className="form-control !mb-0"
                                />
                                <InputError message={errors.country} className="-mt-1" />
                            </div>
                        </>
                    )}

                    <div className="grid gap-2 mb-5">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                className='form-control !mb-0 pr-10'
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                tabIndex={5}
                                autoComplete="new-password"
                                value={data.password}
                                onChange={(e) => handlePasswordChange(e.target.value)}
                                disabled={processing}
                                placeholder="Password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((current) => !current)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-600"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                aria-pressed={showPassword}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <InputError message={validationErrors.password || errors.password} className="-mt-1" />
                    </div>

                    <div className="grid gap-2 mb-5">
                        <Label htmlFor="password_confirmation">Confirm password</Label>
                        <div className="relative">
                            <Input
                                className='form-control !mb-0 pr-10'
                                id="password_confirmation"
                                type={showPasswordConfirmation ? 'text' : 'password'}
                                required
                                tabIndex={6}
                                autoComplete="new-password"
                                value={data.password_confirmation}
                                onChange={(e) => handlePasswordConfirmationChange(e.target.value)}
                                disabled={processing}
                                placeholder="Confirm password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswordConfirmation((current) => !current)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-600"
                                aria-label={showPasswordConfirmation ? 'Hide password confirmation' : 'Show password confirmation'}
                                aria-pressed={showPasswordConfirmation}
                            >
                                {showPasswordConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <InputError message={validationErrors.password_confirmation || errors.password_confirmation} className="-mt-1" />
                    </div>
                    <Button type="submit" className="mt-5 w-full primary-btn uppercase font-bold" tabIndex={7} disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Create account
                    </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <TextLink href={route('login')} tabIndex={8}>
                        Log in
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
