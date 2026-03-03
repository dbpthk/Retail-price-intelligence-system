"use client";

import { useTheme } from "next-themes";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PriceHistoryPoint = {
  date: string;
  price: number;
  label: string;
};

type PriceHistoryChartProps = {
  data: PriceHistoryPoint[];
  productTitle: string;
};

export function PriceHistoryChart({ data, productTitle }: PriceHistoryChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridStroke = isDark ? "#374151" : "#e4e4e7";
  const tickFill = isDark ? "#9CA3AF" : "#71717a";
  const lineStroke = "#1D4ED8";
  const tooltipBg = isDark ? "#111827" : "#fff";
  const tooltipBorder = isDark ? "#374151" : "#e4e4e7";

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-[#6B7280] dark:border-gray-700 dark:bg-gray-800 dark:text-[#9CA3AF]">
        No price history yet
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="mb-4 text-sm font-medium text-[#111827] dark:text-[#E5E7EB]">
        Price history: {productTitle}
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridStroke}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: tickFill }}
              tickLine={false}
              axisLine={{ stroke: gridStroke }}
            />
            <YAxis
              dataKey="price"
              tick={{ fontSize: 11, fill: tickFill }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                typeof value === "number" ? value.toFixed(2) : value
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: "6px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
              labelStyle={{ color: isDark ? "#E5E7EB" : "#52525b", fontWeight: 500 }}
              formatter={(value: number | undefined) =>
                value != null ? [value.toFixed(2), "Price"] : ["—", "Price"]
              }
              labelFormatter={(label) => label}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={lineStroke}
              strokeWidth={2}
              dot={{ fill: lineStroke, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: lineStroke, stroke: isDark ? "#111827" : "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
