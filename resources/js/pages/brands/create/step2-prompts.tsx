// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import InputError from '@/components/input-error';
import { AddPromptDialog } from '@/components/brand/add-prompt-dialog';
// import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
// import { Textarea } from '@/components/ui/textarea';
import { 
    Eye,
    Smile,
    ChevronsUpDown,
    Trophy,
    MapPin,
    CircleCheckBig,
    CircleAlert,
    Power,
    Sparkles
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
    
    // Keep our own copy of all prompts (never remove from this list)
    // Load from sessionStorage on mount
    const [allPrompts, setAllPrompts] = useState<GeneratedPrompt[]>(() => {
        try {
            const saved = sessionStorage.getItem('allPrompts');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    
    // Track prompt states: 'suggested' (default for AI generated), 'active' (tracked), 'inactive' (rejected)
    // Load from sessionStorage on mount
    const [promptStates, setPromptStates] = useState<Record<number, 'suggested' | 'active' | 'inactive'>>(() => {
        try {
            const saved = sessionStorage.getItem('promptStates');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // Save to sessionStorage whenever promptStates changes
    useEffect(() => {
        sessionStorage.setItem('promptStates', JSON.stringify(promptStates));
    }, [promptStates]);

    // Save allPrompts to sessionStorage whenever it changes
    useEffect(() => {
        sessionStorage.setItem('allPrompts', JSON.stringify(allPrompts));
    }, [allPrompts]);

    // Update allPrompts when aiGeneratedPrompts changes (add new prompts, never remove)
    useEffect(() => {
        if (aiGeneratedPrompts && aiGeneratedPrompts.length > 0) {
            setAllPrompts(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const newPrompts = aiGeneratedPrompts.filter(p => !existingIds.has(p.id));
                return [...prev, ...newPrompts];
            });
        }
    }, [aiGeneratedPrompts]);

    // Initialize all AI-generated prompts as 'suggested' by default
    useEffect(() => {
        if (allPrompts && allPrompts.length > 0) {
            const initialStates: Record<number, 'suggested' | 'active' | 'inactive'> = {};
            allPrompts.forEach((prompt) => {
                if (!promptStates[prompt.id]) {
                    initialStates[prompt.id] = 'suggested';
                }
            });
            if (Object.keys(initialStates).length > 0) {
                setPromptStates(prev => ({ ...prev, ...initialStates }));
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allPrompts]);

    // Categorize prompts by their state - USE allPrompts instead of aiGeneratedPrompts
    const suggestedPrompts = allPrompts?.filter(p => {
        const state = promptStates[p.id];
        return !state || state === 'suggested';
    }) || [];
    const activePrompts = allPrompts?.filter(p => promptStates[p.id] === 'active') || [];
    const inactivePrompts = allPrompts?.filter(p => promptStates[p.id] === 'inactive') || [];

    // Debug logging
    useEffect(() => {
        console.log('=== PROMPT DEBUG ===');
        console.log('All Prompts:', allPrompts);
        console.log('Prompt States:', promptStates);
        console.log('AI Generated Prompts:', aiGeneratedPrompts);
        console.log('Suggested Prompts:', suggestedPrompts.length, suggestedPrompts);
        console.log('Active Prompts:', activePrompts.length, activePrompts);
        console.log('Inactive Prompts:', inactivePrompts.length, inactivePrompts);
        console.log('===================');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [promptStates, aiGeneratedPrompts, allPrompts, suggestedPrompts.length, activePrompts.length, inactivePrompts.length]);

    // Handle Track button - move prompt from suggested to active
    const handleTrackPrompt = (prompt: GeneratedPrompt) => {
        console.log('Tracking prompt:', prompt.id, prompt.prompt);
        setPromptStates(prev => {
            const newStates = {
                ...prev,
                [prompt.id]: 'active' as const
            };
            console.log('New states after tracking:', newStates);
            return newStates;
        });
        // Call parent acceptPrompt if available
        if (acceptPrompt) {
            acceptPrompt(prompt);
        }
    };

    // Handle Reject button - move prompt from suggested to inactive
    const handleRejectPrompt = (prompt: GeneratedPrompt) => {
        console.log('Rejecting prompt:', prompt.id, prompt.prompt);
        setPromptStates(prev => {
            const newStates = {
                ...prev,
                [prompt.id]: 'inactive' as const
            };
            console.log('New states after rejecting:', newStates);
            return newStates;
        });
        // DON'T call parent rejectPrompt - it removes the prompt from the array!
        // We need to keep it in our allPrompts list to show in Inactive tab
        // if (rejectPrompt) {
        //     rejectPrompt(prompt);
        // }
    };

    // Handle Add button from inactive - move back to active
    const handleActivatePrompt = (prompt: GeneratedPrompt) => {
        console.log('Activating prompt:', prompt.id, prompt.prompt);
        setPromptStates(prev => {
            const newStates = {
                ...prev,
                [prompt.id]: 'active' as const
            };
            console.log('New states after activating:', newStates);
            return newStates;
        });
        if (acceptPrompt) {
            acceptPrompt(prompt);
        }
    };

    // Format timestamp for display
    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return 'Recently';
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            
            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
            if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
            
            return date.toLocaleDateString();
        } catch {
            return 'Recently';
        }
    };

    // Wrapper for handleManualPromptAdd to add prompts to suggested state
    const handleManualPromptAddWrapper = (prompt: string, _countryCode: string) => {
        // Call parent function to add to data.prompts
        if (handleManualPromptAdd) {
            handleManualPromptAdd(prompt);
        }
    };

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

    // Track selected prompts by their IDs instead of indexes
    const [selectedPromptIds, setSelectedPromptIds] = useState<Set<number>>(new Set());
    const [currentTab, setCurrentTab] = useState<'active' | 'suggested' | 'inactive'>('suggested');

    const checkedCount = selectedPromptIds.size;

    // Toggle single prompt selection
    const togglePromptSelection = (promptId: number) => {
        setSelectedPromptIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(promptId)) {
                newSet.delete(promptId);
            } else {
                newSet.add(promptId);
            }
            return newSet;
        });
    };

    // Check if prompt is selected
    const isPromptSelected = (promptId: number) => {
        return selectedPromptIds.has(promptId);
    };

    // Toggle all prompts in current tab
    const toggleAllPromptsInTab = (checked: boolean) => {
        let currentPrompts: GeneratedPrompt[] = [];
        
        switch (currentTab) {
            case 'active':
                currentPrompts = activePrompts;
                break;
            case 'suggested':
                currentPrompts = suggestedPrompts;
                break;
            case 'inactive':
                currentPrompts = inactivePrompts;
                break;
        }

        if (checked) {
            // Select all prompts in current tab
            const newSet = new Set(selectedPromptIds);
            currentPrompts.forEach(p => newSet.add(p.id));
            setSelectedPromptIds(newSet);
        } else {
            // Deselect all prompts in current tab
            const idsInTab = new Set(currentPrompts.map(p => p.id));
            const newSet = new Set([...selectedPromptIds].filter(id => !idsInTab.has(id)));
            setSelectedPromptIds(newSet);
        }
    };

    // Check if all prompts in current tab are selected
    const areAllPromptsInTabSelected = () => {
        let currentPrompts: GeneratedPrompt[] = [];
        
        switch (currentTab) {
            case 'active':
                currentPrompts = activePrompts;
                break;
            case 'suggested':
                currentPrompts = suggestedPrompts;
                break;
            case 'inactive':
                currentPrompts = inactivePrompts;
                break;
        }

        if (currentPrompts.length === 0) return false;
        
        return currentPrompts.every(p => selectedPromptIds.has(p.id));
    };

    // Bulk action handlers
    const handleBulkActivate = () => {
        console.log('Bulk activating prompts:', selectedPromptIds);
        selectedPromptIds.forEach(promptId => {
            setPromptStates(prev => ({
                ...prev,
                [promptId]: 'active'
            }));
        });
        setSelectedPromptIds(new Set()); // Clear selection after action
    };

    const handleBulkDeactivate = () => {
        console.log('Bulk deactivating prompts:', selectedPromptIds);
        selectedPromptIds.forEach(promptId => {
            setPromptStates(prev => ({
                ...prev,
                [promptId]: 'inactive'
            }));
        });
        setSelectedPromptIds(new Set()); // Clear selection after action
    };

    const handleBulkDelete = () => {
        console.log('Bulk deleting prompts:', selectedPromptIds);
        // Remove from allPrompts
        setAllPrompts(prev => prev.filter(p => !selectedPromptIds.has(p.id)));
        // Remove from promptStates
        setPromptStates(prev => {
            const newStates = { ...prev };
            selectedPromptIds.forEach(id => delete newStates[id]);
            return newStates;
        });
        setSelectedPromptIds(new Set()); // Clear selection after action
    };

    // Legacy checkbox state for backward compatibility (if needed elsewhere)
    const [checkedList, setCheckedList] = useState([false, false, false])
    const allChecked = checkedCount === checkedList.length
    const someChecked = checkedCount > 0 && !allChecked

    // Toggle single row (legacy)
    const handleCheck = (index: number, value: boolean) => {
        const newList = [...checkedList]
        newList[index] = value
        setCheckedList(newList)
    }

    // Toggle all from thead (legacy)
    const handleCheckAll = (value: boolean) => {
        setCheckedList(checkedList.map(() => value))
    }

    return (
        <div className="space-y-6 relative mt-15">
            <div className="flex items-center justify-between">
                <div className="">
                    <h3 className="text-xl font-semibold">Add Prompt <small className="text-gray-400 text-sm"> - {data.prompts.length}/10 Prompts</small></h3>
                    <p className="text-gray-400 text-sm">Create a competitive prompt without mentioning your own brand. Every line will be a separate prompt.</p>
                </div>
            </div>
            <Tabs defaultValue="suggested" className="add-prompts-wrapp" onValueChange={(value) => setCurrentTab(value as 'active' | 'suggested' | 'inactive')}>
                <div className="flex justify-between items-center mb-10">
                    <TabsList className="add-prompt-lists border">
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="suggested">Suggested</TabsTrigger>
                        <TabsTrigger value="inactive">Inactive</TabsTrigger>
                    </TabsList>
                    <AddPromptDialog brandId={undefined} className="add-prompt-btn" onPromptAdd={handleManualPromptAddWrapper} />
                </div>
                <TabsContent value="active" className="active-table-prompt">
                    <Table className="default-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[70px] text-center p-0">
                                    <Checkbox 
                                        id="active-select-all" 
                                        checked={areAllPromptsInTabSelected()} 
                                        onCheckedChange={(val) => toggleAllPromptsInTab(!!val)} 
                                    />
                                </TableHead>
                                <TableHead>Prompt</TableHead>
                                <TableHead><div className="flex items-center"><Eye className="w-4 mr-2"/> Visibility</div></TableHead>
                                <TableHead><div className="flex items-center"><Smile className="w-4 mr-2"/> Sentiment</div></TableHead>
                                <TableHead><div className="flex items-center"><ChevronsUpDown className="w-4 mr-2"/> Position</div></TableHead>
                                <TableHead><div className="flex items-center"><Trophy className="w-4 mr-2"/> Mentions</div></TableHead>
                                <TableHead><div className="flex items-center"><MapPin className="w-4 mr-2"/> Location</div></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activePrompts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <CircleCheckBig className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-500 mb-2">No active prompts yet</p>
                                        <p className="text-gray-400 text-sm">Click "Track" on suggested prompts to add them here</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activePrompts.map((prompt) => (
                                    <TableRow key={prompt.id}>
                                        <TableHead className="w-[70px] text-center p-0">
                                            <Checkbox 
                                                id={`active-${prompt.id}`} 
                                                checked={isPromptSelected(prompt.id)} 
                                                onCheckedChange={() => togglePromptSelection(prompt.id)} 
                                            />
                                        </TableHead>
                                        <TableCell>{prompt.prompt}</TableCell>
                                        <TableCell>17%</TableCell>
                                        <TableCell><Badge className="sentiment-td"><span></span> 62</Badge></TableCell>
                                        <TableCell><Badge className="position-td"><span>#</span> 3.5</Badge></TableCell>
                                        <TableCell>
                                            <div className="flex space-x-1 items-center">
                                                <Avatar className="img-avatar">
                                                    <img src="../images/b1.png" alt="icon" />
                                                </Avatar>
                                                <Avatar className="img-avatar">
                                                    <img src="../images/b2.png" alt="icon" />
                                                </Avatar>
                                                <Avatar className="img-avatar">
                                                    <img src="../images/b3.png" alt="icon" />
                                                </Avatar>
                                                <Avatar className="img-avatar">
                                                    <img src="../images/b4.png" alt="icon" />
                                                </Avatar>
                                                <Avatar className="img-avatar">
                                                    <img src="../images/b5.png" alt="icon" />
                                                </Avatar>
                                                <Badge className="h-5 min-w-5 rounded-xs px-1 font-mono tabular-nums bg-fuchsia-200 text-gray-950">+8 </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Avatar className="img-avatar">
                                                <img src="../images/usa.png" alt="icon" /> USA
                                            </Avatar>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TabsContent>
                <TabsContent value="suggested" className="active-table-prompt">
                    <div className="suggested-prompts-box flex justify-between items-center p-4 border rounded-sm mb-5">
                        <p className='flex items-center gap-3 text-sm'><Sparkles className='text-orange-600'/><b>Suggested prompts.</b> Expand your brand's presence with suggested prompts.</p>
                        <button 
                            onClick={generateAIPrompts}
                            disabled={isGeneratingPrompts}
                            className='py-2 px-4 bg-gray-200 text-gray-950 rounded-sm text-sm hover:bg-orange-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                            {isGeneratingPrompts ? 'Generating...' : 'Suggest More'}
                        </button>
                    </div>
                    {suggestedPrompts.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg">
                            <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500 mb-2">No suggested prompts yet</p>
                            <p className="text-gray-400 text-sm">Click "Suggest More" to generate AI-powered prompts</p>
                        </div>
                    ) : (
                        <Table className="default-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Suggested Prompt</TableHead>
                                    <TableHead><div className="flex items-center"><ChevronsUpDown className="w-4 mr-2"/> Suggested At</div></TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {suggestedPrompts.map((prompt) => (
                                    <TableRow key={prompt.id}>
                                        <TableCell>{prompt.prompt}</TableCell>
                                        <TableCell>{formatTimestamp(new Date().toISOString())}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-3 justify-center">
                                                <button 
                                                    onClick={() => handleRejectPrompt(prompt)}
                                                    className="border px-4 py-1 rounded-sm bg-red-100 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600"
                                                >
                                                    Reject
                                                </button>
                                                <button 
                                                    onClick={() => handleTrackPrompt(prompt)}
                                                    className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white"
                                                >
                                                    Track
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </TabsContent>
                <TabsContent value="inactive" className="active-table-prompt">
                    <Table className="default-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[70px] text-center p-0">
                                    <Checkbox 
                                        id="terms-inactive" 
                                        checked={areAllPromptsInTabSelected()} 
                                        onCheckedChange={(checked) => toggleAllPromptsInTab(!!checked)} 
                                    />
                                </TableHead>
                                <TableHead>Suggested Prompt</TableHead>
                                <TableHead><div className="flex items-center"><ChevronsUpDown className="w-4 mr-2"/> Suggested At</div></TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inactivePrompts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12">
                                        <CircleAlert className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-500 mb-2">No inactive prompts</p>
                                        <p className="text-gray-400 text-sm">Rejected prompts will appear here</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                inactivePrompts.map((prompt) => (
                                    <TableRow key={prompt.id}>
                                        <TableHead className="w-[70px] text-center p-0">
                                            <Checkbox 
                                                id={`inactive-${prompt.id}`} 
                                                checked={isPromptSelected(prompt.id)} 
                                                onCheckedChange={() => togglePromptSelection(prompt.id)} 
                                            />
                                        </TableHead>
                                        <TableCell>{prompt.prompt}</TableCell>
                                        <TableCell>{formatTimestamp(new Date().toISOString())}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-center">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleActivatePrompt(prompt)}
                                                    className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TabsContent>
            </Tabs>
            <div className={`prompts-action ${selectedPromptIds.size > 0 ? "active" : ""}`}>
                <p>{selectedPromptIds.size > 0
                ? `${selectedPromptIds.size} Selected`
                : "0 Select"}</p>
                <div className="prompts-action-btns">
                    {currentTab !== 'active' && (
                        <button 
                            type="button"
                            onClick={handleBulkActivate}
                            className="active-ch"
                        >
                            <CircleCheckBig/> Active
                        </button>
                    )}
                    {currentTab !== 'inactive' && (
                        <button 
                            type="button"
                            onClick={handleBulkDeactivate}
                            className="deactive-ch"
                        >
                            <CircleAlert/>Deactive
                        </button>
                    )}
                    <button 
                        type="button"
                        onClick={handleBulkDelete}
                        className="delete-ch"
                    >
                        <Power/>Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
