import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Link } from '@inertiajs/react';

export function TrialCountdownBadge() {
    const { trial } = usePage().props as any;
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

    useEffect(() => {
        if (!trial?.is_on_trial || !trial?.trial_ends_at) return;

        const compute = () => {
            const diff = new Date(trial.trial_ends_at).getTime() - Date.now();
            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft({ days, hours, minutes, seconds });
        };

        compute();
        const interval = setInterval(compute, 1000);
        return () => clearInterval(interval);
    }, [trial?.trial_ends_at]);

    if (!trial?.is_on_trial || !timeLeft) return null;

    const isUrgent = trial.trial_days_left <= 4;

    return (
        <Link href="/billing" className="no-underline">
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer
                ${isUrgent
                    ? 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100'
                    : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                }`}
            >
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Trial:</span>
                <span className="font-mono tabular-nums">
                    {timeLeft.days > 0 && <span>{timeLeft.days}d </span>}
                    <span>{String(timeLeft.hours).padStart(2, '0')}h </span>
                    <span>{String(timeLeft.minutes).padStart(2, '0')}m </span>
                    <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
                </span>
                {isUrgent && (
                    <span className="hidden sm:inline font-semibold text-orange-600">
                        — {trial.trial_discount}% off!
                    </span>
                )}
            </div>
        </Link>
    );
}
