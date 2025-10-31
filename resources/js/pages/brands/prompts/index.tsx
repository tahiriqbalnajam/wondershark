import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { Avatar } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Download,
    Building2,
    Eye,
    Smile,
    ChevronsUpDown,
    Trophy,
    Power,
    Search,
    Lightbulb,
    Sparkles,
    Clock,
    Trash2,
    CalendarRange,
    Plus
} from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import Blogo1 from '../../../../../public/images/b1.png';
import Blogo2 from '../../../../../public/images/b2.png';
import Blogo3 from '../../../../../public/images/b3.png';
import Blogo4 from '../../../../../public/images/b4.png';
import Blogo5 from '../../../../../public/images/b5.png';
import Heading from '@/components/heading';

// ✅ Inline visibility bar component (using custom level numbers)
const VisibilityBar = ({ level = 0 }: { level?: number }) => {
    const getColor = (lvl: number) => {
        if (lvl >= 4) return "bg-green-500";   // high
        if (lvl === 3) return "bg-yellow-500"; // medium
        if (lvl === 2) return "bg-orange-500"; // low-medium
        if (lvl === 1) return "bg-red-500";    // very low
        return "bg-gray-300";                  // default
    };

    return (
        <div className="flex flex-row gap-0.5 cursor-pointer" data-state="closed">
            {[...Array(5)].map((_, index) => (
                <div
                    key={index}
                    className={`w-1 h-3 rounded ${index < level ? getColor(level) : "bg-gray-300"}`}
                ></div>
            ))}
        </div>
    );
};

