import { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { 
    Plus, 
    Search, 
    Eye, 
    Edit, 
    Trash2, 
    Users, 
    Shield, 
    CheckCircle, 
    XCircle,
    Mail,
    Calendar
} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    created_at: string;
    can_create_posts: boolean;
    post_creation_note: string | null;
    roles: string[];
    permissions: string[];
    brands_count: number;
    posts_count: number;
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
    users: User[];
    roles: Role[];
    permissions: Permission[];
    adminEmail: string;
}

export default function UsersIndex({ users, adminEmail }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [showPostPermissionDialog, setShowPostPermissionDialog] = useState(false);
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const postPermissionForm = useForm({
        user_ids: [] as number[],
        can_create_posts: false as boolean,
        post_creation_note: '',
    });

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.roles.some(role => role.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleBulkPostPermissionUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        postPermissionForm.setData('user_ids', selectedUsers);
        postPermissionForm.post(route('admin.users.bulk-update-post-permissions'), {
            onSuccess: () => {
                setShowPostPermissionDialog(false);
                setSelectedUsers([]);
                postPermissionForm.reset();
            }
        });
    };

    const handleToggleUserSelection = (userId: number) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSelectAllUsers = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(user => user.id));
        }
    };

    const handleShowUpgradeDialog = (user: User) => {
        setSelectedUser(user);
        setShowUpgradeDialog(true);
    };

    const handleDeleteUser = (user: User) => {
        if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
            router.delete(route('admin.users.destroy', user.id));
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-red-100 text-red-800';
            case 'agency': return 'bg-blue-100 text-blue-800';
            case 'brand': return 'bg-green-100 text-green-800';
            case 'agency_member': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const breadcrumbs = [
        { title: 'Admin', href: '/admin' },
        { title: 'User Management', href: '/admin/users' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management - Admin" />
            
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">User Management</h1>
                        <p className="text-muted-foreground">
                            Manage users, roles, and permissions
                        </p>
                    </div>
                    
                    <Button asChild>
                        <Link href={route('admin.users.create')}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add User
                        </Link>
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    
                    {selectedUsers.length > 0 && (
                        <Button 
                            variant="outline" 
                            onClick={() => setShowPostPermissionDialog(true)}
                        >
                            Manage Post Permissions ({selectedUsers.length})
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Users ({filteredUsers.length})
                            </CardTitle>
                            
                            <div className="flex items-center gap-2">
                                <Checkbox 
                                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                    onCheckedChange={handleSelectAllUsers}
                                />
                                <Label className="text-sm">Select All</Label>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {filteredUsers.map((user) => (
                                <div 
                                    key={user.id} 
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <Checkbox 
                                            checked={selectedUsers.includes(user.id)}
                                            onCheckedChange={() => handleToggleUserSelection(user.id)}
                                        />
                                        
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-medium">{user.name}</h3>
                                                {user.email_verified_at ? (
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 text-red-600" />
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail className="h-3 w-3" />
                                                {user.email}
                                                <span>•</span>
                                                <Calendar className="h-3 w-3" />
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mt-2">
                                                {user.roles.map((role) => (
                                                    <Badge key={role} variant="secondary" className={getRoleColor(role)}>
                                                        <Shield className="h-3 w-3 mr-1" />
                                                        {role}
                                                    </Badge>
                                                ))}
                                                
                                                <Badge variant={user.can_create_posts ? "default" : "destructive"}>
                                                    {user.can_create_posts ? "Can Create Posts" : "No Post Access"}
                                                </Badge>
                                            </div>
                                            
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {user.brands_count} brands • {user.posts_count} posts
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {!user.can_create_posts && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleShowUpgradeDialog(user)}
                                            >
                                                Add Post Rights
                                            </Button>
                                        )}
                                        
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={route('admin.users.show', user.id)}>
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={route('admin.users.edit', user.id)}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handleDeleteUser(user)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            
                            {filteredUsers.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No users found matching your search.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Bulk Post Permission Management Dialog */}
                <Dialog open={showPostPermissionDialog} onOpenChange={setShowPostPermissionDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Manage Post Creation Permissions</DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleBulkPostPermissionUpdate} className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={postPermissionForm.data.can_create_posts}
                                    onCheckedChange={(checked) => postPermissionForm.setData('can_create_posts', !!checked)}
                                />
                                <Label>Allow post creation</Label>
                            </div>
                            
                            <div>
                                <Label htmlFor="note">Note (optional)</Label>
                                <Textarea
                                    id="note"
                                    placeholder="Add a note about this permission change..."
                                    value={postPermissionForm.data.post_creation_note}
                                    onChange={(e) => postPermissionForm.setData('post_creation_note', e.target.value)}
                                />
                            </div>
                            
                            <div className="flex justify-end gap-2">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setShowPostPermissionDialog(false)}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={postPermissionForm.processing}
                                >
                                    Update {selectedUsers.length} Users
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Upgrade Dialog */}
                <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Contact Administrator</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                            <p>
                                To enable post creation rights for <strong>{selectedUser?.name}</strong>, 
                                please contact the administrator.
                            </p>
                            
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="font-medium mb-2">Administrator Contact:</p>
                                <a 
                                    href={`mailto:${adminEmail}?subject=Post Creation Rights Request for ${selectedUser?.name}&body=Please enable post creation rights for user: ${selectedUser?.name} (${selectedUser?.email})`}
                                    className="text-blue-600 hover:underline"
                                >
                                    {adminEmail}
                                </a>
                            </div>
                            
                            <div className="flex justify-end">
                                <Button onClick={() => setShowUpgradeDialog(false)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
