import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
    roles: string[];
    permissions: string[];
    can: {
        viewDashboard: boolean;
        manageDashboard: boolean;
        viewUsers: boolean;
        createUsers: boolean;
        editUsers: boolean;
        deleteUsers: boolean;
        viewSettings: boolean;
        manageSettings: boolean;
        viewAdminPanel: boolean;
        manageSystem: boolean;
    };
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    permission?: string; // Required permission to view this nav item
    role?: string; // Required role to view this nav item
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    roles?: string[];
    permissions?: string[];
    [key: string]: unknown; // This allows for additional properties...
}
