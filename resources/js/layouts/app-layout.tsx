import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import '../../css/custom.css';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    title?: string;
    logo?: string;
    website?: string;
}

export default ({ children, breadcrumbs = [], title, logo, website, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} title={title} logo={logo} website={website} {...props}>
        {children}
    </AppLayoutTemplate>
);
