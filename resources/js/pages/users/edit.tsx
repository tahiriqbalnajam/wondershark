import { Head, useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { UserPen, ArrowLeft, Clock, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { toast } from 'sonner';

interface Role {
    id: number;
    name: string;
    guard_name: string;
}

interface ActiveSubscription {
    id: number;
    plan_name: string;
    status: string;
    is_manual: boolean;
    admin_note: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
}

interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
    trial_ends_at: string | null;
    trial_type: string | null;
    trial_discount: number;
    is_on_trial: boolean;
    trial_days_left: number;
    is_trial_expired: boolean;
}

interface EditUserPageProps {
    user: User;
    roles: Role[];
    activeSubscription: ActiveSubscription | null;
    flash?: { success?: string; error?: string };
}

const PLAN_OPTIONS = [
    { value: 'trial', label: 'Trial' },
    { value: 'free', label: 'Free' },
     { value: 'brand_growth', label: 'Brand Growth' },
    { value: 'agency_growth', label: 'Agency Growth' },
    { value: 'agency_unlimited', label: 'Agency Unlimited' },
     
];

export default function EditUser({ user, roles, activeSubscription, flash }: EditUserPageProps) {
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const initialAccessOption = activeSubscription
        ? 'subscription'
        : user.trial_type === 'B' ? 'B' : 'A';

    const { data, setData, patch, processing, errors } = useForm({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        roles: user.roles || [],
        // access fields
        access_option: initialAccessOption as 'A' | 'B' | 'subscription',
        trial_ends_at: user.trial_ends_at || '',
        trial_discount: user.trial_discount ?? 50,
        plan_name: (activeSubscription?.plan_name || 'agency_growth') as string,
        expires_at: activeSubscription?.current_period_end || '',
        admin_note: '',
    });

    const handleRoleChange = (roleName: string, checked: boolean) => {
        setData('roles', checked
            ? [...data.roles, roleName]
            : data.roles.filter(r => r !== roleName));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(route('users.update', user.id));
    };

    // Extend by days — standalone quick action
    const extendForm = useForm({ extend_days: 7 });
    const handleExtendSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        extendForm.post(route('users.extend-trial-by-days', user.id));
    };

    return (
        <AppLayout>
            <Head title={`Edit User: ${user.name}`} />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href={route('users.index')}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Users
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
                        <p className="text-muted-foreground">Update user information and roles</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <UserPen className="mr-2 h-5 w-5" />
                                User Information
                            </CardTitle>
                            <CardDescription>Update the details for {user.name}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password (leave blank to keep current)</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        placeholder="Enter new password"
                                        className={errors.password ? 'border-red-500' : ''}
                                    />
                                    {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">Confirm New Password</Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)}
                                        placeholder="Confirm new password"
                                        className={errors.password_confirmation ? 'border-red-500' : ''}
                                    />
                                    {errors.password_confirmation && <p className="text-sm text-red-500">{errors.password_confirmation}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Roles</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {roles.map((role) => (
                                        <div key={role.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`role-${role.id}`}
                                                checked={data.roles.includes(role.name)}
                                                onCheckedChange={(checked) => handleRoleChange(role.name, checked as boolean)}
                                            />
                                            <Label htmlFor={`role-${role.id}`} className="text-sm">{role.name}</Label>
                                        </div>
                                    ))}
                                </div>
                                {errors.roles && <p className="text-sm text-red-500">{errors.roles}</p>}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Updating...' : 'Update User'}
                                </Button>
                                <Link href={route('users.index')}>
                                    <Button type="button" variant="outline">Cancel</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Access */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Account Access
                            </CardTitle>
                            <CardDescription>
                                Choose how this user accesses the platform.
                                {user.is_on_trial && (
                                    <span className="ml-1 text-green-600 font-medium">
                                        Active trial — {user.trial_days_left} day{user.trial_days_left !== 1 ? 's' : ''} left.
                                    </span>
                                )}
                                {user.is_trial_expired && (
                                    <span className="ml-1 text-red-600 font-medium">Trial expired.</span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {activeSubscription && (
                                <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-medium text-green-800">
                                            Active: {activeSubscription.plan_name}
                                            {activeSubscription.is_manual && <Badge className="ml-2 bg-yellow-100 text-yellow-800 text-xs">Manual</Badge>}
                                        </p>
                                        {activeSubscription.current_period_end
                                            ? <p className="text-green-700">Expires: {activeSubscription.current_period_end}</p>
                                            : <p className="text-green-700">No expiry set (lifetime)</p>}
                                        {activeSubscription.admin_note && <p className="text-green-700 mt-1">Note: {activeSubscription.admin_note}</p>}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {user.is_on_trial && <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />On Trial</Badge>}
                                {user.is_trial_expired && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Trial Expired</Badge>}
                            </div>

                            {/* Option A */}
                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${data.access_option === 'A' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input
                                    type="radio"
                                    name="access_option"
                                    value="A"
                                    checked={data.access_option === 'A'}
                                    onChange={() => setData('access_option', 'A')}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-medium">Option A — Free Trial</div>
                                    <p className="text-sm text-muted-foreground">
                                        User gets a free trial. Paywall appears on the last 4 days with a countdown and a configurable first-month discount.
                                    </p>
                                    {data.access_option === 'A' && (
                                        <div className="mt-3 space-y-3">

                                            {/* Trial config */}
                                            <div className="flex flex-wrap gap-4">
                                                <div>
                                                    <Label htmlFor="trial_ends_at">Trial End Date</Label>
                                                    <Input
                                                        id="trial_ends_at"
                                                        type="date"
                                                        value={data.trial_ends_at}
                                                        onChange={e => setData('trial_ends_at', e.target.value)}
                                                        className="w-44 mt-1"
                                                    />
                                                    {errors.trial_ends_at && <p className="text-sm text-red-600 mt-1">{errors.trial_ends_at}</p>}
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
                                                    {errors.trial_discount && <p className="text-sm text-red-600 mt-1">{errors.trial_discount}</p>}
                                                </div>
                                            </div>
                                            {/*
                                            <div className="border-t pt-3">
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    Or extend quickly by days (from{' '}
                                                    {  user.is_on_trial && user.trial_ends_at ? <strong>{user.trial_ends_at}</strong> : 'today'}):
                                                </p>
                                                <form onSubmit={handleExtendSubmit} className="flex items-end gap-3">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={365}
                                                        value={extendForm.data.extend_days}
                                                        onChange={e => extendForm.setData('extend_days', parseInt(e.target.value) || 1)}
                                                        className="w-24"
                                                        placeholder="days"
                                                    />
                                                    <Button type="submit" variant="outline" size="sm" disabled={extendForm.processing}>
                                                        + Extend
                                                    </Button>
                                                </form>
                                            </div>
                                            */}
                                        </div>
                                    )}
                                </div>
                            </label>

                            {/* Option B */}
                            {/*
                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${data.access_option === 'B' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input
                                    type="radio"
                                    name="access_option"
                                    value="B"
                                    checked={data.access_option === 'B'}
                                    onChange={() => setData('access_option', 'B')}
                                    className="mt-1"
                                />
                                <div>
                                    <div className="font-medium">Option B — Immediate Paywall</div>
                                    <p className="text-sm text-muted-foreground">
                                        No free trial. Paywall shows immediately on login. User must subscribe to access features.
                                    </p>
                                </div>
                            </label>
                            */}

                            {/* Activate Subscription */}
                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${data.access_option === 'subscription' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input
                                    type="radio"
                                    name="access_option"
                                    value="subscription"
                                    checked={data.access_option === 'subscription'}
                                    onChange={() => setData('access_option', 'subscription')}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-medium flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Activate Subscription
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        No trial. Admin activates a plan directly (wire transfer / manual payment). User gets full access immediately.
                                        {activeSubscription && <span className="ml-1 text-orange-600 font-medium">Saving will cancel the existing subscription.</span>}
                                    </p>
                                    {data.access_option === 'subscription' && (
                                        <div className="mt-3 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                    {errors.plan_name && <p className="text-sm text-red-600 mt-1">{errors.plan_name}</p>}
                                                </div>
                                                <div>
                                                    <Label htmlFor="expires_at">Expires At (leave blank = never)</Label>
                                                    <Input
                                                        id="expires_at"
                                                        type="date"
                                                        value={data.expires_at}
                                                        onChange={e => setData('expires_at', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                </div>
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

                            {errors.access_option && <p className="text-sm text-red-600">{errors.access_option}</p>}
                        </CardContent>
                    </Card>
                    </div>{/* end grid */}
                </form>
            </div>
        </AppLayout>
    );
}
