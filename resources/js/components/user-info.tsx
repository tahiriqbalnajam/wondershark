import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

export function UserInfo({ user, showEmail = false }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();
    const page = usePage<SharedData>();
    
    // Extract brand ID from current URL
    const getCurrentBrandId = (): number | undefined => {
        const path = page.url;
        const match = path.match(/\/brands\/(\d+)/);
        return match ? parseInt(match[1], 10) : undefined;
    };
    
    const currentBrandId = getCurrentBrandId();
    const selectedBrand = page.props.brands?.find(b => b.id === currentBrandId);
    
    // Show brand name if a brand is selected, otherwise show user name
    const displayName = selectedBrand ? selectedBrand.name : user.name;
    const displayInitials = getInitials(displayName);
    
    // Use thumbnail for sidebar (smaller), full logo for other places
    // Priority: brand avatar > agency thumbnail > agency logo > avatar
    const displayImage = selectedBrand 
        ? user.avatar 
        : (user.logo_thumbnail || user.logo || user.avatar);

    return (
        <>
            <Avatar className="h-[40px] w-[40px] overflow-hidden rounded-md user-img">
                <AvatarImage src={displayImage} alt={displayName} />
                <AvatarFallback className="rounded-md bg-neutral-200 text-black font-bold dark:bg-neutral-700 dark:text-white">
                    {displayInitials}
                </AvatarFallback>
            </Avatar>
            <div className="grid text-left text-sm leading-tight">
                <span className="truncate user-name font-medium">{displayName}</span>
                {showEmail && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
            </div>
        </>
    );
}
