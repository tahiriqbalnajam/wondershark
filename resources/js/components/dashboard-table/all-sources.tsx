import { CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
interface SourceData {
    id: number;
    source: string;
    used: string;
    icon?: string;
}
const data: SourceData[] = [
    { id: 1, source: "www.chatgpt.com", used: "37%", icon: "/images/b1.png" },
    { id: 2, source: "www.chatgpt.com", used: "37%", icon: "/images/b1.png" },
    { id: 3, source: "www.chatgpt.com", used: "37%", icon: "/images/b1.png" },
    { id: 4, source: "www.chatgpt.com", used: "37%", icon: "/images/b1.png" },
    { id: 5, source: "www.chatgpt.com", used: "37%", icon: "/images/b1.png" },
    { id: 6, source: "www.chatgpt.com", used: "37%", icon: "/images/b1.png" },
];
export function SourceUsageTable() {
    return (
        <CardContent>
            <div className="min-h-90">
                <Table className="text-sm w-full border border-gray-200">
                    <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-200">
                            <TableHead className="w-12 border-r border-gray-200 text-center">#</TableHead>
                            <TableHead className="border-r border-gray-200">Source</TableHead>
                            <TableHead className="border-r border-gray-200 text-center">Used</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.id} className="border-b last:border-0">
                                <TableCell className="border-r border-gray-200 text-center">{item.id}</TableCell>
                                <TableCell className="border-r border-gray-200">
                                    <div className="flex items-center gap-1">
                                        <img
                                            src={item.icon}
                                            alt=""
                                            className="h-4 w-4 rounded-full"
                                        />
                                        <span className="text-muted-foreground">
                                            {item.source}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="border-r border-gray-200 text-center">
                                    {item.used}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    );
}
