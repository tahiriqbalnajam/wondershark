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
  FileChartColumn,
} from "lucide-react";

// 🟦 Dummy data (can later be passed as props)
const industryRanking = [
  { brand: "Fiverr", logo: "/images/b2.png", position: { rank: 2.5, trend: "up", score: "98%" }, sentiment: { rank: 55, trend: "down", score: "2" }, visibility: { rank: 3.1, trend: "up", score: "98%" } },
  { brand: "Upwork", logo: "/images/b3.png", position: { rank: 3.5, trend: "down", score: "98%" }, sentiment: { rank: 60, trend: "down", score: "3" }, visibility: { rank: 3.1, trend: "up", score: "98%" } },
  { brand: "Influencity", logo: "/images/b6.png", position: { rank: 1.5, trend: "down", score: "98%" }, sentiment: { rank: 65, trend: "down", score: "4" }, visibility: { rank: 3.1, trend: "up", score: "98%" } },
  { brand: "Amazon Creator Connections", logo: "/images/b5.png", position: { rank: 3.1, trend: "up", score: "98%" }, sentiment: { rank: 70, trend: "down", score: "3" }, visibility: { rank: 3.1, trend: "up", score: "98%" } },
  { brand: "FameBit", logo: "/images/b7.png", position: { rank: 1.1, trend: "up", score: "98%" }, sentiment: { rank: 75, trend: "down", score: "4" }, visibility: { rank: 3.1, trend: "up", score: "98%" } },
];

export function BrandVisibilityIndex() {
    return (
        <CardContent>
            <div className="min-h-80">
                <Table className="text-sm w-full border border-gray-200">
                    <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-200">
                            <TableHead className="w-12 border-r border-gray-200 text-center">#</TableHead>
                            <TableHead className="border-r border-gray-200">Brand</TableHead>
                            <TableHead className="border-r border-gray-200">
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
                            <TableHead className="whitespace-nowrap border-gray-200">
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
                                    The average position of the brand when mentioned in the
                                    last 30 days
                                </p>
                                </TooltipContent>
                            </Tooltip>
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {industryRanking.map((item, index) => (
                            <TableRow key={item.brand}>
                                <TableCell className="font-medium border-r border-gray-200 text-center">
                                    {index + 1}
                                </TableCell>
                                <TableCell className="font-medium flex items-center gap-2 border-r border-gray-200">
                                    {item.logo && (
                                    <img
                                        src={item.logo}
                                        alt={item.brand}
                                        className="w-6 h-6 rounded object-contain"
                                    />
                                    )}
                                    {item.brand}
                                </TableCell>
                                <TableCell className="border-r border-gray-200">
                                    <div className="flex items-center gap-1 justify-between">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            {item.position.trend === "up" && (
                                                <ArrowUpRight className="h-4 w-4 text-green-600" />
                                            )}
                                            {item.position.trend === "down" && (
                                                <ArrowDownRight className="h-4 w-4 text-red-600" />
                                            )}
                                            {item.position.rank}
                                        </span>
                                        <span className="text-xs">{item.position.score}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="border-r border-gray-200">
                                    <div className="flex items-center gap-1 justify-between">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            {item.sentiment.trend === "up" && (
                                                <ArrowUpRight className="h-4 w-4 text-green-600" />
                                            )}
                                            {item.sentiment.trend === "down" && (
                                                <ArrowDownRight className="h-4 w-4 text-red-600" />
                                            )}
                                            {item.sentiment.rank}
                                        </span>
                                        <span className="text-xs">{item.sentiment.score}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="border-r border-gray-200">
                                    <div className="flex items-center gap-1 justify-between">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            {item.visibility.trend === "up" && (
                                                <ArrowUpRight className="h-4 w-4 text-green-600" />
                                            )}
                                            {item.visibility.trend === "down" && (
                                                <ArrowDownRight className="h-4 w-4 text-red-600" />
                                            )}
                                            {item.visibility.rank}
                                        </span>
                                        <span className="text-xs">{item.visibility.score}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    );
}
