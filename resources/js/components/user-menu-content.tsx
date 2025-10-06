import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User } from '@/types';
import { Link, router } from '@inertiajs/react';
import { LogOut, Settings,CirclePlus,Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();

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
                <Link href="/">
                    New Brand
                </Link>
            </div>
            <DropdownMenuGroup className='dropdown-menu-link'>
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
