import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { ArrowLeft, Shield, Key, FileText } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    can_create_posts: boolean;
    post_creation_note: string | null;
    roles: string[];
    direct_permissions: string[];
}

interface Role {
    id: number;
    name: string;
    guard_name: string;
}

interface Permission {
    id: number;
    name: string;
    guard_name: string;
}

interface Props {
    user: User;
    roles: Role[];
    permissions: Permission[];
}

export default function EditUser({ user, roles, permissions }: Props) {
    const [showPasswordFields, setShowPasswordFields] = useState(false);

    const form = useForm({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        can_create_posts: user.can_create_posts,
        post_creation_note: user.post_creation_note || '',
        roles: user.roles,
        permissions: user.direct_permissions,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch(route('admin.users.update', user.id), {
            onSuccess: () => {
                // Optional: redirect or show success message
            }
        });
    };

    const handleRoleChange = (roleName: string, checked: boolean) => {
        const currentRoles = form.data.roles;
        if (checked) {
            form.setData('roles', [...currentRoles, roleName]);
        } else {
            form.setData('roles', currentRoles.filter(r => r !== roleName));
        }
    };

    const handlePermissionChange = (permissionName: string, checked: boolean) => {
        const currentPermissions = form.data.permissions;
        if (checked) {
            form.setData('permissions', [...currentPermissions, permissionName]);
        } else {
            form.setData('permissions', currentPermissions.filter(p => p !== permissionName));
        }
    };

    const breadcrumbs = [
        { title: 'Admin', href: '/admin' },
        { title: 'Users', href: '/admin/users' },
        { title: 'Edit User', href: `/admin/users/${user.id}/edit` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit User - ${user.name}`} />
            
            <div className="space-y-6">
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

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Basic Information */}
                        <div className="lg:col-span-2">
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
                                            <Input
                                                id="name"
                                                value={form.data.name}
                                                onChange={(e) => form.setData('name', e.target.value)}
                                                required
                                            />
                                            {form.errors.name && (
                                                <p className="text-sm text-red-600 mt-1">{form.errors.name}</p>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={form.data.email}
                                                onChange={(e) => form.setData('email', e.target.value)}
                                                required
                                            />
                                            {form.errors.email && (
                                                <p className="text-sm text-red-600 mt-1">{form.errors.email}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="show-password"
                                                checked={showPasswordFields}
                                                onCheckedChange={(checked) => setShowPasswordFields(!!checked)}
                                            />
                                            <Label htmlFor="show-password">Change password</Label>
                                        </div>

                                        {showPasswordFields && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="password">New Password</Label>
                                                    <Input
                                                        id="password"
                                                        type="password"
                                                        value={form.data.password}
                                                        onChange={(e) => form.setData('password', e.target.value)}
                                                    />
                                                    {form.errors.password && (
                                                        <p className="text-sm text-red-600 mt-1">{form.errors.password}</p>
                                                    )}
                                                </div>
                                                
                                                <div>
                                                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                                                    <Input
                                                        id="password_confirmation"
                                                        type="password"
                                                        value={form.data.password_confirmation}
                                                        onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                                    />
                                                    {form.errors.password_confirmation && (
                                                        <p className="text-sm text-red-600 mt-1">{form.errors.password_confirmation}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Post Creation Permissions */}
                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle>Post Creation Rights</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="can_create_posts"
                                            checked={form.data.can_create_posts}
                                            onCheckedChange={(checked) => form.setData('can_create_posts', !!checked)}
                                        />
                                        <Label htmlFor="can_create_posts">Allow user to create posts</Label>
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="post_creation_note">Note (optional)</Label>
                                        <Textarea
                                            id="post_creation_note"
                                            placeholder="Add a note about post creation permissions..."
                                            value={form.data.post_creation_note}
                                            onChange={(e) => form.setData('post_creation_note', e.target.value)}
                                        />
                                        {form.errors.post_creation_note && (
                                            <p className="text-sm text-red-600 mt-1">{form.errors.post_creation_note}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Roles and Permissions */}
                        <div className="space-y-6">
                            {/* Roles */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5" />
                                        Roles
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {roles.map((role) => (
                                        <div key={role.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`role-${role.id}`}
                                                checked={form.data.roles.includes(role.name)}
                                                onCheckedChange={(checked) => handleRoleChange(role.name, !!checked)}
                                            />
                                            <Label htmlFor={`role-${role.id}`} className="flex items-center gap-2">
                                                <Badge variant="secondary">
                                                    {role.name}
                                                </Badge>
                                            </Label>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Direct Permissions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Key className="h-5 w-5" />
                                        Direct Permissions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 max-h-64 overflow-y-auto">
                                    {permissions.map((permission) => (
                                        <div key={permission.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`permission-${permission.id}`}
                                                checked={form.data.permissions.includes(permission.name)}
                                                onCheckedChange={(checked) => handlePermissionChange(permission.name, !!checked)}
                                            />
                                            <Label htmlFor={`permission-${permission.id}`} className="text-sm">
                                                {permission.name}
                                            </Label>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => router.visit(route('admin.users.index'))}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={form.processing}
                        >
                            Update User
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
