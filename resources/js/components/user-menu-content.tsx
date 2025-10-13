import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, Settings, CirclePlus, Mail } from 'lucide-react';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const { brands, auth } = usePage<SharedData>().props;
    const isAdmin = auth.roles.includes('admin');

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-3 py-5 text-left text-lg border-b">
                    <span><Mail className='w-[15px]'/> </span><UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <div className="dropdown-menu-mail">
                {brands && brands.length > 0 ? (
                    <>
                        {brands.map((brand: { id: number; name: string; website: string }) => {
                            let hostname = '';
                            let faviconUrl = '';
                            
                            try {
                                if (brand.website) {
                                    hostname = new URL(brand.website).hostname.replace('www.', '');
                                    faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
                                }
                            } catch {
                                // Invalid URL, use brand name as fallback
                                hostname = brand.website || 'No URL';
                            }
                            
                            return (
                                <Link key={brand.id} href={`/brands/${brand.id}`}>
                                    {brand.name}
                                    <span className="flex items-center gap-1.5">
                                        {faviconUrl && (
                                            <img 
                                                src={faviconUrl}
                                                alt={`${brand.name} favicon`}
                                                className="w-4 h-4"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        )}
                                    </span>
                                </Link>
                            );
                        })}
                        {isAdmin && (
                            <Link href="/brands" className="show-all-link">
                                Show All Brands
                            </Link>
                        )}
                    </>
                ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                        No brands yet
                    </div>
                )}
            </div>
            <DropdownMenuGroup className='dropdown-menu-link'>
                {/* <DropdownMenuItem asChild className='btn-default'>
                    <Link href="/brands" className='btn-default'>
                        <Building2 className="h-4 w-4" />
                        Brand List
                    </Link>
                </DropdownMenuItem> */}
                <DropdownMenuItem asChild className='btn-default'>
                    <Link href="/brands/create" className='btn-default'>
                        <CirclePlus className="h-4 w-4" />
                        New Brand
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className='btn-default'>
                    <Link className="block w-full btn-default" href={route('profile.edit')} as="button" prefetch onClick={cleanup}>
                        <Settings className="mr-2" />
                        Settings
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className='btn-logout'>
                    <Link className="block w-full btn-logout" method="post" href={route('logout')} as="button" onClick={handleLogout}>
                        <LogOut className="mr-2" />
                        Logout
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
        </>
    );
}
