import { Breadcrumbs } from '@/components/breadcrumbs';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { TrialCountdownBadge } from '@/components/trial-countdown-badge';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { usePage } from '@inertiajs/react';

// Import all icons you might use
import { UserCheck, LayoutDashboard, Settings, BarChart3, Users,FileDown,Menu,UnfoldHorizontal, Pencil, Check, X, Loader2 } from 'lucide-react';
import { JSX, useState, useRef } from 'react';

export function AppSidebarHeader({ breadcrumbs = [], title, logo, website }: { breadcrumbs?: BreadcrumbItemType[], title?: string, logo?: string, website?: string }) {
    const { url, props } = usePage(); // Current route path and page props

    // Get brand from page props if available
    const brand = (props as any).brand;

    const branduser = (props as any).auth?.user;

    // Map route → icon
    const iconMap: Record<string, JSX.Element> = {
        '/dashboard': <LayoutDashboard className="w-5 h-5" />,
        '/search-analytics': <Users className="w-5 h-5" />,
        '/users': <Settings className="w-5 h-5" />,
        '/admin': <BarChart3 className="w-5 h-5" />,
        '/profile': <UserCheck className="w-5 h-5" />,
    };

    // Generate logo.dev URL if no logo but website provided
    const generateApiLogoUrl = (site: string) => 
        `https://img.logo.dev/${site.replace(/^https?:\/\//, '').replace(/^www\./, '')}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`;

    // Determine logo and website - prioritize props, then brand from page props
    const finalLogo = logo || brand?.logo;
    const finalWebsite = website || brand?.website;

    // Pick icon based on current URL, fallback to a default

    // console.log('branduser:', branduser.roles);
    const hasBrandRole = branduser.roles?.some((role: any) => role.name === 'brand');
    
    const pageIcon = finalLogo && !hasBrandRole ? (
        <img src={finalLogo.startsWith('http') ? finalLogo : `/storage/${finalLogo}`}  alt="Brand logo" className="w-5 h-5 rounded object-contain" />
    ) : finalWebsite && !hasBrandRole ? (
        <img 
            src={generateApiLogoUrl(finalWebsite)} 
            alt="Brand logo from API" 
            className="w-5 h-5 rounded object-contain"
            onError={(e) => {
                e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`;
            }}
        />
    ) : !hasBrandRole ? (
        iconMap[url] || <UserCheck className="w-5 h-5 text-muted-foreground" />
    ) : null;

    const isDashboard = url === '/dashboard';

    // Determine page title: use title prop if provided, otherwise use breadcrumbs
    const pageTitle = title || breadcrumbs[breadcrumbs.length - 1]?.title || 'Untitled Page';

    const { toggleSidebar } = useSidebar();

    const [displayName, setDisplayName] = useState(brand?.name || pageTitle);
    const [editingName, setEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [updatingName, setUpdatingName] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const handleStartEdit = () => {
        setEditedName(brand?.name || pageTitle);
        setEditingName(true);
        setTimeout(() => nameInputRef.current?.focus(), 0);
    };

    const handleSaveName = async () => {
        if (!editedName.trim() || !brand?.id || editedName.trim() === brand.name) {
            setEditingName(false);
            return;
        }
        setUpdatingName(true);
        try {
            const response = await fetch(`/brands/${brand.id}/name`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ name: editedName.trim() }),
            });
            if (response.ok) {
                setDisplayName(editedName.trim());
                setEditingName(false);
                setUpdatingName(false);
            }
        } catch (error) {
            console.error('Error updating brand name:', error);
            setUpdatingName(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingName(false);
        setEditedName(displayName);
    };

    return (
        <header className="border-b border-sidebar-border/50 pb-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 mb-6">
            <div className="lg:flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 md:justify-start justify-between">
                    {/* <SidebarTrigger className="order-1 md:order-0 block md:none"/>
                    <SidebarTrigger className="order-1 md:order-0 none md:block">
                        <Menu className="w-5 h-5" />
                    </SidebarTrigger> */}
                    <button onClick={toggleSidebar} className="order-1 md:order-0 p-2" >
                        <UnfoldHorizontal className="w-5 h-5 hidden md:block"/>
                        <span className='block md:hidden w-10 h-10 mobile-icon-btn'><Menu className="w-5 h-5"/></span>
                    </button>
                    <h2 className="pageheading font-semibold text-lg flex items-center gap-2">
                        <span className="heading-icon">{pageIcon}</span>
                        {brand ? (
                            editingName ? (
                                <>
                                    <input
                                        ref={nameInputRef}
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveName();
                                            if (e.key === 'Escape') handleCancelEdit();
                                        }}
                                        className="bg-white border border-gray-300 rounded-lg px-2 py-0.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-auto min-w-[200px]"
                                        disabled={updatingName}
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        disabled={updatingName || !editedName.trim()}
                                        className="p-1 rounded-md text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updatingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={updatingName}
                                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    {displayName}
                                    <button
                                        onClick={handleStartEdit}
                                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                        title="Edit brand name"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                </>
                            )
                        ) : (
                            pageTitle
                        )}
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    {/* Button only visible on Dashboard */}
                    {isDashboard && (
                        <Button
                            onClick={() => console.log('Dashboard button clicked')}
                            className="primary-btn"
                        >
                            Generate a PDF Report <FileDown/>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
