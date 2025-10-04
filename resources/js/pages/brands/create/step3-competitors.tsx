import React from 'react';
import CompetitorSelector from '@/components/competitor-selector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepProps } from './types';
import { Badge } from "@/components/ui/badge"

interface Competitor {
    id: number;
    name: string;
    domain: string;
    mentions: number;
    status: 'suggested' | 'accepted';
    source: 'ai' | 'manual';
}

import { 
    WandSparkles,
    Pencil,
    Check,
    X,
    CirclePlus,
    RotateCw,
    Settings
} from 'lucide-react';

interface Step3CompetitorsProps extends StepProps {
    competitors: Competitor[];
    setCompetitors: (competitors: Competitor[]) => void;
    sessionId?: string;
}

export default function Step3Competitors({ 
    data, 
    competitors,
    setCompetitors,
    sessionId
}: Step3CompetitorsProps) {
    return (
        <div className="space-y-6 mt-15">
            <div className="flex items-center justify-between">
                <div className="block">
                    <h3 className="text-xl font-semibold">Suggested Competitors</h3>
                </div>
                <button className='flex py-3 px-6 gap-3 text-sm border rounded-sm fetch-ai-btn'><WandSparkles className='w-[15px]' /> Fetch with AI</button>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                <div className="block">
                    <div className="competitor-box bg-sidebar border">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-[10px]">
                                <span className='w-[20px]'><img src="../images/StackInfluence.png" alt="icon" /></span>
                                <h4>StackInfluence</h4>
                            </div>
                            <button className="edit-btn"><Pencil className="w-[15px]"/></button>
                        </div>
                        <p className='text-gray-400'>27 Mentions</p>
                        <div className="competitor-btn-action">
                            <button className='btn-action-close'><X className="w-[15px]"/></button>
                            <button className='btn-action-check'><Check className="w-[15px]"/></button>
                        </div>
                    </div>
                </div>
                <div className="block">
                    <div className="competitor-box bg-sidebar border">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-[10px]">
                                <span className='w-[20px]'><img src="../images/StackInfluence.png" alt="icon" /></span>
                                <h4>StackInfluence</h4>
                            </div>
                            <button className="edit-btn"><Pencil className="w-[15px]"/></button>
                        </div>
                        <p className='text-gray-400'>27 Mentions</p>
                        <div className="competitor-btn-action">
                            <button className='btn-action-close'><X className="w-[15px]"/></button>
                            <button className='btn-action-check'><Check className="w-[15px]"/></button>
                        </div>
                    </div>
                </div>
                <div className="block">
                    <div className="competitor-box bg-sidebar border">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-[10px]">
                                <span className='w-[20px]'><img src="../images/StackInfluence.png" alt="icon" /></span>
                                <h4>StackInfluence</h4>
                            </div>
                            <button className="edit-btn"><Pencil className="w-[15px]"/></button>
                        </div>
                        <p className='text-gray-400'>27 Mentions</p>
                        <div className="competitor-btn-action">
                            <button className='btn-action-close'><X className="w-[15px]"/></button>
                            <button className='btn-action-check'><Check className="w-[15px]"/></button>
                        </div>
                    </div>
                </div>
                <div className="block">
                    <div className="competitor-box bg-sidebar border">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-[10px]">
                                <span className='w-[20px]'><img src="../images/StackInfluence.png" alt="icon" /></span>
                                <h4>StackInfluence</h4>
                            </div>
                            <button className="edit-btn"><Pencil className="w-[15px]"/></button>
                        </div>
                        <p className='text-gray-400'>27 Mentions</p>
                        <div className="competitor-btn-action">
                            <button className='btn-action-close'><X className="w-[15px]"/></button>
                            <button className='btn-action-check'><Check className="w-[15px]"/></button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="step-wrapp-card mt-[50px]">
                <div className="block mb-5">
                    <h3 className="text-xl font-semibold">Create Competitor</h3>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        value={data.name}
                        placeholder="Brand or competitor Name"
                        required
                        className="form-control"
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="website">Domain</Label>
                    <Input
                        id="website"
                        type="url"
                        value={data.website}
                        placeholder="https://competitor.com"
                        className="form-control"
                    />
                </div>
                
                <div className="grid gap-2">
                    <button className='flex py-4 justify-center gap-3 text-md border rounded-sm w-[200px] font-medium fetch-ai-btn'><CirclePlus className='w-[20px]' /> Add Competitor</button>
                </div>
                
            </div>
            <div className="bg-sidebar flex flex-col gap-6 rounded-xl border p-10 shadow-sm mt-[50px]">
                <div className="block mb-5">
                    <h3 className="text-xl font-semibold">Brand</h3>
                </div>
                <div className="flex items-center gap-[15px] border rounded-sm min-h-[60px] p-5 mb-1 bg-white flex-wrap">
                    <button><RotateCw className='w-4 text-gray-400'/></button>
                    <p className='text-black'>Baros</p>
                    <Badge className='bg-green-100 text-green-600 h-[40px] w-[110px]'> <span className='h-3 w-3 rounded-full bg-green-600'></span> Your Brand</Badge>
                </div>
                <div className="flex items-center gap-[15px] border rounded-sm min-h-[60px] p-5 bg-white flex-wrap">
                    <button><Settings className='w-4 text-gray-400'/></button>
                    <p className='text-black'>Carbon6</p>
                </div>
            </div>
        </div>
    );
}
