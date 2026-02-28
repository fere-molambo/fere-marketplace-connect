import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subDays, subMonths, startOfDay } from "date-fns";

export type PeriodKey = "7d" | "30d" | "90d" | "12m";

interface PeriodSelectorProps {
  value: PeriodKey;
  onChange: (value: PeriodKey) => void;
}

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "90d", label: "3 derniers mois" },
  { value: "12m", label: "12 derniers mois" },
];

export function getDateRange(period: PeriodKey): { startDate: Date; endDate: Date } {
  const endDate = startOfDay(new Date());
  let startDate: Date;
  switch (period) {
    case "7d": startDate = subDays(endDate, 7); break;
    case "30d": startDate = subDays(endDate, 30); break;
    case "90d": startDate = subMonths(endDate, 3); break;
    case "12m": startDate = subMonths(endDate, 12); break;
  }
  return { startDate, endDate };
}

export const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodKey)}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIOD_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
