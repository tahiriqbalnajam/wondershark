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
    // Default data if none provided
    const defaultData = [
        { date: 'Jan', fiverr: 45, upwork: 38, influencity: 25, famebit: 15, amazon: 30 },
        { date: 'Feb', fiverr: 52, upwork: 42, influencity: 28, famebit: 18, amazon: 35 },
        { date: 'Mar', fiverr: 48, upwork: 45, influencity: 32, famebit: 22, amazon: 38 },
        { date: 'Apr', fiverr: 55, upwork: 40, influencity: 35, famebit: 25, amazon: 42 },
        { date: 'May', fiverr: 58, upwork: 47, influencity: 38, famebit: 28, amazon: 45 },
        { date: 'Jun', fiverr: 62, upwork: 50, influencity: 42, famebit: 30, amazon: 48 },
    ];

    const defaultEntities = [
        { name: 'Fiverr', domain: 'fiverr' },
        { name: 'Upwork', domain: 'upwork' },
        { name: 'Influencity', domain: 'influencity' },
        { name: 'FameBit', domain: 'famebit' },
        { name: 'Amazon', domain: 'amazon' },
    ];

    const visibilityData = data && data.length > 0 ? data : defaultData;
    const chartEntities = entities && entities.length > 0 ? entities : defaultEntities;

    return (
        <CardContent>
            <div className="h-80">
                {visibilityData.length > 0 ? (
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
                                label={{ value: 'Mentions', angle: -90, position: 'insideLeft' }}
                                tick={{ fontSize: 12 }}
                            />
                            <RechartsTooltip />
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
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>No visibility data available yet.</p>
                    </div>
                )}
            </div>
        </CardContent>
    );
}
