import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import InputError from '@/components/input-error';
import { AddPromptDialog } from '@/components/brand/add-prompt-dialog';
import { 
    CheckCircle,
    Trash2,
    MessageSquare,
    Sparkles,
    Loader2,
    RefreshCw,
    MoreHorizontal
} from 'lucide-react';
import { Step2Props, GeneratedPrompt } from './types';
import { useState, useEffect, useCallback } from 'react';

export default function Step2Prompts({ 
    data, 
    errors,
    isGeneratingPrompts,
    aiGeneratedPrompts,
    generateAIPrompts,
    acceptPrompt,
    rejectPrompt,
    removeAcceptedPrompt,
    isPromptAccepted,
    isPromptRejected,
    handleManualPromptAdd,
    removePrompt,
    aiModels
}: Step2Props) {
    const [displayedPrompts, setDisplayedPrompts] = useState<GeneratedPrompt[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [currentOffset, setCurrentOffset] = useState(0);

    const loadPromptsWithRatio = useCallback(async (offset: number = 0) => {
        if (!data.website.trim()) return;
        
        setIsLoadingMore(true);
        
        try {
            const response = await fetch(route('brands.getPromptsWithRatio'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    website: data.website,
                    limit: 25,
                    offset: offset,
                }),
            });

            const result = await response.json();

            if (result.success) {
                if (offset === 0) {
                    // Initial load
                    setDisplayedPrompts(result.prompts);
                } else {
                    // Load more
                    setDisplayedPrompts(prev => [...prev, ...result.prompts]);
                }
                setHasMore(result.has_more);
                setTotalCount(result.total_count);
                setCurrentOffset(offset + result.prompts.length);
            }
        } catch (error) {
            console.error('Error loading prompts:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [data.website]);

    // Initialize displayed prompts when AI prompts are generated
    useEffect(() => {
        if (aiGeneratedPrompts.length > 0 && data.website) {
            loadPromptsWithRatio(0);
        }
    }, [aiGeneratedPrompts.length, data.website, loadPromptsWithRatio]);

    const handleLoadMore = () => {
        loadPromptsWithRatio(currentOffset);
    };

    // Use displayed prompts if available, fallback to aiGeneratedPrompts
    const promptsToShow = displayedPrompts.length > 0 ? displayedPrompts : aiGeneratedPrompts;

    return (
        <div className="space-y-6 relative">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Add Manual Prompt Button - positioned before Content Prompts */}
                    <AddPromptDialog 
                        brandId={undefined} 
                        className="shadow-sm"
                        onPromptAdd={handleManualPromptAdd}
                    />
                    <h3 className="text-lg font-semibold">Content Prompts ({data.prompts.length}/25)</h3>
                </div>
                <div className="flex items-center gap-2">
                    {!isGeneratingPrompts && promptsToShow.length > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={generateAIPrompts}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Regenerate
                        </Button>
                    )}
                    {isGeneratingPrompts && (
                        <div className="flex items-center gap-2 text-primary">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Generating AI prompts...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Models Summary */}
            {/* <div className="grid gap-4">
                <div>
                    <Label>AI Models for Prompt Generation</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                        The following AI models will automatically generate prompts for your brand
                    </p>
                </div>
                <div className="grid gap-2 p-4 border rounded-lg bg-muted/20">
                    {aiModels.filter(model => model.is_enabled).map((model) => (
                        <div key={model.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="default" className="text-xs">
                                    {model.display_name}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {model.prompts_per_brand} prompts
                                </span>
                            </div>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                    ))}
                    {aiModels.filter(model => model.is_enabled).length === 0 && (
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">
                                No AI models are currently enabled. Please contact admin.
                            </p>
                        </div>
                    )}
                    <div className="border-t pt-2 mt-2">
                        <p className="text-sm font-medium text-center">
                            Total: {aiModels.filter(model => model.is_enabled).reduce((sum, model) => sum + model.prompts_per_brand, 0)} prompts will be generated
                        </p>
                    </div>
                </div>
            </div> */}

            {/* Generate AI Prompts Button */}
            {/* <div className="flex justify-center">
                <Button
                    type="button"
                    onClick={generateAIPrompts}
                    disabled={isGeneratingPrompts || data.ai_providers.length === 0}
                    size="lg"
                    className="w-full max-w-md"
                >
                    {isGeneratingPrompts ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating prompts from {data.ai_providers.length} AI model(s)...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate AI Prompts from All Models ({data.ai_providers.length} available)
                        </>
                    )}
                </Button>
            </div> */}

            {/* AI Generated Prompts */}
            {promptsToShow.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                AI Generated Prompts (Review and Select)
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                Showing {promptsToShow.length} 
                                {totalCount > 0 && ` of ${totalCount}`} prompts
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {promptsToShow.map((prompt) => {
                                const accepted = isPromptAccepted(prompt);
                                const rejected = isPromptRejected(prompt);
                                
                                return (
                                    <div 
                                        key={prompt.id} 
                                        className={`p-4 border rounded-lg transition-all ${
                                            accepted ? 'border-green-200 bg-green-50' :
                                            rejected ? 'border-gray-200 bg-gray-50 opacity-60' :
                                            'border-gray-200 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1">
                                                <p className={`text-sm ${rejected ? 'text-gray-500' : 'text-gray-900'}`}>
                                                    {prompt.prompt}
                                                </p>
                                                <Badge variant="outline" className="mt-2">
                                                    {prompt.ai_provider}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-2">
                                                {accepted ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="default"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        disabled
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Accepted
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-green-500 text-green-600 hover:bg-green-50"
                                                        onClick={() => acceptPrompt(prompt)}
                                                        disabled={data.prompts.length >= 25}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Accept
                                                    </Button>
                                                )}
                                                
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className={rejected ? "border-gray-400 text-gray-600" : "border-red-500 text-red-600 hover:bg-red-50"}
                                                    onClick={() => rejected ? acceptPrompt(prompt) : rejectPrompt(prompt)}
                                                >
                                                    {rejected ? (
                                                        <>
                                                            <RefreshCw className="h-4 w-4 mr-1" />
                                                            Restore
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Load More Button */}
                        {hasMore && (
                            <div className="flex justify-center mt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleLoadMore}
                                    disabled={isLoadingMore}
                                    className="flex items-center gap-2"
                                >
                                    {isLoadingMore ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading more prompts...
                                        </>
                                    ) : (
                                        <>
                                            <MoreHorizontal className="h-4 w-4" />
                                            Load More Prompts
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground">
                            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            {isGeneratingPrompts ? (
                                <>
                                    <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                                    <p>Generating AI prompts for your website...</p>
                                    <p className="text-sm mt-2">This may take a few moments.</p>
                                </>
                            ) : (
                                <>
                                    <p>AI prompts will be generated automatically based on your website.</p>
                                    <p className="text-sm mt-2">Make sure to fill in your website in step 1 first.</p>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Current Selected Prompts */}
            {data.prompts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Selected Prompts ({data.prompts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {data.prompts.map((prompt, index) => {
                                const aiPrompt = promptsToShow.find(p => p.prompt === prompt);
                                return (
                                    <div key={index} className="flex items-start justify-between gap-3 p-3 border rounded-lg bg-green-50 border-green-200">
                                        <div className="flex-1">
                                            <Badge variant="outline" className="mb-2 border-green-600 text-green-700">
                                                Selected #{index + 1}
                                            </Badge>
                                            <p className="text-sm">{prompt}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => aiPrompt ? removeAcceptedPrompt(prompt) : removePrompt(index)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            <InputError message={errors.prompts} />
        </div>
    );
}
