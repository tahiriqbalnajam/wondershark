import { type FC } from 'react';

interface FormattedDateProps {
    /** ISO 8601 date string from the backend */
    date: string | null | undefined;
    /** Display format */
    format?: 'date' | 'datetime' | 'time' | 'relative';
    /** Text to show when date is null/empty */
    fallback?: string;
    /** Optional CSS class names */
    className?: string;
}

const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
};

const datetimeOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
};

const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
};

function getRelativeTime(date: Date): string {
    const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);

    if (Math.abs(diffSec) < 60) return 'Just now';
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
    if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');

    // Fall back to date display for older dates
    return date.toLocaleDateString('en-US', dateOptions);
}

const FormattedDate: FC<FormattedDateProps> = ({
    date,
    format = 'date',
    fallback = '—',
    className,
}) => {
    if (!date) return <span className={className}>{fallback}</span>;

    const d = new Date(date);
    if (isNaN(d.getTime())) return <span className={className}>{fallback}</span>;

    let display: string;
    switch (format) {
        case 'datetime':
            display = d.toLocaleDateString('en-US', datetimeOptions);
            break;
        case 'time':
            display = d.toLocaleTimeString('en-US', timeOptions);
            break;
        case 'relative':
            display = getRelativeTime(d);
            break;
        default:
            display = d.toLocaleDateString('en-US', dateOptions);
    }

    return <span className={className} title={d.toISOString()}>{display}</span>;
};

export default FormattedDate;
