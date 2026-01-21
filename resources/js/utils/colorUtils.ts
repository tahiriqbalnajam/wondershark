export const COLORS = {
    gray: { name: 'Gray', bg: 'bg-gray-100', border: 'border-gray-300', dot: 'bg-gray-400', hex: '#9CA3AF' },
    red: { name: 'Red', bg: 'bg-red-100', border: 'border-red-300', dot: 'bg-red-500', hex: '#EF4444' },
    orange: { name: 'Orange', bg: 'bg-orange-100', border: 'border-orange-300', dot: 'bg-orange-500', hex: '#F97316' },
    yellow: { name: 'Yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', dot: 'bg-yellow-500', hex: '#EAB308' },
    green: { name: 'Green', bg: 'bg-green-100', border: 'border-green-300', dot: 'bg-green-500', hex: '#22C55E' },
    blue: { name: 'Blue', bg: 'bg-blue-100', border: 'border-blue-300', dot: 'bg-blue-500', hex: '#3B82F6' },
    purple: { name: 'Purple', bg: 'bg-purple-100', border: 'border-purple-300', dot: 'bg-purple-500', hex: '#A855F7' },
};

export type ColorKey = keyof typeof COLORS;

export function getColorClasses(color: string | null | undefined): { bg: string; border: string; dot: string; hex: string } {
    const colorKey = (color || 'gray') as ColorKey;
    return COLORS[colorKey] || COLORS.gray;
}
