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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
            {prompts.map((prompt) => {
                // Debug: log AI model data
                if (prompt.ai_model) {
                    console.log('AI Model:', prompt.ai_model);
                }
                
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
                        className="flex flex-col rounded-2xl border p-3 shadow-sm hover:shadow-md transition-all duration-200 bg-white cursor-pointer"
                        onClick={() => onPromptClick?.(prompt)}
                    >
                        <CardContent className="p-0 flex flex-col gap-4">
                            {/* First Row: AI Model Logo + Prompt Title and Text */}
                            <div className="flex gap-3">
                                {/* First Column: AI Model Logo */}
                                <div className="flex-shrink-0">
                                    {prompt.ai_model ? (
                                        prompt.ai_model.icon ? (
                                            <img 
                                                src={`/storage/${prompt.ai_model.icon}`}
                                                alt={prompt.ai_model.display_name}
                                                className="w-4 h-8 object-contain rounded"
                                                onError={(e) => {
                                                    // Show fallback with first letter of AI model name
                                                    const target = e.currentTarget;
                                                    const fallbackDiv = document.createElement('div');
                                                    fallbackDiv.className = 'w-4 h-8 bg-gray-200 rounded flex items-center justify-center text-gray-600 font-semibold text-lg';
                                                    fallbackDiv.textContent = prompt.ai_model?.display_name?.charAt(0).toUpperCase() || 'AI';
                                                    target.parentNode?.replaceChild(fallbackDiv, target);
                                                }}
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-600 font-semibold text-lg">
                                                {prompt.ai_model.display_name?.charAt(0).toUpperCase() || 'AI'}
                                            </div>
                                        )
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-600 font-semibold text-lg">
                                            AI
                                        </div>
                                    )}
                                </div>

                                {/* Second Column: Prompt Title and Text */}
                                <div className="flex-1 flex flex-col gap-1">
                                    <div className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                                        {prompt.prompt}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {stripHtml(prompt.ai_response).substring(0, 150)}
                                        {stripHtml(prompt.ai_response).length > 150 ? '...' : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Second Row: Resource Logos + Date */}
                            <div className="flex items-center justify-between gap-1">
                                {/* First Column: All Resource Logos */}
                                <div className="flex items-center gap-2 flex-wrap ml-3">
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
                                </div>

                                {/* Second Column: Date */}
                                <div className="flex-shrink-0">
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {dateText}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
