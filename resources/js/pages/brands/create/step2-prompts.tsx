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
    const [checkedList, setCheckedList] = useState([false, false, false])

    const checkedCount = checkedList.filter(Boolean).length
    const allChecked = checkedCount === checkedList.length
    const someChecked = checkedCount > 0 && !allChecked

    // Toggle single row
    const handleCheck = (index: number, value: boolean) => {
        const newList = [...checkedList]
        newList[index] = value
        setCheckedList(newList)
    }

    // Toggle all from thead
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
            <Tabs defaultValue="active" className="add-prompts-wrapp">
                <div className="flex justify-between items-center mb-10">
                    <TabsList className="add-prompt-lists border">
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="suggested">Suggested</TabsTrigger>
                        <TabsTrigger value="inactive">Inactive</TabsTrigger>
                    </TabsList>
                    <AddPromptDialog brandId={undefined} className="add-prompt-btn" onPromptAdd={handleManualPromptAdd} />
                </div>
                <TabsContent value="active" className="active-table-prompt">
                    <Table className="default-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[70px] text-center p-0"><Checkbox id="terms" checked={allChecked} onCheckedChange={(val) => handleCheckAll(!!val)} /></TableHead>
                                <TableHead>Prompt</TableHead>
                                <TableHead><div className="flex items-center"><Eye className="w-4 mr-2"/> Visibility</div></TableHead>
                                <TableHead><div className="flex items-center"><Smile className="w-4 mr-2"/> Sentiment</div></TableHead>
                                <TableHead><div className="flex items-center"><ChevronsUpDown className="w-4 mr-2"/> Position</div></TableHead>
                                <TableHead><div className="flex items-center"><Trophy className="w-4 mr-2"/> Mentions</div></TableHead>
                                <TableHead><div className="flex items-center"><MapPin className="w-4 mr-2"/> Location</div></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableHead className="w-[70px] text-center p-0"><Checkbox id="terms" checked={checkedList[0]} onCheckedChange={(val) => handleCheck(0, !!val)} /></TableHead>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
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
                             <TableRow>
                                <TableHead className="w-[70px] text-center p-0"><Checkbox id="terms" checked={checkedList[1]} onCheckedChange={(val) => handleCheck(1, !!val)} /></TableHead>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
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
                             <TableRow>
                                <TableHead className="w-[70px] text-center p-0"><Checkbox id="terms" checked={checkedList[2]} onCheckedChange={(val) => handleCheck(2, !!val)} /></TableHead>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
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
                            <TableRow>
                                <TableHead className="w-[70px] text-center p-0"><Checkbox id="terms" checked={checkedList[3]} onCheckedChange={(val) => handleCheck(3, !!val)} /></TableHead>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
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
                        </TableBody>
                    </Table>
                </TabsContent>
                <TabsContent value="suggested" className="active-table-prompt">
                    <div className="suggested-prompts-box flex justify-between items-center p-4 border rounded-sm mb-5">
                        <p className='flex items-center gap-3 text-sm'><Sparkles className='text-orange-600'/><b>Suggested prompts.</b> Expand your brand's presence with suggested prompts.</p><button className='py-2 px-4 bg-gray-200 text-gray-950 rounded-sm text-sm hover:bg-orange-600 hover:text-white'>Suggest More</button>
                    </div>
                    <Table className="default-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Suggested Prompt</TableHead>
                                <TableHead><div className="flex items-center"><ChevronsUpDown className="w-4 mr-2"/> Suggested At</div></TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
                                <TableCell>1 day ago</TableCell>
                                <TableCell>
                                    <div className="flex gap-3 justify-center">
                                        <button className="border px-4 py-1 rounded-sm bg-red-100 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600">Reject</button>
                                        <button className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white">Track</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
                                <TableCell>1 day ago</TableCell>
                                <TableCell>
                                    <div className="flex gap-3 justify-center">
                                        <button className="border px-4 py-1 rounded-sm bg-red-100 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600">Reject</button>
                                        <button className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white">Track</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
                                <TableCell>1 day ago</TableCell>
                                <TableCell>
                                    <div className="flex gap-3 justify-center">
                                        <button className="border px-4 py-1 rounded-sm bg-red-100 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600">Reject</button>
                                        <button className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white">Track</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
                                <TableCell>1 day ago</TableCell>
                                <TableCell>
                                    <div className="flex gap-3 justify-center">
                                        <button className="border px-4 py-1 rounded-sm bg-red-100 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600">Reject</button>
                                        <button className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white">Track</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TabsContent>
                <TabsContent value="inactive" className="active-table-prompt">
                    <Table className="default-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[70px] text-center p-0"><Checkbox id="terms" checked={allChecked} onCheckedChange={(val) => handleCheckAll(!!val)} /></TableHead>
                                <TableHead>Suggested Prompt</TableHead>
                                <TableHead><div className="flex items-center"><ChevronsUpDown className="w-4 mr-2"/> Suggested At</div></TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableHead className="w-[70px] text-center p-0"><Checkbox id="terms" checked={checkedList[0]} onCheckedChange={(val) => handleCheck(0, !!val)} /></TableHead>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
                                <TableCell>1 day ago</TableCell>
                                <TableCell>
                                    <div className="flex justify-center">
                                        <button className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white">Added</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableHead className="w-[70px] text-center p-0"><Checkbox id="terms" checked={checkedList[1]} onCheckedChange={(val) => handleCheck(1, !!val)} /></TableHead>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
                                <TableCell>1 day ago</TableCell>
                                <TableCell>
                                    <div className="flex justify-center">
                                        <button className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white">Added</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableHead className="w-[70px] text-center p-0"><Checkbox id="terms" checked={checkedList[2]} onCheckedChange={(val) => handleCheck(2, !!val)} /></TableHead>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
                                <TableCell>1 day ago</TableCell>
                                <TableCell>
                                    <div className="flex justify-center">
                                        <button className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white">Added</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableHead className="w-[70px] text-center p-0"><Checkbox id="terms" checked={checkedList[3]} onCheckedChange={(val) => handleCheck(3, !!val)} /></TableHead>
                                <TableCell>How do I find and partner with Amazon influencers for my products?</TableCell>
                                <TableCell>1 day ago</TableCell>
                                <TableCell>
                                    <div className="flex justify-center">
                                        <button className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white">Added</button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TabsContent>
            </Tabs>
            <div className={`prompts-action ${checkedCount > 0 ? "active" : ""}`}>
                <p>{checkedCount > 0
                ? `${checkedCount} Selected`
                : "0 Select"}</p>
                <div className="prompts-action-btns">
                    <button className="active-ch"><CircleCheckBig/> Active</button>
                    <button className="deactive-ch"><CircleAlert/>Deactive</button>
                    <button className="delete-ch"><Power/>Delete</button>
                </div>
            </div>
        </div>
    );
}
