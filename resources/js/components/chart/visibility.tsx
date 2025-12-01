import { CardContent } from '@/components/ui/card';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface VisibilityChartProps {
    data?: Array<Record<string, string | number>>;
    entities?: Array<{ name: string; domain: string }>;
    granularity?: 'month' | 'day';
}

const CHART_COLORS = [
    '#00c851', // Green
    '#0099cc', // Blue
    '#ff6900', // Orange
    '#ff4444', // Red
    '#ffbb33', // Yellow
    '#9933CC', // Purple
    '#00C851', // Teal
    '#ff8800', // Dark Orange
    '#007E33', // Dark Green
    '#CC0000', // Dark Red
];

export function VisibilityChart({ data, entities, granularity = 'month' }: VisibilityChartProps) {
    // Use provided data or show empty state
    const visibilityData = data && data.length > 0 ? data : [];
    const chartEntities = entities && entities.length > 0 ? entities : [];

    // Create a map from domain to entity name for tooltip
    const domainToNameMap = new Map(
        chartEntities.map(entity => [entity.domain, entity.name])
    );

    // Calculate dynamic Y-axis domain based on actual data values
    let yAxisDomain: [number, number] = [0, 100];
    
    if (visibilityData.length > 0 && chartEntities.length > 0) {
        const allValues: number[] = [];
        
        visibilityData.forEach(dataPoint => {
            chartEntities.forEach(entity => {
                const value = dataPoint[entity.domain];
                if (typeof value === 'number' && !isNaN(value)) {
                    allValues.push(value);
                }
            });
        });
        
        if (allValues.length > 0) {
            const minValue = Math.min(...allValues);
            const maxValue = Math.max(...allValues);
            const range = maxValue - minValue;
            
            // Add 10% padding, minimum 5 units
            const padding = Math.max(5, range * 0.1);
            
            yAxisDomain = [
                Math.max(0, Math.floor(minValue - padding)),
                Math.min(100, Math.ceil(maxValue + padding))
            ];
        }
    }

    return (
        <CardContent>
            <div className="h-80">
                {visibilityData.length > 0 && chartEntities.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={visibilityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12 }}
                                angle={visibilityData.length > 12 ? -45 : 0}
                                textAnchor={visibilityData.length > 12 ? 'end' : 'middle'}
                                height={visibilityData.length > 12 ? 80 : 30}
                            />
                            <YAxis 
                                label={{ value: 'Visibility %', angle: -90, position: 'insideLeft' }}
                                tick={{ fontSize: 12 }}
                                domain={['dataMin - 5', 'dataMax + 5']}
                                tickFormatter={(value) => `${Math.round(Number(value))}%`}
                            />
                            <RechartsTooltip 
                                formatter={(value: any, name: any) => {
                                    const displayName = domainToNameMap.get(name) || name;
                                    const displayValue = isNaN(Number(value)) ? value : `${Math.round(Number(value))}%`;
                                    return [displayValue, displayName];
                                }}
                                contentStyle={{ 
                                    backgroundColor: 'white', 
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    zIndex: '1000000',
                                    opacity: 1,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                } as React.CSSProperties}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            {chartEntities.map((entity, index) => (
                                <Line
                                    key={entity.domain}
                                    type="monotone"
                                    dataKey={entity.domain}
                                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                                    strokeWidth={2}
                                    name={entity.name}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <p className="text-center mb-2">No visibility data available yet.</p>
                        <p className="text-sm text-center">Run competitive analysis to see brand visibility metrics.</p>
                    </div>
                )}
            </div>
        </CardContent>
    );
}
