import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import FormattedDate from '@/components/FormattedDate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { ArrowLeft, Shield, Key, FileText, Clock, CreditCard, AlertTriangle, CheckCircle, Ban, Infinity, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface UserData {
    id: number;
    name: string;
    email: string;
    can_create_posts: boolean;
    post_creation_note: string | null;
    roles: string[];
    direct_permissions: string[];
    trial_type: string | null;
    trial_days: number;
    trial_discount: number;
    trial_ends_at: string | null;
    created_by_admin: boolean;
    is_on_trial: boolean;
    trial_days_left: number;
    is_trial_expired: boolean;
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

interface Role { id: number; name: string; guard_name: string; }
interface Permission { id: number; name: string; guard_name: string; }

interface Props {
    user: UserData;
    roles: Role[];
    permissions: Permission[];
    featureKeys: string[];
    userOverrides: Record<string, string | null>;
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

const FEATURE_LABELS: Record<string, string> = {
    brands_covered: 'Brands Covered',
    competitor_analysis: 'Competitor Analysis',
    monthly_posts: 'Monthly Posts',
    brand_growth: 'Brand Growth',
    ai_models_access: 'AI Models Access',
    search_analytics: 'Search Analytics',
    docs_files: 'Docs & Files',
    agency_members: 'Agency Members',
    brand_users: 'Brand Users',
    api_access: 'API Access',
    white_label: 'White Label',
    priority_support: 'Priority Support',
};

function ValueBadge({ value }: { value: string }) {
    if (value === '0') return <Badge variant="destructive" className="text-xs"><Ban className="w-3 h-3 mr-1" />Disabled</Badge>;
    if (value === '') return <Badge variant="outline" className="text-xs"><Infinity className="w-3 h-3 mr-1" />Plan default</Badge>;
    return <Badge variant="secondary" className="text-xs"><Hash className="w-3 h-3 mr-1" />{value}</Badge>;
}

export default function EditUser({ user, roles, permissions, featureKeys, userOverrides, activeSubscription, flash }: Props) {
    const [showPasswordFields, setShowPasswordFields] = useState(false);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const initialAccessOption = activeSubscription
        ? 'subscription'
        : user.trial_type === 'B' ? 'B' : 'A';

    // --- Single form for all fields ---
    const form = useForm({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        can_create_posts: user.can_create_posts,
        post_creation_note: user.post_creation_note || '',
        roles: user.roles as string[],
        permissions: user.direct_permissions as string[],
        // access fields
        access_option: initialAccessOption as 'A' | 'B' | 'subscription',
        trial_ends_at: user.trial_ends_at || '',
        trial_discount: user.trial_discount ?? 50,
        plan_name: (activeSubscription?.plan_name || 'agency_growth') as string,
        expires_at: activeSubscription?.current_period_end || '',
        admin_note: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch(route('admin.users.update', user.id));
    };

    const handleRoleChange = (roleName: string, checked: boolean) => {
        form.setData('roles', checked
            ? [...form.data.roles, roleName]
            : form.data.roles.filter(r => r !== roleName));
    };

    const handlePermissionChange = (permName: string, checked: boolean) => {
        form.setData('permissions', checked
            ? [...form.data.permissions, permName]
            : form.data.permissions.filter(p => p !== permName));
    };

    // --- Extend by days (quick action) ---
    const extendForm = useForm({ extend_days: 7 });

    const handleExtendSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        extendForm.post(route('admin.users.extend-trial-by-days', user.id));
    };

    // --- Feature overrides ---
    const [overrides, setOverrides] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        for (const key of featureKeys) {
            init[key] = userOverrides[key] ?? '';
        }
        return init;
    });
    const [savingOverrides, setSavingOverrides] = useState(false);

    const handleSaveOverrides = () => {
        setSavingOverrides(true);
        const payload = featureKeys.map(key => ({
            feature_key: key,
            value: overrides[key] ?? '',
        }));
        router.post(route('admin.users.feature-overrides', user.id), { overrides: payload }, {
            onFinish: () => setSavingOverrides(false),
            preserveScroll: true,
        });
    };

    const breadcrumbs = [
        { title: 'Admin', href: '/admin' },
        { title: 'Users', href: '/admin/users' },
        { title: 'Edit User', href: `/admin/users/${user.id}/edit` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit User - ${user.name}`} />

            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('admin.users.index')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Users
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Edit User</h1>
                        <p className="text-muted-foreground">{user.name} ({user.email})</p>
                    </div>
                </div>

                {/* ── Basic Info + Roles ── */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="name">Name</Label>
                                            <Input id="name" value={form.data.name} onChange={e => form.setData('name', e.target.value)} required />
                                            {form.errors.name && <p className="text-sm text-red-600 mt-1">{form.errors.name}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="email">Email</Label>
                                            <Input id="email" type="email" value={form.data.email} onChange={e => form.setData('email', e.target.value)} required />
                                            {form.errors.email && <p className="text-sm text-red-600 mt-1">{form.errors.email}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="show-password" checked={showPasswordFields} onCheckedChange={c => setShowPasswordFields(!!c)} />
                                            <Label htmlFor="show-password">Change password</Label>
                                        </div>
                                        {showPasswordFields && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="password">New Password</Label>
                                                    <Input id="password" type="password" value={form.data.password} onChange={e => form.setData('password', e.target.value)} />
                                                    {form.errors.password && <p className="text-sm text-red-600 mt-1">{form.errors.password}</p>}
                                                </div>
                                                <div>
                                                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                                                    <Input id="password_confirmation" type="password" value={form.data.password_confirmation} onChange={e => form.setData('password_confirmation', e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Post Creation Rights</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="can_create_posts" checked={form.data.can_create_posts} onCheckedChange={c => form.setData('can_create_posts', !!c)} />
                                        <Label htmlFor="can_create_posts">Allow user to create posts</Label>
                                    </div>
                                    <div>
                                        <Label htmlFor="post_creation_note">Note (optional)</Label>
                                        <Textarea id="post_creation_note" value={form.data.post_creation_note} onChange={e => form.setData('post_creation_note', e.target.value)} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Roles</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {roles.map(role => (
                                        <div key={role.id} className="flex items-center space-x-2">
                                            <Checkbox id={`role-${role.id}`} checked={form.data.roles.includes(role.name)} onCheckedChange={c => handleRoleChange(role.name, !!c)} />
                                            <Label htmlFor={`role-${role.id}`}>
                                                <Badge variant="secondary" className={
                                                    role.name === 'admin' ? 'bg-red-100 text-red-800' :
                                                    role.name === 'agency' ? 'bg-blue-100 text-blue-800' :
                                                    role.name === 'brand' ? 'bg-green-100 text-green-800' : ''
                                                }>{role.name}</Badge>
                                            </Label>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Direct Permissions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 max-h-64 overflow-y-auto">
                                    {permissions.map(perm => (
                                        <div key={perm.id} className="flex items-center space-x-2">
                                            <Checkbox id={`perm-${perm.id}`} checked={form.data.permissions.includes(perm.name)} onCheckedChange={c => handlePermissionChange(perm.name, !!c)} />
                                            <Label htmlFor={`perm-${perm.id}`} className="text-sm">{perm.name}</Label>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                {/* ── Account Access ── */}
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
                    <CardContent>
                        {/* Current status */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {activeSubscription && (
                                <div className="w-full p-3 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3 mb-2">
                                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-medium text-green-800">
                                            Active: {activeSubscription.plan_name}
                                            {activeSubscription.is_manual && <Badge className="ml-2 bg-yellow-100 text-yellow-800 text-xs">Manual</Badge>}
                                        </p>
                                        {activeSubscription.current_period_end
                                            ? <p className="text-green-700">Expires: <FormattedDate date={activeSubscription.current_period_end} format="date" /></p>
                                            : <p className="text-green-700">No expiry set (lifetime)</p>}
                                        {activeSubscription.admin_note && (
                                            <p className="text-green-700 mt-1">Note: {activeSubscription.admin_note}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {user.is_on_trial && <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />On Trial</Badge>}
                            {user.is_trial_expired && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Trial Expired</Badge>}
                        </div>

                        <div className="space-y-3">
                            {/* Option A */}
                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${form.data.access_option === 'A' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input
                                    type="radio"
                                    name="access_option"
                                    value="A"
                                    checked={form.data.access_option === 'A'}
                                    onChange={() => form.setData('access_option', 'A')}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-medium">Option A — Free Trial</div>
                                    <p className="text-sm text-muted-foreground">
                                        User gets a free trial. Paywall appears on the last 4 days with a countdown and a configurable first-month discount.
                                    </p>
                                    {form.data.access_option === 'A' && (
                                        <div className="mt-3 space-y-3">
                                            <div className="flex flex-wrap gap-4">
                                                <div>
                                                    <Label htmlFor="trial_ends_at">Trial End Date</Label>
                                                    <Input
                                                        id="trial_ends_at"
                                                        type="date"
                                                        value={form.data.trial_ends_at}
                                                        onChange={e => form.setData('trial_ends_at', e.target.value)}
                                                        className="w-44 mt-1"
                                                    />
                                                    {form.errors.trial_ends_at && <p className="text-sm text-red-600 mt-1">{form.errors.trial_ends_at}</p>}
                                                </div>
                                                <div>
                                                    <Label htmlFor="trial_discount">First Month Discount (%)</Label>
                                                    <Input
                                                        id="trial_discount"
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        value={form.data.trial_discount}
                                                        onChange={e => form.setData('trial_discount', parseInt(e.target.value) || 0)}
                                                        className="w-24 mt-1"
                                                    />
                                                    {form.errors.trial_discount && <p className="text-sm text-red-600 mt-1">{form.errors.trial_discount}</p>}
                                                </div>
                                            </div>
                                            {/* Quick extend shortcut */}
                                            <div className="border-t pt-3">
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    Or extend quickly by days (from{' '}
                                                    {user.is_on_trial && user.trial_ends_at
                                                        ? <>current end <strong>({user.trial_ends_at})</strong></>
                                                        : 'today'}):
                                                </p>
                                                <form onSubmit={handleExtendSubmit} className="flex items-end gap-3">
                                                    <div>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={365}
                                                            value={extendForm.data.extend_days}
                                                            onChange={e => extendForm.setData('extend_days', parseInt(e.target.value) || 1)}
                                                            className="w-24"
                                                            placeholder="days"
                                                        />
                                                        {extendForm.errors.extend_days && <p className="text-sm text-red-600 mt-1">{extendForm.errors.extend_days}</p>}
                                                    </div>
                                                    <Button type="submit" variant="outline" size="sm" disabled={extendForm.processing}>
                                                        + Extend
                                                    </Button>
                                                </form>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </label>

                            {/* Option B */}

                            {/*
                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${form.data.access_option === 'B' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input
                                    type="radio"
                                    name="access_option"
                                    value="B"
                                    checked={form.data.access_option === 'B'}
                                    onChange={() => form.setData('access_option', 'B')}
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
                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${form.data.access_option === 'subscription' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input
                                    type="radio"
                                    name="access_option"
                                    value="subscription"
                                    checked={form.data.access_option === 'subscription'}
                                    onChange={() => form.setData('access_option', 'subscription')}
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
                                    {form.data.access_option === 'subscription' && (
                                        <div className="mt-3 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="plan_name">Plan *</Label>
                                                    <select
                                                        id="plan_name"
                                                        value={form.data.plan_name}
                                                        onChange={e => form.setData('plan_name', e.target.value)}
                                                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                                    >
                                                        {PLAN_OPTIONS.map(p => (
                                                            <option key={p.value} value={p.value}>{p.label}</option>
                                                        ))}
                                                    </select>
                                                    {form.errors.plan_name && <p className="text-sm text-red-600 mt-1">{form.errors.plan_name}</p>}
                                                </div>
                                                <div>
                                                    <Label htmlFor="expires_at">Expires At (leave blank = never)</Label>
                                                    <Input
                                                        id="expires_at"
                                                        type="date"
                                                        value={form.data.expires_at}
                                                        onChange={e => form.setData('expires_at', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label htmlFor="admin_note">Admin Note (optional)</Label>
                                                <Textarea
                                                    id="admin_note"
                                                    placeholder="e.g. Wire transfer ref #12345"
                                                    value={form.data.admin_note}
                                                    onChange={e => form.setData('admin_note', e.target.value)}
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </label>

                            {form.errors.access_option && <p className="text-sm text-red-600">{form.errors.access_option}</p>}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.visit(route('admin.users.index'))}>Cancel</Button>
                    <Button type="submit" disabled={form.processing}>Update User</Button>
                </div>
                </form>

                {/* ── Feature Overrides ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Feature Overrides</CardTitle>
                        <CardDescription>
                            Override plan-level feature limits for this specific user. Leave blank to inherit from their plan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
                            <span><code className="bg-muted px-1 rounded">blank</code> = use plan default</span>
                            <span><code className="bg-muted px-1 rounded">0</code> = disabled</span>
                            <span><code className="bg-muted px-1 rounded">5</code> = limit of 5</span>
                            <span><code className="bg-muted px-1 rounded">unlimited</code> text = leave blank</span>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-56">Feature</TableHead>
                                    <TableHead>Override Value</TableHead>
                                    <TableHead>Preview</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {featureKeys.map(key => (
                                    <TableRow key={key}>
                                        <TableCell>
                                            <div className="font-medium">{FEATURE_LABELS[key] ?? key}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{key}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="w-32 text-sm"
                                                placeholder="plan default"
                                                value={overrides[key] ?? ''}
                                                onChange={e => setOverrides(prev => ({ ...prev, [key]: e.target.value }))}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <ValueBadge value={overrides[key] ?? ''} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="flex justify-end">
                            <Button onClick={handleSaveOverrides} disabled={savingOverrides}>
                                {savingOverrides ? 'Saving...' : 'Save Overrides'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
