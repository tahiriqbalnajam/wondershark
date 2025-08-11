interface AgencyLogoProps {
    agencyName: string;
    logoUrl?: string | null;
    className?: string;
}

export default function AgencyLogo({ agencyName, logoUrl, className = "size-8" }: AgencyLogoProps) {
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className={`flex aspect-square items-center justify-center rounded-md bg-primary text-primary-foreground ${className}`}>
            {logoUrl ? (
                <img 
                    src={logoUrl} 
                    alt={`${agencyName} logo`} 
                    className="h-full w-full object-contain rounded-md"
                />
            ) : (
                <div className="flex items-center justify-center h-full w-full">
                    <span className="text-sm font-semibold">
                        {getInitials(agencyName)}
                    </span>
                </div>
            )}
        </div>
    );
}
