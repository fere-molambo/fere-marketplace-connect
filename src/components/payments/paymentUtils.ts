import { startOfDay, startOfWeek, startOfMonth, isAfter, isBefore, endOfDay } from "date-fns";
import * as XLSX from "xlsx";
import type { PeriodFilter, TypeFilter } from "./PaymentFilters";

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
};

export function filterByPeriod<T extends { created_at?: string | null; processed_at?: string | null }>(
  items: T[],
  period: PeriodFilter,
  customFrom?: Date,
  customTo?: Date,
  dateField: "created_at" | "processed_at" = "created_at"
): T[] {
  if (period === "all") return items;

  const now = new Date();
  let start: Date;
  let end: Date = endOfDay(now);

  switch (period) {
    case "today":
      start = startOfDay(now);
      break;
    case "week":
      start = startOfWeek(now, { weekStartsOn: 1 });
      break;
    case "month":
      start = startOfMonth(now);
      break;
    case "custom":
      start = customFrom ? startOfDay(customFrom) : new Date(0);
      end = customTo ? endOfDay(customTo) : endOfDay(now);
      break;
    default:
      return items;
  }

  return items.filter((item) => {
    const dateStr = item[dateField];
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isBefore(d, start) && !isAfter(d, end);
  });
}

export function filterByType<T extends { recipient_type?: string }>(
  items: T[],
  typeFilter: TypeFilter
): T[] {
  if (typeFilter === "all") return items;
  return items.filter((item) => item.recipient_type === typeFilter);
}

export function exportToCSV(rows: Record<string, string>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const bom = "\uFEFF";
  const csv = bom + [
    headers.join(";"),
    ...rows.map((row) => headers.map((h) => `"${(row[h] || "").replace(/"/g, '""')}"`).join(";")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToExcel(rows: Record<string, string | number>[], filename: string) {
  if (rows.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Données");
  XLSX.writeFile(workbook, filename);
}
