import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Check, Eye, EyeOff } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CountrySelector } from '@/components/ui/country-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AuthLayout from '@/layouts/auth-layout';
import { usStatesCities } from '@/data/us-states-cities';
import { canadaProvincesCities } from '@/data/canada-provinces-cities';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
    website?: string;
    country?: string;
    region?: string;
};

type ValidationErrors = {
    name?: string;
    email?: string;
    website?: string;
    password?: string;
    password_confirmation?: string;
};

export default function Register() {
    const { data, setData, post, processing, errors, reset, transform, clearErrors } = useForm<Required<RegisterForm>>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'agency', // Default to agency role
        website: '',
        country: '',
        region: '',
    });

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const [selectedState, setSelectedState] = useState<string>('');
    const [selectedProvince, setSelectedProvince] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedCACity, setSelectedCACity] = useState<string>('');

    const isUS = data.country === 'US';
    const isCanada = data.country === 'CA';
    const usCities = isUS && selectedState ? usStatesCities[selectedState] || [] : [];
    const caCities = isCanada && selectedProvince ? canadaProvincesCities[selectedProvince] || [] : [];

    const handleCountryChange = (value: string) => {
        setData('country', value);
        setSelectedState('');
        setSelectedProvince('');
        setSelectedCity('');
        setSelectedCACity('');
        setData('region', '');
    };

    const handleStateChange = (value: string) => {
        setSelectedState(value);
        setSelectedCity('');
        setData('region', value);
    };

    const handleProvinceChange = (value: string) => {
        setSelectedProvince(value);
        setSelectedCACity('');
        setData('region', value);
    };

    const handleUSCityChange = (value: string) => {
        setSelectedCity(value);
        setData('region', selectedState + ', ' + value);
    };

    const handleCACityChange = (value: string) => {
        setSelectedCACity(value);
        setData('region', selectedProvince + ', ' + value);
    };

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
        clearErrors('name');
        const error = validateName(value);
        setValidationErrors((prev) => ({ ...prev, name: error }));
    };

    const handleEmailChange = (value: string) => {
        setData('email', value);
        clearErrors('email');
        const error = validateEmail(value);
        setValidationErrors((prev) => ({ ...prev, email: error }));
    };

    const handleWebsiteChange = (value: string) => {
        const processedValue = value.replace(/^https?:\/\//, '');

        setData('website', processedValue);
        clearErrors('website');
        const error = validateWebsite(processedValue);
        setValidationErrors((prev) => ({ ...prev, website: error }));
    };

    const handlePasswordChange = (value: string) => {
        setData('password', value);
        clearErrors('password');
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
        clearErrors('password_confirmation');
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

        const hasErrors = Object.values(newErrors).some((error) => error !== undefined);

        if (hasErrors) {
            return;
        }

        transform((data) => ({
            ...data,
            website: data.role === 'brand' && data.website ? `https://${data.website}` : data.website,
        }));

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout title="Sign Up " description="">
            <Head title="Register" />
            <form className="flex flex-col gap-6" onSubmit={submit}>

                
                 
                <div className="">
                    <RadioGroup value={data.role} onValueChange={(value: string) => setData('role', value)} className="grid grid-cols-1 gap-3 max-w-sm mx-auto" >
                     { /*  <div className="rounded-lg border p-5 shadow-xl hover:shadow-2xl account-type">
                            <Label htmlFor="brand" className="flex-1 cursor-pointer">
                                <div className="font-bold text-orange-600 flex items-center justify-between text-2xl mb-5"><RadioGroupItem value="brand" id="brand" className='radio-btn' /> Brand</div>
                                <div className="text-md text-muted-foreground leading-5">We'll manage posts and maximize AI visibility for a standalone brand.</div>
                                <hr className='my-5' />
                                <ul className='p-0 m-0'>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600' /> Single brand</li>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600' /> Company analytics</li>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600' /> Brand optimization</li>
                                </ul>
                            </Label>
                        </div>*/  }
                        <div className="rounded-lg border p-5 shadow-xl hover:shadow-2xl account-type">
                            <Label htmlFor="agency" className="flex-1 cursor-pointer">
                                <div className="text-md text-muted-foreground leading-5">We'll enhance AI visibility and manage posts for a company serving multiple campaigns and brand clients.</div>
                                <hr className='my-5' />
                                <ul className='p-0 m-0'>
                                    <li className='flex gap-2 items-center text-muted-foreground'><Check className='w-5 font-bold text-orange-600' /> Multiple campaigns</li>
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
                            type="text"
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
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">https://</span>
                                    <Input
                                        className='form-control !mb-0 pl-16'
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
                                </div>
                                <InputError message={validationErrors.website || errors.website} className="-mt-1" />
                            </div>

                            <div className="grid gap-2 mb-5">
                                <Label htmlFor="country">Country</Label>
                                <CountrySelector
                                    value={data.country}
                                    onValueChange={handleCountryChange}
                                    placeholder="Select country..."
                                    className="form-control !mb-0"
                                />
                                <InputError message={errors.country} className="-mt-1" />
                            </div>

                            {isUS ? (
                                <>
                                    <div className="grid gap-2 mb-5">
                                        <Label htmlFor="state">State</Label>
                                        <Select value={selectedState} onValueChange={handleStateChange}>
                                            <SelectTrigger className="form-control cursor-pointer !mb-0">
                                                <SelectValue placeholder="Select a state" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(usStatesCities).map((state) => (
                                                    <SelectItem key={state} value={state}>
                                                        {state}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedState && (
                                        <div className="grid gap-2 mb-5">
                                            <Label htmlFor="city">City</Label>
                                            <Select value={selectedCity} onValueChange={handleUSCityChange}>
                                                <SelectTrigger className="form-control cursor-pointer !mb-0">
                                                    <SelectValue placeholder="Select a city" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {usCities.map((city) => (
                                                        <SelectItem key={city} value={city}>
                                                            {city}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </>
                            ) : isCanada ? (
                                <>
                                    <div className="grid gap-2 mb-5">
                                        <Label htmlFor="province">Province / Territory</Label>
                                        <Select value={selectedProvince} onValueChange={handleProvinceChange}>
                                            <SelectTrigger className="form-control cursor-pointer !mb-0">
                                                <SelectValue placeholder="Select a province or territory" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(canadaProvincesCities).map((prov) => (
                                                    <SelectItem key={prov} value={prov}>
                                                        {prov}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedProvince && (
                                        <div className="grid gap-2 mb-5">
                                            <Label htmlFor="city">City</Label>
                                            <Select value={selectedCACity} onValueChange={handleCACityChange}>
                                                <SelectTrigger className="form-control cursor-pointer !mb-0">
                                                    <SelectValue placeholder="Select a city" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {caCities.map((city) => (
                                                        <SelectItem key={city} value={city}>
                                                            {city}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="grid gap-2 mb-5">
                                    <Label htmlFor="region">Region</Label>
                                    <Input
                                        id="region"
                                        value={data.region}
                                        onChange={(e) => setData('region', e.target.value)}
                                        placeholder="Specify States, Provinces, cities, custom areas within the country"
                                        className="form-control !mb-0"
                                        tabIndex={4}
                                    />
                                    <InputError message={errors.region} className="-mt-1" />
                                </div>
                            )}
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
