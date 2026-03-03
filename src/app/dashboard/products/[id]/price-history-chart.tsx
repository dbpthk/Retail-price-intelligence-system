"use client";

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
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
        No price history yet
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="mb-4 text-sm font-medium text-gray-700">
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
              stroke="#e4e4e7"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#71717a" }}
              tickLine={false}
              axisLine={{ stroke: "#e4e4e7" }}
            />
            <YAxis
              dataKey="price"
              tick={{ fontSize: 11, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                typeof value === "number" ? value.toFixed(2) : value
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e4e4e7",
                borderRadius: "6px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
              labelStyle={{ color: "#52525b", fontWeight: 500 }}
              formatter={(value: number | undefined) =>
                value != null ? [value.toFixed(2), "Price"] : ["—", "Price"]
              }
              labelFormatter={(label) => label}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ fill: "#2563eb", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
