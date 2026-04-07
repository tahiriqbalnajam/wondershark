import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, ArrowLeft, Clock, CreditCard } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Role {
    id: number;
    name: string;
    guard_name: string;
}

interface CreateUserPageProps {
    roles: Role[];
}

const PLAN_OPTIONS = [
    { value: 'trial', label: 'Trial' },
    { value: 'free', label: 'Free' },
    { value: 'agency_growth', label: 'Agency Growth' },
    { value: 'agency_unlimited', label: 'Agency Unlimited' },
];

export default function CreateUser({ roles }: CreateUserPageProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        roles: [] as string[],
        trial_option: 'A' as 'A' | 'B' | 'subscription',
        trial_days: 7,
        trial_discount: 50,
        plan_name: 'agency_growth',
        subscription_expires_at: '',
        admin_note: '',
    });

    const handleRoleChange = (roleName: string, checked: boolean) => {
        if (checked) {
            setData('roles', [...data.roles, roleName]);
        } else {
            setData('roles', data.roles.filter(role => role !== roleName));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('users.store'));
    };

    return (
        <AppLayout>
            <Head title="Create User" />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href={route('users.index')}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Users
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <UserPlus className="h-7 w-7" />
                            Create User
                        </h1>
                        <p className="text-muted-foreground">Add a new user to the system</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* User Information + Trial & Subscription side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* User Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>User Information</CardTitle>
                                <CardDescription>Enter the details for the new user</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        placeholder="Enter full name"
                                        className={errors.name ? 'border-red-500' : ''}
                                    />
                                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={e => setData('email', e.target.value)}
                                        placeholder="Enter email address"
                                        className={errors.email ? 'border-red-500' : ''}
                                    />
                                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        placeholder="Enter password"
                                        className={errors.password ? 'border-red-500' : ''}
                                    />
                                    {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)}
                                        placeholder="Confirm password"
                                        className={errors.password_confirmation ? 'border-red-500' : ''}
                                    />
                                    {errors.password_confirmation && <p className="text-sm text-red-500">{errors.password_confirmation}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>Roles</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {roles.map((role) => (
                                            <div key={role.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`role-${role.id}`}
                                                    checked={data.roles.includes(role.name)}
                                                    onCheckedChange={(checked) =>
                                                        handleRoleChange(role.name, checked as boolean)
                                                    }
                                                />
                                                <Label htmlFor={`role-${role.id}`} className="text-sm">
                                                    {role.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.roles && <p className="text-sm text-red-500">{errors.roles}</p>}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Trial & Subscription */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Trial & Subscription
                                </CardTitle>
                                <CardDescription>
                                    Choose how this account will be activated
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Option A */}
                                <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${data.trial_option === 'A' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="trial_option"
                                        value="A"
                                        checked={data.trial_option === 'A'}
                                        onChange={() => setData('trial_option', 'A')}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium">Option A — Free Trial</div>
                                        <p className="text-sm text-muted-foreground">
                                            User gets a free trial period. Paywall appears on the last 4 days with a countdown and a configurable first month discount.
                                        </p>
                                        {data.trial_option === 'A' && (
                                            <div className="mt-3 flex flex-wrap gap-4">
                                                <div>
                                                    <Label htmlFor="trial_days">Trial Duration (days)</Label>
                                                    <Input
                                                        id="trial_days"
                                                        type="number"
                                                        min={1}
                                                        max={365}
                                                        value={data.trial_days}
                                                        onChange={e => setData('trial_days', parseInt(e.target.value) || 7)}
                                                        className="w-32 mt-1"
                                                    />
                                                    {errors.trial_days && <p className="text-sm text-red-500 mt-1">{errors.trial_days}</p>}
                                                </div>
                                                <div>
                                                    <Label htmlFor="trial_discount">First Month Discount (%)</Label>
                                                    <Input
                                                        id="trial_discount"
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        value={data.trial_discount}
                                                        onChange={e => setData('trial_discount', parseInt(e.target.value) || 0)}
                                                        className="w-24 mt-1"
                                                    />
                                                    {errors.trial_discount && <p className="text-sm text-red-500 mt-1">{errors.trial_discount}</p>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </label>

                                {/* Option B */}
                                <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${data.trial_option === 'B' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="trial_option"
                                        value="B"
                                        checked={data.trial_option === 'B'}
                                        onChange={() => setData('trial_option', 'B')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium">Option B — Immediate Paywall</div>
                                        <p className="text-sm text-muted-foreground">
                                            No free trial. Paywall shows immediately on first login. User must subscribe to access features.
                                        </p>
                                    </div>
                                </label>

                                {/* Activate Subscription */}
                                <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${data.trial_option === 'subscription' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="trial_option"
                                        value="subscription"
                                        checked={data.trial_option === 'subscription'}
                                        onChange={() => setData('trial_option', 'subscription')}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium flex items-center gap-2">
                                            <CreditCard className="h-4 w-4" />
                                            Activate Subscription Now
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            No trial. Admin activates a plan directly (wire transfer / manual payment). User gets full access immediately.
                                        </p>
                                        {data.trial_option === 'subscription' && (
                                            <div className="mt-3 space-y-3">
                                                <div>
                                                    <Label htmlFor="plan_name">Plan *</Label>
                                                    <select
                                                        id="plan_name"
                                                        value={data.plan_name}
                                                        onChange={e => setData('plan_name', e.target.value)}
                                                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                                    >
                                                        {PLAN_OPTIONS.map(p => (
                                                            <option key={p.value} value={p.value}>{p.label}</option>
                                                        ))}
                                                    </select>
                                                    {errors.plan_name && <p className="text-sm text-red-500 mt-1">{errors.plan_name}</p>}
                                                </div>
                                                <div>
                                                    <Label htmlFor="subscription_expires_at">Expires At (leave blank = never)</Label>
                                                    <Input
                                                        id="subscription_expires_at"
                                                        type="date"
                                                        value={data.subscription_expires_at}
                                                        onChange={e => setData('subscription_expires_at', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="admin_note">Admin Note (optional)</Label>
                                                    <Textarea
                                                        id="admin_note"
                                                        placeholder="e.g. Wire transfer ref #12345"
                                                        value={data.admin_note}
                                                        onChange={e => setData('admin_note', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </label>

                                {errors.trial_option && <p className="text-sm text-red-500">{errors.trial_option}</p>}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex gap-2">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create User'}
                        </Button>
                        <Link href={route('users.index')}>
                            <Button type="button" variant="outline">Cancel</Button>
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
