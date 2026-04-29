import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
    url?: string;
    logo?: string;
    logo_thumbnail?: string;
    roles: string[];
    first_brand_website?: string;
    created_at: string;
}

interface UsersPageProps {
    users: User[];
}

export default function Users({ users }: UsersPageProps) {
    const { can } = usePermissions();
    const getInitials = useInitials();
    const [deletingUser, setDeletingUser] = useState<number | null>(null);

    // Helper function to get logo URL for a user
    const getUserLogoUrl = (user: User): string | undefined => {
        // Priority 1: Custom uploaded logo (thumbnail first, then full logo)
        if (user.logo_thumbnail) return user.logo_thumbnail;
        if (user.logo) return user.logo;
        
        // Priority 2: Fetch from agency URL if set
        if (user.url) {
            const cleanUrl = user.url.replace(/^https?:\/\//, '').replace(/^www\./, '');
            return `https://img.logo.dev/${cleanUrl}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`;
        }
        
        // Priority 3: Fetch from first brand's website as fallback
        if (user.first_brand_website) {
            const cleanUrl = user.first_brand_website.replace(/^https?:\/\//, '').replace(/^www\./, '');
            return `https://img.logo.dev/${cleanUrl}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`;
        }
        
        return undefined;
    };

    const handleDeleteUser = async (userId: number) => {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            setDeletingUser(userId);
            router.delete(route('users.destroy', userId), {
                onSuccess: () => {
                    setDeletingUser(null);
                },
                onError: () => {
                    setDeletingUser(null);
                }
            });
        }
    };

    return (
        <AppLayout>
            <Head title="User Management" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                        <p className="text-muted-foreground">
                            Manage users and their roles in the system
                        </p>
                    </div>
                    {can('createUsers') && (
                        <Link href={route('users.create')}>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add User
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="grid gap-4">
                    {users.map((user) => (
                        <Card key={user.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage 
                                                src={getUserLogoUrl(user)} 
                                                alt={user.name} 
                                            />
                                            <AvatarFallback className="bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <CardTitle>{user.name}</CardTitle>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {user.roles.map((role) => (
                                            <span
                                                key={role}
                                                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                                            >
                                                {role}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <CardDescription>{user.email}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-muted-foreground">
                                        Created: {new Date(user.created_at).toLocaleDateString()}
                                    </p>
                                    <div className="space-x-2">
                                        {can('editUsers') && (
                                            <Link href={route('users.edit', user.id)}>
                                                <Button variant="outline" size="sm">
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </Button>
                                            </Link>
                                        )}
                                        {can('deleteUsers') && (
                                            <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={() => handleDeleteUser(user.id)}
                                                disabled={deletingUser === user.id}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {deletingUser === user.id ? 'Deleting...' : 'Delete'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
