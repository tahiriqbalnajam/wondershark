import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Edit, Users, Building2 } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    can_create_posts: boolean;
    post_creation_note: string | null;
    brands_count: number;
}

interface Brand {
    id: number;
    name: string;
    can_create_posts: boolean;
    post_creation_note: string | null;
    monthly_posts: number | null;
    current_month_posts: number;
}

interface Props {
    users: User[];
    brands: Brand[];
}

export default function PostPermissionsIndex({ users, brands }: Props) {
    const [activeTab, setActiveTab] = useState<'users' | 'brands'>('users');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

    const breadcrumbs = [
        { title: 'Admin', href: '/admin' },
        { title: 'Post Permissions', href: '/admin/post-permissions' }
    ];

    const userForm = useForm({
        can_create_posts: false as boolean,
        post_creation_note: ''
    });

    const brandForm = useForm({
        can_create_posts: false as boolean,
        post_creation_note: '',
        monthly_posts: null as number | null
    });

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        userForm.setData({
            can_create_posts: user.can_create_posts,
            post_creation_note: user.post_creation_note || ''
        });
    };

    const handleEditBrand = (brand: Brand) => {
        setSelectedBrand(brand);
        brandForm.setData({
            can_create_posts: brand.can_create_posts,
            post_creation_note: brand.post_creation_note || '',
            monthly_posts: brand.monthly_posts
        });
    };

    const handleUpdateUser = () => {
        if (!selectedUser) return;
        
        userForm.patch(`/admin/post-permissions/users/${selectedUser.id}`, {
            onSuccess: () => {
                setSelectedUser(null);
                userForm.reset();
            }
        });
    };

    const handleUpdateBrand = () => {
        if (!selectedBrand) return;
        
        brandForm.patch(`/admin/post-permissions/brands/${selectedBrand.id}`, {
            onSuccess: () => {
                setSelectedBrand(null);
                brandForm.reset();
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Post Permissions Management" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Post Permissions Management</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage post creation permissions for users and brands
                        </p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
                    <Button
                        variant={activeTab === 'users' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('users')}
                        className="flex items-center gap-2"
                    >
                        <Users className="h-4 w-4" />
                        Users ({users.length})
                    </Button>
                    <Button
                        variant={activeTab === 'brands' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('brands')}
                        className="flex items-center gap-2"
                    >
                        <Building2 className="h-4 w-4" />
                        Brands ({brands.length})
                    </Button>
                </div>

                {/* Users Table */}
                {activeTab === 'users' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                User Post Permissions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Brands</TableHead>
                                        <TableHead>Can Create Posts</TableHead>
                                        <TableHead>Note</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                {user.name}
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {user.brands_count} brands
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={user.can_create_posts ? 'default' : 'destructive'}
                                                >
                                                    {user.can_create_posts ? 'Allowed' : 'Denied'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {user.post_creation_note || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditUser(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>
                                                                Edit User Permissions: {user.name}
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 pt-4">
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id="user-can-create-posts"
                                                                    checked={userForm.data.can_create_posts}
                                                                    onCheckedChange={(checked) =>
                                                                        userForm.setData('can_create_posts', !!checked)
                                                                    }
                                                                />
                                                                <Label htmlFor="user-can-create-posts">
                                                                    Can create posts
                                                                </Label>
                                                            </div>                                                            <div className="space-y-2">
                                                                <Label htmlFor="user-note">Note (optional)</Label>
                                                                <Textarea
                                                                    id="user-note"
                                                                    placeholder="Add a note about this user's permissions..."
                                                                    value={userForm.data.post_creation_note}
                                                                    onChange={(e) => 
                                                                        userForm.setData('post_creation_note', e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            <div className="flex justify-end space-x-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => setSelectedUser(null)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    onClick={handleUpdateUser}
                                                                    disabled={userForm.processing}
                                                                >
                                                                    Update Permissions
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Brands Table */}
                {activeTab === 'brands' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Brand Post Permissions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Brand</TableHead>
                                        <TableHead>Can Create Posts</TableHead>
                                        <TableHead>Monthly Limit</TableHead>
                                        <TableHead>Current Month</TableHead>
                                        <TableHead>Note</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {brands.map((brand) => (
                                        <TableRow key={brand.id}>
                                            <TableCell className="font-medium">
                                                {brand.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={brand.can_create_posts ? 'default' : 'destructive'}
                                                >
                                                    {brand.can_create_posts ? 'Allowed' : 'Denied'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {brand.monthly_posts ? (
                                                    <Badge variant="outline">
                                                        {brand.monthly_posts} posts/month
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">Unlimited</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={
                                                        brand.monthly_posts && 
                                                        brand.current_month_posts >= brand.monthly_posts 
                                                            ? 'destructive' : 'outline'
                                                    }
                                                >
                                                    {brand.current_month_posts} posts
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {brand.post_creation_note || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditBrand(brand)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>
                                                                Edit Brand Permissions: {brand.name}
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 pt-4">
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id="brand-can-create-posts"
                                                                    checked={brandForm.data.can_create_posts}
                                                                    onCheckedChange={(checked) =>
                                                                        brandForm.setData('can_create_posts', !!checked)
                                                                    }
                                                                />
                                                                <Label htmlFor="brand-can-create-posts">
                                                                    Can create posts
                                                                </Label>
                                                            </div>                                                            <div className="space-y-2">
                                                                <Label htmlFor="brand-monthly-posts">
                                                                    Monthly post limit (optional)
                                                                </Label>
                                                                <Input
                                                                    id="brand-monthly-posts"
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="Leave empty for unlimited"
                                                                    value={brandForm.data.monthly_posts || ''}
                                                                    onChange={(e) => 
                                                                        brandForm.setData(
                                                                            'monthly_posts', 
                                                                            e.target.value ? parseInt(e.target.value) : null
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                <Label htmlFor="brand-note">Note (optional)</Label>
                                                                <Textarea
                                                                    id="brand-note"
                                                                    placeholder="Add a note about this brand's permissions..."
                                                                    value={brandForm.data.post_creation_note}
                                                                    onChange={(e) => 
                                                                        brandForm.setData('post_creation_note', e.target.value)
                                                                    }
                                                                />
                                                            </div>

                                                            <div className="flex justify-end space-x-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => setSelectedBrand(null)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    onClick={handleUpdateBrand}
                                                                    disabled={brandForm.processing}
                                                                >
                                                                    Update Permissions
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
