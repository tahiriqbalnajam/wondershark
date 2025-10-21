import * as React from "react";
import { PieChart, Pie, Label, Tooltip, ResponsiveContainer } from "recharts";
import { CardContent } from "@/components/ui/card";
const chartData = [
  { browser: "Competitor", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "UGC", visitors: 200, fill: "var(--color-safari)" },
  { browser: "Corporate", visitors: 287, fill: "var(--color-firefox)" },
  { browser: "Corporate", visitors: 173, fill: "var(--color-edge)" },
//   { browser: "other", visitors: 190, fill: "var(--color-other)" },
];

export function ChartPieData() {
	const totalVisitors = React.useMemo(
		() => chartData.reduce((acc, curr) => acc + curr.visitors, 0),
		[]
	);
	return (
		<CardContent>
			<div className="h-80">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie data={chartData} dataKey="visitors" nameKey="browser" innerRadius={75} outerRadius={100} strokeWidth={2}>
							<Label
								content={({ viewBox }) => {
									const vb = viewBox as { cx?: number; cy?: number };
									if (!vb || typeof vb.cx !== "number" || typeof vb.cy !== "number")
									return null;

									return (
									<text
										x={vb.cx}
										y={vb.cy}
										textAnchor="middle"
										dominantBaseline="middle"
									>
										<tspan
										x={vb.cx}
										y={vb.cy}
										className="fill-foreground text-3xl font-bold"
										>
										{totalVisitors.toLocaleString()}
										</tspan>
										<tspan
										x={vb.cx}
										y={vb.cy + 24}
										className="fill-muted-foreground"
										>
										Sources
										</tspan>
									</text>
									);
								}}
							/>
						</Pie>
					<Tooltip />
					</PieChart>
				</ResponsiveContainer>
			</div>
			<div className="flex justify-center gap-6 mt-6 flex-wrap">
				{chartData.map((item) => (
					<div key={item.browser} className="flex items-center space-x-2">
					<span
						className="w-3 h-3 rounded-full"
						style={{ backgroundColor: item.fill }}
					/>
					<span className="text-sm font-medium capitalize text-muted-foreground">
						{item.browser}
					</span>
					</div>
				))}
			</div>
		</CardContent>
	);
}
