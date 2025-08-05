import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionWrapperProps {
    children: ReactNode;
    permission?: string;
    role?: string;
    permissions?: string[];
    roles?: string[];
    fallback?: ReactNode;
}

export function PermissionWrapper({ 
    children, 
    permission, 
    role, 
    permissions = [], 
    roles = [], 
    fallback = null 
}: PermissionWrapperProps) {
    const { hasPermission, hasRole, hasAnyPermission, hasAnyRole } = usePermissions();

    // Check specific permission
    if (permission && !hasPermission(permission)) {
        return fallback;
    }

    // Check specific role
    if (role && !hasRole(role)) {
        return fallback;
    }

    // Check any of the permissions
    if (permissions.length > 0 && !hasAnyPermission(permissions)) {
        return fallback;
    }

    // Check any of the roles
    if (roles.length > 0 && !hasAnyRole(roles)) {
        return fallback;
    }

    return <>{children}</>;
}
