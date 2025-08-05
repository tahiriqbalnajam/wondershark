import { usePage } from '@inertiajs/react';
import { SharedData } from '@/types';

export function usePermissions() {
    const { auth } = usePage<SharedData>().props;

    const hasPermission = (permission: string): boolean => {
        return auth.permissions.includes(permission);
    };

    const hasRole = (role: string): boolean => {
        return auth.roles.includes(role);
    };

    const hasAnyRole = (roles: string[]): boolean => {
        return roles.some(role => auth.roles.includes(role));
    };

    const hasAnyPermission = (permissions: string[]): boolean => {
        return permissions.some(permission => auth.permissions.includes(permission));
    };

    const can = (permission: keyof typeof auth.can): boolean => {
        return auth.can[permission];
    };

    return {
        hasPermission,
        hasRole,
        hasAnyRole,
        hasAnyPermission,
        can,
        roles: auth.roles,
        permissions: auth.permissions,
        user: auth.user,
    };
}
