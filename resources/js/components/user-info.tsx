import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { router } from '@inertiajs/react';

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
    const selectedBrand = page.props.brands?.find(b => b.id === currentBrandId) || (page.props as any).brand;
    
    // Show brand name if a brand is selected, otherwise show user name
    const displayName = selectedBrand ? selectedBrand.name : user.name;
    const displayInitials = getInitials(displayName);
    
    // Use thumbnail for sidebar (smaller), full logo for other places
    // Priority: brand avatar > agency thumbnail > agency logo > avatar
    let displayImage = selectedBrand
        ? user.avatar
        : (user.logo || user.logo_thumbnail || user.avatar);

    if(!displayImage && user.logo) {
         displayImage = user.logo.replace(
            'http://wondershark.test/storage/http',
            'http');

        displayImage = displayImage.replace(
            'https://app.wondershark.ai/storage/http',
            'http');
    }


    if(!displayImage && user.logo_thumbnail) {
         displayImage = user.logo_thumbnail.replace(
            'http://wondershark.test/storage/http',
            'http');

        displayImage = displayImage.replace(
            'https://app.wondershark.ai/storage/http',
            'http');
    }

    if(!displayImage && user.avatar) {
         displayImage = user.avatar.replace(
            'http://wondershark.test/storage/http',
            'http');

        displayImage = displayImage.replace(
            'https://app.wondershark.ai/storage/http',
            'http');
    }

    // Function to check if image is accessible
    const checkImageAccessibility = (url: string | null): Promise<boolean> => {
        return new Promise((resolve) => {
            if (!url) {
                resolve(false);
                return;
            }

            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    };

    // Check image accessibility (optional - for debugging)
    if (displayImage) {
        checkImageAccessibility(displayImage).then(isAccessible => {
           // console.log('Display image accessible:', isAccessible, 'URL:', displayImage);
            if (!isAccessible) {
                //console.log(user.agencyMembership.logo);
                //window.location.reload();
            }
        });
    }

    console.log('Selected Brand displayImage:', displayImage);
    console.log('User logo:', user.logo);
    console.log('User logo_thumbnail:', user.logo_thumbnail);
    // For brand logo, use stored logo if available, otherwise use the logo.dev API
    const brandLogoUrl = selectedBrand?.logo 
        ? `/storage/${selectedBrand.logo}`
        : (selectedBrand?.website ? 
            `https://img.logo.dev/${selectedBrand.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA` 
            : null);

    // Use agency logo (user.logo or user.logo_thumbnail) for the avatar fallback
    let agencyLogoUrl = user.logo ? `${user.logo}` : (user.logo_thumbnail ? `${user.logo_thumbnail}` : null);

     if (!agencyLogoUrl) {
        agencyLogoUrl = selectedBrand?.website ? 
            `https://img.logo.dev/${selectedBrand.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA` 
            : null;
    }


    return (
        <>
            <Avatar className="h-[40px] w-[40px] overflow-hidden rounded-md flex-1 user-img">
                <AvatarImage src={displayImage} alt={displayName} />
                <AvatarFallback className="rounded-md bg-transparent text-black font-bold dark:bg-transparent dark:text-white">
                    {agencyLogoUrl ? (
                        <img
                            src={agencyLogoUrl}
                            alt={user.name}
                            className="vvv w-full h-full object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement;
                                if (fallback) {
                                    fallback.textContent = displayInitials;
                                }
                            }}
                        />
                     ) : (
                        displayInitials
                    )}
                </AvatarFallback>
            </Avatar>
            {/* <div className="grid text-left text-sm leading-tight">
                <span className="truncate user-name font-medium">{displayName}</span>
                {showEmail && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
            </div> */}
        </>
    );
}
