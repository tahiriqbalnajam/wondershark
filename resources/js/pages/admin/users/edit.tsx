import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
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
    { value: 'agency_growth', label: 'Agency Growth' },
    { value: 'agency_unlimited', label: 'Agency Unlimited' },
];

const FEATURE_LABELS: Record<string, string> = {
    brands_covered: 'Brands Covered',
    competitor_analysis: 'Competitor Analysis',
    monthly_posts: 'Monthly Posts',
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

    // --- Basic Info form ---
    const form = useForm({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        can_create_posts: user.can_create_posts,
        post_creation_note: user.post_creation_note || '',
        roles: user.roles as string[],
        permissions: user.direct_permissions as string[],
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

    // --- Trial form ---
    const trialForm = useForm({
        trial_ends_at: user.trial_ends_at || '',
        trial_type: user.trial_type || 'A',
    });

    const handleTrialSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        trialForm.post(route('admin.users.extend-trial', user.id));
    };

    // --- Subscription form ---
    const subForm = useForm({
        plan_name: 'agency_growth',
        expires_at: '',
        admin_note: '',
    });

    const handleSubSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        subForm.post(route('admin.users.activate-subscription', user.id));
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

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => router.visit(route('admin.users.index'))}>Cancel</Button>
                        <Button type="submit" disabled={form.processing}>Update User</Button>
                    </div>
                </form>

                {/* ── Trial Management ── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Trial Management
                        </CardTitle>
                        <CardDescription>
                            {user.created_by_admin ? 'Account created by admin.' : 'Self-signup account.'}
                            {' '}
                            {user.is_on_trial && (
                                <span className="text-green-600 font-medium">
                                    Active trial — {user.trial_days_left} day{user.trial_days_left !== 1 ? 's' : ''} left.
                                </span>
                            )}
                            {user.is_trial_expired && (
                                <span className="text-red-600 font-medium">Trial expired.</span>
                            )}
                            {!user.is_on_trial && !user.is_trial_expired && !user.trial_ends_at && (
                                <span className="text-muted-foreground">No trial set.</span>
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Status badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {user.trial_type === 'A' && <Badge className="bg-blue-100 text-blue-800">Type A — late paywall</Badge>}
                            {user.trial_type === 'B' && <Badge className="bg-orange-100 text-orange-800">Type B — immediate paywall</Badge>}
                            {user.is_on_trial && <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />On Trial</Badge>}
                            {user.is_trial_expired && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>}
                        </div>

                        <form onSubmit={handleTrialSubmit} className="flex flex-wrap items-end gap-4">
                            <div>
                                <Label htmlFor="trial_type">Trial Type</Label>
                                <select
                                    id="trial_type"
                                    value={trialForm.data.trial_type}
                                    onChange={e => trialForm.setData('trial_type', e.target.value)}
                                    className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="A">A — free trial (late paywall)</option>
                                    <option value="B">B — immediate paywall</option>
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="trial_ends_at">Trial Ends At</Label>
                                <Input
                                    id="trial_ends_at"
                                    type="date"
                                    value={trialForm.data.trial_ends_at}
                                    onChange={e => trialForm.setData('trial_ends_at', e.target.value)}
                                    className="mt-1 w-44"
                                    required
                                />
                                {trialForm.errors.trial_ends_at && <p className="text-sm text-red-600 mt-1">{trialForm.errors.trial_ends_at}</p>}
                            </div>
                            <Button type="submit" disabled={trialForm.processing}>
                                Save Trial
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* ── Subscription Management ── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Subscription Management
                        </CardTitle>
                        <CardDescription>
                            Activate a plan manually (wire transfer / bypass Stripe).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Current subscription status */}
                        {activeSubscription ? (
                            <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                <div className="text-sm">
                                    <p className="font-medium text-green-800">
                                        Active: {activeSubscription.plan_name}
                                        {activeSubscription.is_manual && <Badge className="ml-2 bg-yellow-100 text-yellow-800 text-xs">Manual</Badge>}
                                    </p>
                                    {activeSubscription.current_period_end && (
                                        <p className="text-green-700">Expires: {activeSubscription.current_period_end}</p>
                                    )}
                                    {!activeSubscription.current_period_end && (
                                        <p className="text-green-700">No expiry set (lifetime)</p>
                                    )}
                                    {activeSubscription.admin_note && (
                                        <p className="text-green-700 mt-1">Note: {activeSubscription.admin_note}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 rounded-lg bg-gray-50 border text-sm text-muted-foreground">
                                No active subscription.
                            </div>
                        )}

                        <form onSubmit={handleSubSubmit} className="space-y-4 pt-2">
                            <p className="text-sm font-medium text-orange-700">
                                {activeSubscription ? 'Activating a new plan will cancel the existing subscription.' : 'Activate a new subscription:'}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="sub_plan_name">Plan *</Label>
                                    <select
                                        id="sub_plan_name"
                                        value={subForm.data.plan_name}
                                        onChange={e => subForm.setData('plan_name', e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        {PLAN_OPTIONS.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                    {subForm.errors.plan_name && <p className="text-sm text-red-600 mt-1">{subForm.errors.plan_name}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="expires_at">Expires At (blank = never)</Label>
                                    <Input
                                        id="expires_at"
                                        type="date"
                                        value={subForm.data.expires_at}
                                        onChange={e => subForm.setData('expires_at', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="sub_admin_note">Admin Note (optional)</Label>
                                <Textarea
                                    id="sub_admin_note"
                                    placeholder="e.g. Wire transfer ref #12345"
                                    value={subForm.data.admin_note}
                                    onChange={e => subForm.setData('admin_note', e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={subForm.processing}>
                                Activate Subscription
                            </Button>
                        </form>
                    </CardContent>
                </Card>

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
