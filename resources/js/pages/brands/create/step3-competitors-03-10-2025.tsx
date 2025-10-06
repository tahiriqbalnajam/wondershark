import React from 'react';
import CompetitorSelector from '@/components/competitor-selector';
import { StepProps } from './types';

interface Competitor {
    id: number;
    name: string;
    domain: string;
    mentions: number;
    status: 'suggested' | 'accepted';
    source: 'ai' | 'manual';
}

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
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">Competitor Analysis</h3>
                <p className="text-muted-foreground">
                    Identify your main competitors to better understand your market position. 
                    You can use AI to automatically find competitors or add them manually.
                </p>
            </div>

            <CompetitorSelector
                competitors={competitors}
                setCompetitors={setCompetitors}
                brandData={{
                    website: data.website,
                    name: data.name,
                    description: data.description
                }}
                sessionId={sessionId}
                showTitle={false}
            />

            {/* Help text */}
            <div className="text-sm text-muted-foreground">
                <p>
                    <strong>Tip:</strong> Having competitor data helps improve your content strategy and market positioning. 
                    You can always skip this step and add competitors later.
                </p>
            </div>
        </div>
    );
}
