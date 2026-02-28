import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type PeriodFilter = "all" | "today" | "week" | "month" | "custom";
export type TypeFilter = "all" | "vendor" | "driver";

interface PaymentFiltersProps {
  typeFilter: TypeFilter;
  onTypeFilterChange: (value: TypeFilter) => void;
  periodFilter: PeriodFilter;
  onPeriodFilterChange: (value: PeriodFilter) => void;
  customFrom?: Date;
  customTo?: Date;
  onCustomFromChange: (date?: Date) => void;
  onCustomToChange: (date?: Date) => void;
  onExportCSV: () => void;
  onExportExcel?: () => void;
  showTypeFilter?: boolean;
}

export function PaymentFilters({
  typeFilter,
  onTypeFilterChange,
  periodFilter,
  onPeriodFilterChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onExportCSV,
  onExportExcel,
  showTypeFilter = true,
}: PaymentFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showTypeFilter && (
        <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as TypeFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="vendor">Vendeurs</SelectItem>
            <SelectItem value="driver">Livreurs</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Select value={periodFilter} onValueChange={(v) => onPeriodFilterChange(v as PeriodFilter)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toute période</SelectItem>
          <SelectItem value="today">Aujourd'hui</SelectItem>
          <SelectItem value="week">Cette semaine</SelectItem>
          <SelectItem value="month">Ce mois</SelectItem>
          <SelectItem value="custom">Personnalisé</SelectItem>
        </SelectContent>
      </Select>

      {periodFilter === "custom" && (
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {customFrom ? format(customFrom, "dd/MM/yyyy") : "Début"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customFrom} onSelect={onCustomFromChange} className="p-3 pointer-events-auto" locale={fr} />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {customTo ? format(customTo, "dd/MM/yyyy") : "Fin"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customTo} onSelect={onCustomToChange} className="p-3 pointer-events-auto" locale={fr} />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="outline" size="sm" onClick={onExportCSV}>
          <Download className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">CSV</span>
        </Button>
        {onExportExcel && (
          <Button variant="outline" size="sm" onClick={onExportExcel}>
            <Download className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
        )}
      </div>
    </div>
  );
}
