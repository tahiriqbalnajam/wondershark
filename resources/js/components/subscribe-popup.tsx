import React, { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { router } from '@inertiajs/react';

interface SubscribePopupProps {
    show: boolean;
    billingUrl: string;
}

const plans = [
    {
        key: 'agency_growth',
        name: 'Growth',
        price: '$299',
        features: [
            { label: 'Brands covered', value: 'Up To 3' },
            { label: 'AI citations tracking', value: 'Unlimited' },
            { label: 'Competitor analysis', value: '5 per brand' },
            { label: 'Posts tracking', value: 'Unlimited' },
            { label: 'Team seats', value: 'Unlimited' },
        ],
    },
    {
        key: 'agency_unlimited',
        name: 'Unlimited',
        price: '$995',
        features: [
            { label: 'Brands covered', value: 'Unlimited' },
            { label: 'AI citations tracking', value: 'Unlimited' },
            { label: 'Competitor analysis', value: '10 per brand' },
            { label: 'Posts tracking', value: 'Unlimited' },
            { label: 'Team seats', value: 'Unlimited' },
        ],
    },
];

const featureIcons: Record<string, JSX.Element> = {
    'Brands covered': (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>
    ),
    'AI citations tracking': (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
    ),
    'Competitor analysis': (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
    ),
    'Posts tracking': (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>
    ),
    'Team seats': (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
};

export default function SubscribePopup({ show, billingUrl }: SubscribePopupProps) {
    const [open, setOpen] = useState(show);
    const [selectedPlan, setSelectedPlan] = useState<string>('agency_growth');

    const handleSubscribe = () => {
        router.visit(billingUrl);
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPortal>
                <DialogOverlay />
                <DialogPrimitive.Content className="bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-2xl shadow-xl duration-200 sm:max-w-[700px] p-8">
                    <h2 className="text-2xl font-bold text-black text-center mb-6">
                        Subscribe to get full access to platform
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        {plans.map((plan) => {
                            const isSelected = selectedPlan === plan.key;
                            return (
                                <div
                                    key={plan.key}
                                    className={`flex-1 border rounded-xl p-5 cursor-pointer transition-all ${
                                        isSelected ? 'border-black ring-1 ring-black' : 'border-gray-200'
                                    }`}
                                    onClick={() => setSelectedPlan(plan.key)}
                                >
                                    <div className="text-sm text-gray-500 mb-1">{plan.name}</div>
                                    <div className="text-2xl font-bold text-black mb-1">
                                        {plan.price} <span className="text-sm font-normal text-gray-500">/per month</span>
                                    </div>
                                    <hr className="my-3 border-gray-200" />
                                    <ul className="space-y-2 text-sm mb-4">
                                        {plan.features.map((f) => (
                                            <li key={f.label} className="flex items-center justify-between gap-2">
                                                <span className="flex items-center gap-2 text-gray-500">
                                                    {featureIcons[f.label]}
                                                    {f.label}
                                                </span>
                                                <span className="font-semibold text-black whitespace-nowrap">{f.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        className="w-full bg-black text-white font-semibold rounded-lg py-2 text-sm hover:bg-gray-900 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan.key); handleSubscribe(); }}
                                    >
                                        Select
                                    </button>
                                    <hr className="my-3 border-gray-200" />
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI MODELS</span>
                                        <span className="text-[10px] font-semibold border border-gray-200 bg-gray-50 text-gray-400 rounded px-1.5 py-0.5">Daily</span>
                                    </div>
                                    <div className="flex gap-1.5 items-center">
                                        <img src="/images/ai-models/openai.svg" alt="OpenAI" className="w-6 h-6 rounded-full bg-white border" />
                                        <img src="/images/ai-models/perplexity.svg" alt="Perplexity" className="w-6 h-6 rounded-full bg-white border" />
                                        <img src="/images/ai-models/google.svg" alt="Google" className="w-6 h-6 rounded-full bg-white border" />
                                        <img src="/images/ai-models/gemini.svg" alt="Gemini" className="w-6 h-6 rounded-full bg-white border" />
                                        <img src="/images/ai-models/copilot.svg" alt="Copilot" className="w-6 h-6 rounded-full bg-white border" />
                                        <img src="/images/ai-models/grok.svg" alt="Grok" className="w-6 h-6 rounded-full bg-white border" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-center">
                        <button
                            className="bg-black text-white font-semibold rounded-full px-16 py-3 text-base hover:bg-gray-900 transition-colors"
                            onClick={handleSubscribe}
                        >
                            Subscribe
                        </button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </DialogPrimitive.Root>
    );
}
