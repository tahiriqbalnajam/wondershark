import { 
    SidebarGroup, 
    SidebarGroupLabel, 
    SidebarMenu, 
    SidebarMenuButton, 
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

export function NavMain({ items = [], label = 'General' }: { items: NavItem[], label?: string | null }) {
    const page = usePage();
    return (
        <SidebarGroup className="p-0 main-menu-links">
            {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
            <SidebarMenu>
                {items.map((item) => {
                    // More precise active state detection
                    const currentUrl = page.url;
                    const itemHref = item.href;
                    
                    // For exact matches (like dashboard brand pages)
                    const isExactMatch = currentUrl === itemHref;
                    
                    // For brand-specific dashboard routes (e.g., /brands/5 should not match /brands/5/posts)
                    const isBrandDashboard = !!itemHref.match(/^\/brands\/\d+$/) && !!currentUrl.match(/^\/brands\/\d+$/);
                    
                    // Special case: /brands should only be active on exact /brands page, not /brands/123
                    const isBrandsListPage = itemHref === '/brands' && currentUrl === '/brands';
                    
                    // For other routes, use startsWith but ensure it's not a brand dashboard conflict or brands list
                    const isStartsWithMatch = currentUrl.startsWith(itemHref) && 
                                             !itemHref.match(/^\/brands\/\d+$/) && 
                                             itemHref !== '/brands';
                    
                    const isActive = isExactMatch || isBrandDashboard || isBrandsListPage || isStartsWithMatch;
                    
                    if (item.items && item.items.length > 0) {
                        return (
                            <Collapsible key={item.title} asChild defaultOpen={isActive}>
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton tooltip={{ children: item.title }}  className='menu-link'>
                                            <span className='menu-icon'>{item.icon && <item.icon />}</span>
                                            <span>{item.title}</span>
                                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {item.items.map((subItem) => {
                                                const subCurrentUrl = page.url;
                                                const subItemHref = subItem.href;
                                                const subIsExactMatch = subCurrentUrl === subItemHref;
                                                const subIsStartsWithMatch = subCurrentUrl.startsWith(subItemHref);
                                                const subIsActive = subIsExactMatch || subIsStartsWithMatch;
                                                
                                                return (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton asChild isActive={subIsActive}>
                                                            <Link href={subItem.href} prefetch className='menu-link'>
                                                                <span className='menu-icon'>{subItem.icon && <subItem.icon />}</span>
                                                                <span>{subItem.title}</span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                );
                                            })}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        );
                    }
                    
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isActive} tooltip={{ children: item.title }}>
                                <Link href={item.href} prefetch className='menu-link'>
                                    <span className='menu-icon'>{item.icon && <item.icon />}</span>
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
