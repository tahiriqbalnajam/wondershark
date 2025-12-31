import { CardContent } from "@/components/ui/card";
import { Link } from "@inertiajs/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { CHART_COLORS } from "@/components/chart/visibility";

interface CompetitiveStat {
    id: number;
    entity_type: 'brand' | 'competitor';
    entity_name: string;
    entity_url: string;
    visibility: number;
    sentiment: number;
    position: number;
    analyzed_at: string;
    trends: {
        visibility_trend: 'up' | 'down' | 'stable' | 'new';
        sentiment_trend: 'up' | 'down' | 'stable' | 'new';
        position_trend: 'up' | 'down' | 'stable' | 'new';
        visibility_change: number;
        sentiment_change: number;
        position_change: number;
    };
    visibility_percentage: string;
    position_formatted: string;
    sentiment_level: string;
}

interface BrandVisibilityIndexProps {
    competitiveStats: CompetitiveStat[];
    onRowClick?: (domain: string) => void;
    brandId?: number;
    limit?: number;
    hoveredDomain?: string | null;
    onDomainHover?: (domain: string | null) => void;
    entities?: Array<{ name: string; domain: string }>;
}

export function BrandVisibilityIndex({ competitiveStats, onRowClick, brandId, limit, hoveredDomain, onDomainHover, entities }: BrandVisibilityIndexProps) {
    // Sort by position (lower is better)
    const sortedStats = [...competitiveStats].sort((a, b) => a.position - b.position);
    
    // Apply limit if specified
    const displayStats = limit ? sortedStats.slice(0, limit) : sortedStats;
    const hasMore = limit && sortedStats.length > limit;

    // Helper function to get the color for a domain based on its index in entities array (same as chart)
    const getColorForDomain = (domain: string) => {
        if (!entities) return '#666';
        const index = entities.findIndex(entity => entity.domain === domain);
        return index !== -1 ? CHART_COLORS[index % CHART_COLORS.length] : '#666';
    };

    return (
        <CardContent>
            <div className="min-h-80 overflow-x-auto">
                <Table className="text-sm w-full border border-gray-200 default-table table-fixed min-w-[600px]">
                    <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-200">
                            <TableHead className="w-12 border-r border-gray-200 text-center">#</TableHead>
                            <TableHead className="w-48 border-r border-gray-200">Brand</TableHead>
                            <TableHead className="w-32 border-r border-gray-200">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="p-0 border-0 text-sm shadow-none bg-transparent hover:border-0"
                                >
                                    Visibility <Info className="h-3 w-3 inline-block" />
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent className="w-50">
                                <p className="text-xs text-center">
                                    Percentage of chats mentioning the brand in the last 30 days
                                </p>
                                </TooltipContent>
                            </Tooltip>
                            </TableHead>
                            <TableHead className="w-28 border-r border-gray-200">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="p-0 border-0 text-sm shadow-none bg-transparent hover:border-0"
                                >
                                    Sentiment <Info className="h-3 w-3 inline-block" />
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent className="w-50">
                                <p className="text-xs text-center">
                                    The average sentiment score of the brand when mentioned in
                                    the last 30 days
                                </p>
                                </TooltipContent>
                            </Tooltip>
                            </TableHead>
                            <TableHead className="w-28">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="p-0 border-0 text-sm shadow-none bg-transparent hover:border-0"
                                >
                                    Position <Info className="h-3 w-3 inline-block" />
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent className="w-50">
                                <p className="text-xs text-center">
                                    The average position of the brand when mentioned in the
                                    last 30 days
                                </p>
                                </TooltipContent>
                            </Tooltip>
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {displayStats.map((stat, index) => {
                            // Clean domain for display - remove protocol and www
                            const cleanDomain = stat.entity_url
                                .replace(/^https?:\/\//, '')
                                .replace(/^www\./, '');
                            const logoUrl = `https://img.logo.dev/${cleanDomain}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`;
                            
                            return (
                                <TableRow 
                                    key={stat.id}
                                    onClick={() => onRowClick?.(cleanDomain)}
                                    onMouseEnter={() => onDomainHover?.(cleanDomain)}
                                    onMouseLeave={() => onDomainHover?.(null)}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                >
                                    <TableCell className="font-medium border-r border-gray-200 text-center">
                                        <div className="flex items-center justify-center">
                                            {hoveredDomain === cleanDomain ? (
                                                <div 
                                                    className="w-3 h-3 rounded-full" 
                                                    style={{ backgroundColor: getColorForDomain(cleanDomain) }}
                                                />
                                            ) : (
                                                <span>{index + 1}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium border-r border-gray-200 w-48">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <img
                                                src={logoUrl}
                                                alt={stat.entity_name}
                                                className="w-6 h-6 rounded object-contain flex-shrink-0"
                                                onError={(e) => {
                                                    e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`;
                                                }}
                                            />
                                            <span className="truncate text-sm">{stat.entity_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200 w-32">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                                                {stat.trends.visibility_trend === "up" && (
                                                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                                                )}
                                                {stat.trends.visibility_trend === "down" && (
                                                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                                                )}
                                                {stat.trends.visibility_change !== 0 && stat.trends.visibility_trend !== 'stable' && stat.trends.visibility_trend !== 'new' && (
                                                    <span className="whitespace-nowrap">{Math.abs(stat.trends.visibility_change)}%</span>
                                                )}
                                            </span>
                                            <span className="text-xs font-bold flex-shrink-0">{stat.visibility != null ? `${Math.round(stat.visibility)}%` : 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200 w-28">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                                                {stat.trends.sentiment_trend === "up" && (
                                                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                                                )}
                                                {stat.trends.sentiment_trend === "down" && (
                                                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                                                )}
                                                {stat.trends.sentiment_change !== 0 && stat.trends.sentiment_trend !== 'stable' && stat.trends.sentiment_trend !== 'new' && (
                                                    <span className="whitespace-nowrap">{Math.abs(stat.trends.sentiment_change)}%</span>
                                                )}
                                            </span>
                                            <span className="text-xs font-bold flex-shrink-0">{stat.sentiment != null ? stat.sentiment : 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200 w-28">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                                                {stat.trends.position_trend === "up" && (
                                                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                                                )}
                                                {stat.trends.position_trend === "down" && (
                                                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                                                )}
                                                {stat.trends.position_change !== 0 && stat.trends.position_trend !== 'stable' && stat.trends.position_trend !== 'new' && (
                                                    <span className="whitespace-nowrap">{Math.abs(stat.trends.position_change)}%</span>
                                                )}
                                            </span>
                                            <span className="text-xs font-bold flex-shrink-0">{stat.position_formatted || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                
                {hasMore && brandId && (
                    <div className="flex justify-end mt-4 px-4">
                        <Link href={`/brands/${brandId}/ranking`}>
                            <Button variant="outline" size="sm">
                                Show All
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </CardContent>
    );
}
