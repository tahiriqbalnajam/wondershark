import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Prompt {
    id: number;
    prompt: string;
    ai_response?: string;
    sentiment?: string;
    position?: number;
    visibility?: number;
    is_active: boolean;
    analysis_completed_at?: string;
    ai_model?: {
        id: number;
        name: string;
        display_name: string;
        icon?: string;
        provider?: string;
    };
    prompt_resources?: Array<{
        url: string;
        type: string;
        title: string;
        description: string;
        domain: string;
        is_competitor_url: boolean;
    }>;
}

interface AiCitationsProps {
    prompts: Prompt[];
    onPromptClick?: (prompt: Prompt) => void;
}

export function AiCitations({ prompts, onPromptClick }: AiCitationsProps) {
    if (!prompts || prompts.length === 0) {
        return (
            <div className="p-12 text-center text-muted-foreground">
                <p>No AI citations found for this filter.</p>
            </div>
        );
    }

    // Helper function to strip HTML and get plain text
    const stripHtml = (html: string | undefined): string => {
        if (!html) return '';
        
        // Create a temporary div element to parse HTML
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {prompts.map((prompt) => {
                // Get unique competitor logos from prompt_resources
                const competitorLogos = prompt.prompt_resources
                    ?.filter(resource => resource.is_competitor_url)
                    .map(resource => {
                        const cleanDomain = resource.domain.replace(/^www\./, '');
                        return `https://img.logo.dev/${cleanDomain}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`;
                    })
                    .slice(0, 4) || [];

                // Format date
                const daysAgo = prompt.analysis_completed_at
                    ? Math.floor((new Date().getTime() - new Date(prompt.analysis_completed_at).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                const dateText = daysAgo !== null 
                    ? daysAgo === 0 ? 'Today' 
                    : daysAgo === 1 ? 'Yesterday' 
                    : `${daysAgo} days ago`
                    : 'Not analyzed';

                return (
                    <Card
                        key={prompt.id}
                        className="flex flex-col rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 bg-white cursor-pointer"
                        onClick={() => onPromptClick?.(prompt)}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2 ailogo">
                                {prompt.ai_model && (
                                    <>
                                        {prompt.ai_model.icon && (
                                            <img 
                                                src={`/storage/${prompt.ai_model.icon}`}
                                                alt={prompt.ai_model.display_name}
                                                className="w-5 h-5 object-contain rounded"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        )}
                                        <Badge variant="secondary" className="text-xs">
                                            {prompt.ai_model.display_name}
                                        </Badge>
                                    </>
                                )}
                            </div>
                            <span className="text-sm text-muted-foreground">{dateText}</span>
                        </div>

                        {/* Body */}
                        <CardContent className="p-0">
                            <h3 className="text-lg font-semibold leading-snug text-foreground line-clamp-2">
                                {prompt.prompt}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {stripHtml(prompt.ai_response).substring(0, 150)}
                                {stripHtml(prompt.ai_response).length > 150 ? '...' : ''}
                            </p>

                            {/* Footer */}
                            <div className="flex items-center gap-2 mt-4 flex-wrap">
                                {prompt.position !== undefined && prompt.position !== null && (
                                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                        #{prompt.position}
                                    </span>
                                )}

                                {competitorLogos.map((logo, i) => (
                                    <img
                                        key={i}
                                        src={logo}
                                        alt={`competitor-${i}`}
                                        className="w-6 h-6 rounded-md border object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`;
                                        }}
                                    />
                                ))}

                                {prompt.sentiment && (
                                    <span className="flex items-center gap-1 text-xs font-semibold bg-muted px-2 py-1 rounded-md ml-auto">
                                        <span className={prompt.sentiment === 'positive' ? 'text-green-600' : prompt.sentiment === 'negative' ? 'text-red-600' : 'text-yellow-600'}>▮</span> 
                                        {prompt.sentiment}
                                    </span>
                                )}

                                {prompt.visibility !== undefined && prompt.visibility !== null && (
                                    <span className="flex items-center gap-1 text-xs font-semibold bg-muted px-2 py-1 rounded-md">
                                        {prompt.visibility}%
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