export default function BrandPromptsIndex({ brand }: { brand: {
    website: any;
    logo: any; id: number; name: string 
} }) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [selectAll, setSelectAll] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Brands', href: '/brands' },
        { title: brand.name, href: `/brands/${brand.id}` },
        { title: 'Prompts', href: `/brands/${brand.id}/prompts` },
    ];

    // ✅ Updated table data (using your own "level" numbers)
    const promptData = [
        { id: 1, prompt: "How do I find and partner with Amazon influencers for my products?", visibility:"17%", volume: 5, sentiment: "62", position: 1, mentions: 23, suggestedat:"19 days ago", },
        { id: 2, prompt: "Customer feedback analysis for Q2",visibility:"17%", volume: 3, sentiment: "50", position: 3, mentions: 12 },
        { id: 3, prompt: "Promote influencer collaboration campaign",visibility:"17%", volume: 2, sentiment: "45", position: 5, mentions: 7 },
    ];

    const suggestedData = [
        { id: 1, prompt: "How do I find and partner with Amazon influencers for my products?", volume: 5, suggestedat:"19 days ago", },
        { id: 2, prompt: "Customer feedback analysis for Q2", volume: 3, mentions: 12, suggestedat:"19 days ago", },
        { id: 3, prompt: "Promote influencer collaboration campaign", volume: 2, suggestedat:"19 days ago", },
    ];
    
    const inactiveData = [
        { id: 1, prompt: "How do I find and partner with Amazon influencers for my products?", volume: 5, promptdate:"1 mo. ago", },
        { id: 2, prompt: "Customer feedback analysis for Q2", volume: 3, promptdate:"1 mo. ago", },
        { id: 3, prompt: "Promote influencer collaboration campaign", volume: 2, promptdate:"1 mo. ago", },
    ];

    const discoveredData = [
        { id: 1, prompt: "How do I find and partner with Amazon influencers for my products?", volume: 5, suggestedat:"19 days ago", },
        { id: 2, prompt: "Customer feedback analysis for Q2", volume: 3, mentions: 12, suggestedat:"19 days ago", },
        { id: 3, prompt: "Promote influencer collaboration campaign", volume: 2, suggestedat:"19 days ago", },
    ];

    // ✅ Handle checkbox toggles
    const handleSelect = (checked: boolean | "indeterminate", id: number) => {
        const isChecked = !!checked;
        const newSet = new Set(selectedIds);
        if (isChecked) newSet.add(id);
        else newSet.delete(id);
        setSelectedIds(newSet);
        setSelectAll(newSet.size === promptData.length);
    };

    const handleSelectAll = (checked: boolean | "indeterminate") => {
        const isChecked = !!checked;
        setSelectAll(isChecked);
        if (isChecked) {
            setSelectedIds(new Set(promptData.map((p) => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const selectedCount = selectedIds.size;
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${brand.name} - Prompts`} />
            <TooltipProvider>
                <div className="prompt-action-wrapp space-y-6">
                    <Card className='px-6'>
                        {/* <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    <h2 className='text-lg font-bold capitalize'>{brand.name} <span className='text-muted-foreground font-normal ml-2 text-sm'>{promptData.length}/10 Prompts</span></h2>
                                </div>
                                <p className='text-sm text-muted-foreground'> Manage all prompts for <span>{brand.name}</span></p>
                            </div>
                            <Button variant="outline" className='add-competitor-btn'><Plus/> Add Prompt</Button>
                        </div> */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    {/* ✅ Dynamic Brand Image (logo, favicon, or fallback letter) */}
                                    <div className="w-5 h-5 rounded flex items-center justify-center border-0 bg-transparent">
                                        {brand.logo ? (
                                            <img
                                                src={`/images/brands/${brand.logo}`}
                                                alt={brand.name}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : brand.website ? (
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${new URL(brand.website).hostname}&sz=64`}
                                                alt={brand.name}
                                                className="w-full h-full object-contain"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        ) : (
                                            <span className="text-xs font-semibold text-gray-600">
                                                {brand.name.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-lg font-bold capitalize"> {brand.name} <span className="text-muted-foreground font-normal ml-2 text-sm"> - {promptData.length}/10 Prompts </span> </h2>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Manage all Prompts for <span className='text-black'>{brand.name}</span>
                                </p>
                            </div>
                            <Button variant="outline" className="add-competitor-btn">
                                <Plus /> Add Prompt
                            </Button>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="flex gap-2 common-fields">
                                    <CalendarRange />
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Last 7 days" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7">Last 7 days</SelectItem>
                                            <SelectItem value="14">Last 14 days</SelectItem>
                                            <SelectItem value="30">Last 30 days</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2 common-fields">
                                    <Sparkles />
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="AI Model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7">Last 7 days</SelectItem>
                                            <SelectItem value="14">Last 14 days</SelectItem>
                                            <SelectItem value="30">Last 30 days</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <Tabs defaultValue="active" className="add-prompts-wrapp">
                            <div className="flex justify-between items-center mb-10">
                                <TabsList className="add-prompt-lists border">
                                    <TabsTrigger value="active">Active</TabsTrigger>
                                    <TabsTrigger value="suggested">Suggested</TabsTrigger>
                                    <TabsTrigger value="inactive">Inactive</TabsTrigger>
                                    <TabsTrigger value="discovered">Discovered</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="active" className="active-table-prompt">
                                {/* Table */}
                                <Card className='px-6'>
                                    <div className="flex items-center space-x-2 justify-end">
                                        <input type="text" placeholder="Search..." className="form-input px-3 py-2 border rounded" />
                                        <button type="button" className="py-2 px-5 border rounded flex items-center gap-3 bg-gray-200 hover:bg-gray-300" aria-label="search"><Download className="w-4 h-4" />Export</button>
                                    </div>
                                    <Table className="default-table">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[70px] text-center p-0">
                                                        <Checkbox checked={selectAll} onCheckedChange={handleSelectAll} />
                                                    </TableHead>
                                                    <TableHead>Prompt</TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center">
                                                            <Eye className="w-4 mr-2"/>Visibility
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center">
                                                            <Smile className="w-4 mr-2"/>Sentiment
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center">
                                                            <ChevronsUpDown className="w-4 mr-2"/>Position
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center">
                                                            <Trophy className="w-4 mr-2"/>Mentions
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center">
                                                            <Search className="w-4 mr-2"/>Volume
                                                            <Badge className='ml-2 bg-blue-100 rounded text-blue-600'>Beta</Badge>
                                                        </div>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                        <TableBody>
                                            {promptData.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="w-[70px] text-center p-0">
                                                        <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={(checked) => handleSelect(!!checked, item.id)}/>
                                                    </TableCell>
                                                    <TableCell>{item.prompt}</TableCell>
                                                    <TableCell>
                                                        {item.visibility}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="sentiment-td"><span></span> {item.sentiment}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="position-td"># {item.position}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex space-x-1 items-center">
                                                            <Avatar className="img-avatar"><img src={Blogo1} alt="icon"/></Avatar>
                                                            <Avatar className="img-avatar"><img src={Blogo2} alt="icon"/></Avatar>
                                                            <Avatar className="img-avatar"><img src={Blogo3} alt="icon"/></Avatar>
                                                            <Avatar className="img-avatar"><img src={Blogo4} alt="icon"/></Avatar>
                                                            <Avatar className="img-avatar"><img src={Blogo5} alt="icon"/></Avatar>
                                                            <Badge className="h-5 min-w-5 rounded-xs px-1 font-mono tabular-nums bg-fuchsia-200 text-gray-950"> +{item.mentions || 8} </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <VisibilityBar level={item.volume}/>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>

                                {/* ✅ Selected Action Bar */}
                                <div className={`prompts-action ${selectedCount > 0 ? "active" : ""}`}>
                                    {selectedCount > 0 && (
                                        <p className="text-sm font-medium">
                                            <span>{selectedCount}</span> Selected
                                        </p>
                                    )}
                                    <div className="prompts-action-btns">
                                        <button type="button" className="delete-ch">
                                            <Power/> Deactivate
                                        </button>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="suggested" className="active-table-prompt">
                                {/* Table */}
                                <Card className='px-6'>
                                    <div className="suggested-prompts-box flex justify-between items-center p-4 rounded-sm mb-2 bg-gray-200">
                                        <p className='flex items-center gap-3 text-sm'><Sparkles className='text-orange-600'/><b>Suggested prompts.</b> Expand your brand's presence with suggested prompts.</p>
                                        <button className='flex gap-2 py-2 px-4 bg-white text-gray-950 rounded text-sm hover:bg-orange-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'>
                                           <Lightbulb className="w-4"/> Suggest More
                                        </button>
                                    </div>
                                    <Table className="default-table">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Suggested Prompt</TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center">
                                                            <Search className="w-4 mr-2"/>Volume
                                                            <Badge className='ml-2 bg-blue-100 rounded text-blue-600'>Beta</Badge>
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center">
                                                            <Lightbulb className="w-4 mr-2"/>Suggested At
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                        <TableBody>
                                            {suggestedData.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.prompt}</TableCell>
                                                    <TableCell>
                                                        <VisibilityBar level={item.volume}/>
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.suggestedat}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-3 justify-center">
                                                            <button className="border px-4 py-1 rounded-sm bg-red-100 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600">Reject</button>
                                                            <button className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white" >Track</button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>
                            </TabsContent>
                            <TabsContent value="inactive" className="active-table-prompt">
                                {/* Table */}
                                <Card className='px-6'>
                                    <div className="flex items-center space-x-2 justify-end">
                                        <input type="text" placeholder="Search..." className="form-input px-3 py-2 border rounded" />
                                        <button type="button" className="py-2 px-5 border rounded flex items-center gap-3 bg-gray-200 hover:bg-gray-300" aria-label="search"><Download className="w-4 h-4" />Export</button>
                                    </div>
                                    <Table className="default-table">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[70px] text-center p-0">
                                                        <Checkbox checked={selectAll} onCheckedChange={handleSelectAll} />
                                                    </TableHead>
                                                    <TableHead>Prompt</TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center">
                                                            <Search className="w-4 mr-2"/>Volume
                                                            <Badge className='ml-2 bg-blue-100 rounded text-blue-600'>Beta</Badge>
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center">
                                                            <Clock className="w-4 mr-2"/>Added
                                                        </div>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                        <TableBody>
                                            {inactiveData.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="w-[70px] text-center p-0">
                                                        <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={(checked) => handleSelect(!!checked, item.id)}/>
                                                    </TableCell>
                                                    <TableCell>{item.prompt}</TableCell>
                                                    <TableCell>
                                                        <VisibilityBar level={item.volume}/>
                                                    </TableCell>
                                                    <TableCell>{item.promptdate}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>
                                {/* ✅ Selected Action Bar */}
                                <div className={`prompts-action ${selectedCount > 0 ? "active" : ""}`}>
                                    {selectedCount > 0 && (
                                        <p className="text-sm font-medium">
                                            <span>{selectedCount}</span> Selected
                                        </p>
                                    )}
                                    <div className="prompts-action-btns">
                                        <button type="button" className="active-ch">
                                            <Power/> Activate
                                        </button>
                                        <button type="button" className="delete-ch">
                                            <Trash2/> Delete
                                        </button>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="discovered" className="active-table-prompt">
                                {/* Table */}
                                <Card className='px-6'>
                                    <div className="suggested-prompts-box flex justify-between items-center p-4 rounded-sm mb-2 bg-gray-200">
                                        <p className='flex items-center gap-3 text-sm'><Sparkles className='text-orange-600'/><b>Suggested prompts.</b> Expand your brand's presence with suggested prompts.</p>
                                        <button className='flex gap-2 py-2 px-4 bg-white text-gray-950 rounded text-sm hover:bg-orange-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'>
                                           <Lightbulb className="w-4"/> Suggest More
                                        </button>
                                    </div>
                                    <Table className="default-table">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Suggested Prompt</TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center">
                                                            <Search className="w-4 mr-2"/>Volume
                                                            <Badge className='ml-2 bg-blue-100 rounded text-blue-600'>Beta</Badge>
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center">
                                                            <Lightbulb className="w-4 mr-2"/>Suggested At
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                        <TableBody>
                                            {discoveredData.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.prompt}</TableCell>
                                                    <TableCell>
                                                        <VisibilityBar level={item.volume}/>
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.suggestedat}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-3 justify-center">
                                                            <button className="border px-4 py-1 rounded-sm bg-red-100 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600">Reject</button>
                                                            <button className="border px-4 py-1 rounded-sm bg-gray-200 text-gray-950 hover:bg-orange-600 hover:text-white" >Track</button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </TooltipProvider>
        </AppLayout>
    );
}
