import { CardContent } from "@/components/ui/card";
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
}

export function BrandVisibilityIndex({ competitiveStats, onRowClick }: BrandVisibilityIndexProps) {
    // Sort by position (lower is better)
    const sortedStats = [...competitiveStats].sort((a, b) => a.position - b.position);

    return (
        <CardContent>
            <div className="min-h-80">
                <Table className="text-sm w-full border border-gray-200">
                    <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-200">
                            <TableHead className="w-12 border-r border-gray-200 text-center">#</TableHead>
                            <TableHead className="border-r border-gray-200">Brand</TableHead>
                            <TableHead className="whitespace-nowrap border-r border-gray-200">
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
                            <TableHead className="border-r border-gray-200">
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
                            <TableHead className="border-gray-200">
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
                        {sortedStats.map((stat, index) => {
                            // Clean domain for display - remove protocol and www
                            const cleanDomain = stat.entity_url
                                .replace(/^https?:\/\//, '')
                                .replace(/^www\./, '');
                            const logoUrl = `https://img.logo.dev/${cleanDomain}?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`;
                            
                            return (
                                <TableRow 
                                    key={stat.id}
                                    onClick={() => onRowClick?.(cleanDomain)}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                >
                                    <TableCell className="font-medium border-r border-gray-200 text-center">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="font-medium border-r border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={logoUrl}
                                                alt={stat.entity_name}
                                                className="w-6 h-6 rounded object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`;
                                                }}
                                            />
                                            {stat.entity_name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200">
                                        <div className="flex items-center gap-1 justify-between">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                {stat.trends.visibility_trend === "up" && (
                                                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                                                )}
                                                {stat.trends.visibility_trend === "down" && (
                                                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                                                )}
                                                {stat.trends.visibility_change !== 0 && stat.trends.visibility_trend !== 'stable' && stat.trends.visibility_trend !== 'new' && (
                                                    <span>{Math.abs(stat.trends.visibility_change)}%</span>
                                                )}
                                            </span>
                                            <span className="text-xs">{stat.visibility_percentage || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200">
                                        <div className="flex items-center gap-1 justify-between">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                {stat.trends.sentiment_trend === "up" && (
                                                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                                                )}
                                                {stat.trends.sentiment_trend === "down" && (
                                                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                                                )}
                                                {stat.trends.sentiment_change !== 0 && stat.trends.sentiment_trend !== 'stable' && stat.trends.sentiment_trend !== 'new' && (
                                                    <span>{Math.abs(stat.trends.sentiment_change)}%</span>
                                                )}
                                            </span>
                                            <span className="text-xs">{stat.sentiment != null ? stat.sentiment : 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200">
                                        <div className="flex items-center gap-1 justify-between">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                {stat.trends.position_trend === "up" && (
                                                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                                                )}
                                                {stat.trends.position_trend === "down" && (
                                                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                                                )}
                                                {stat.trends.position_change !== 0 && stat.trends.position_trend !== 'stable' && stat.trends.position_trend !== 'new' && (
                                                    <span>{Math.abs(stat.trends.position_change)}%</span>
                                                )}
                                            </span>
                                            <span className="text-xs">{stat.position_formatted || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    );
}
