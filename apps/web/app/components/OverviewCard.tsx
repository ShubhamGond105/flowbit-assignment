// apps/web/components/OverviewCard.tsx
import { TrendingUp } from "lucide-react";

interface OverviewCardProps {
  title: string;
  subtitle?: string;
  value?: number | string;
  trendText?: string;
  trendUp?: boolean;
}

export default function OverviewCard({
  title,
  subtitle,
  value,
  trendText = "+8.2% from last month",
  trendUp = true,
}: OverviewCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-100">
      <p className="text-xs text-gray-500 mb-2">{title}</p>
      {subtitle && <p className="text-gray-400 text-xs mb-2">{subtitle}</p>}
      <p className="text-2xl font-bold mb-2">
        {typeof value === "number"
          ? value.toLocaleString("en-US", { style: "currency", currency: "EUR" })
          : value ?? "-"}
      </p>
      <div
        className={`flex items-center gap-1 text-sm ${
          trendUp ? "text-green-600" : "text-red-600"
        }`}
      >
        <TrendingUp className="w-4 h-4" />
        <span>{trendText}</span>
      </div>
    </div>
  );
}
