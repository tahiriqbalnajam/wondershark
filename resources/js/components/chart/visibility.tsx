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

export function VisibilityChart() {
    const visibilityData = [
        { date: 'Jan', fiverr: 45, upwork: 38, influencity: 25, famebit: 15, amazon: 30 },
        { date: 'Feb', fiverr: 52, upwork: 42, influencity: 28, famebit: 18, amazon: 35 },
        { date: 'Mar', fiverr: 48, upwork: 45, influencity: 32, famebit: 22, amazon: 38 },
        { date: 'Apr', fiverr: 55, upwork: 40, influencity: 35, famebit: 25, amazon: 42 },
        { date: 'May', fiverr: 58, upwork: 47, influencity: 38, famebit: 28, amazon: 45 },
        { date: 'Jun', fiverr: 62, upwork: 50, influencity: 42, famebit: 30, amazon: 48 },
    ];
    return (
        <CardContent>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visibilityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="fiverr" stroke="#00c851" strokeWidth={2} name="Fiverr" />
                        <Line type="monotone" dataKey="upwork" stroke="#0099cc" strokeWidth={2} name="Upwork" />
                        <Line type="monotone" dataKey="influencity" stroke="#ff6900" strokeWidth={2} name="Influencity" />
                        <Line type="monotone" dataKey="famebit" stroke="#ff4444" strokeWidth={2} name="FameBit" />
                        <Line type="monotone" dataKey="amazon" stroke="#ffbb33" strokeWidth={2} name="Amazon Creator Connections" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
    );
}
