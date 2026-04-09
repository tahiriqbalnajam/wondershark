import { Head, useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { UserPen, ArrowLeft, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { toast } from 'sonner';

interface Role {
    id: number;
    name: string;
    guard_name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
    trial_ends_at: string | null;
    trial_type: string | null;
    is_on_trial: boolean;
    trial_days_left: number;
    is_trial_expired: boolean;
}

interface EditUserPageProps {
    user: User;
    roles: Role[];
    flash?: { success?: string; error?: string };
}

export default function EditUser({ user, roles, flash }: EditUserPageProps) {
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const { data, setData, patch, processing, errors } = useForm({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        roles: user.roles || [],
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
        patch(route('users.update', user.id));
    };

    // --- Extend by days form ---
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
                        <p className="text-muted-foreground">
                            Update user information and roles
                        </p>
                    </div>
                </div>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <UserPen className="mr-2 h-5 w-5" />
                            User Information
                        </CardTitle>
                        <CardDescription>
                            Update the details for {user.name}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
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
                                    {errors.name && (
                                        <p className="text-sm text-red-500">{errors.name}</p>
                                    )}
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
                                    {errors.email && (
                                        <p className="text-sm text-red-500">{errors.email}</p>
                                    )}
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
                                    {errors.password && (
                                        <p className="text-sm text-red-500">{errors.password}</p>
                                    )}
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
                                    {errors.password_confirmation && (
                                        <p className="text-sm text-red-500">{errors.password_confirmation}</p>
                                    )}
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
                                {errors.roles && (
                                    <p className="text-sm text-red-500">{errors.roles}</p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Updating...' : 'Update User'}
                                </Button>
                                <Link href={route('users.index')}>
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* ── Trial Management ── */}
                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Trial Management
                        </CardTitle>
                        <CardDescription>
                            {user.is_on_trial && (
                                <span className="text-green-600 font-medium">
                                    Active trial — {user.trial_days_left} day{user.trial_days_left !== 1 ? 's' : ''} left
                                    {user.trial_ends_at ? ` (ends ${user.trial_ends_at})` : ''}.
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
                        <div className="flex flex-wrap gap-2 mb-4">
                            {user.trial_type === 'A' && <Badge className="bg-blue-100 text-blue-800">Type A — late paywall</Badge>}
                            {user.trial_type === 'B' && <Badge className="bg-orange-100 text-orange-800">Type B — immediate paywall</Badge>}
                            {user.is_on_trial && <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />On Trial</Badge>}
                            {user.is_trial_expired && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>}
                        </div>

                        <p className="text-sm font-medium mb-3">Extend trial by additional days</p>
                        <form onSubmit={handleExtendSubmit} className="flex flex-wrap items-end gap-4">
                            <div>
                                <Label htmlFor="extend_days">Days to Add</Label>
                                <Input
                                    id="extend_days"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={extendForm.data.extend_days}
                                    onChange={e => extendForm.setData('extend_days', parseInt(e.target.value) || 1)}
                                    className="mt-1 w-28"
                                    required
                                />
                                {extendForm.errors.extend_days && <p className="text-sm text-red-600 mt-1">{extendForm.errors.extend_days}</p>}
                            </div>
                            <div className="text-sm text-muted-foreground pb-2">
                                {user.is_on_trial
                                    ? <>Extends from current end date <strong>({user.trial_ends_at})</strong></>
                                    : 'Extends from today (trial expired or not set)'}
                            </div>
                            <Button type="submit" variant="outline" disabled={extendForm.processing}>
                                + Extend Trial
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
