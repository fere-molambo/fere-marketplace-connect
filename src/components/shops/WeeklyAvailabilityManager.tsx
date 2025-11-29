import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

export interface TimeSlot {
  start: string;
  end: string;
}

export interface WeeklyAvailability {
  lundi: TimeSlot[];
  mardi: TimeSlot[];
  mercredi: TimeSlot[];
  jeudi: TimeSlot[];
  vendredi: TimeSlot[];
  samedi: TimeSlot[];
  dimanche: TimeSlot[];
}

interface WeeklyAvailabilityManagerProps {
  value: WeeklyAvailability;
  onChange: (availability: WeeklyAvailability) => void;
}

const DAYS = [
  { key: "lundi" as const, label: "Lundi" },
  { key: "mardi" as const, label: "Mardi" },
  { key: "mercredi" as const, label: "Mercredi" },
  { key: "jeudi" as const, label: "Jeudi" },
  { key: "vendredi" as const, label: "Vendredi" },
  { key: "samedi" as const, label: "Samedi" },
  { key: "dimanche" as const, label: "Dimanche" },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return [`${hour}:00`, `${hour}:30`];
}).flat();

export const WeeklyAvailabilityManager = ({ value, onChange }: WeeklyAvailabilityManagerProps) => {
  const isDayActive = (dayKey: keyof WeeklyAvailability) => 
    Array.isArray(value[dayKey]) && value[dayKey].length > 0;

  const toggleDay = (dayKey: keyof WeeklyAvailability) => {
    if (isDayActive(dayKey)) {
      onChange({ ...value, [dayKey]: [] });
    } else {
      onChange({ ...value, [dayKey]: [{ start: "08:00", end: "17:00" }] });
    }
  };

  const addTimeSlot = (dayKey: keyof WeeklyAvailability) => {
    const slots = [...value[dayKey]];
    const lastSlot = slots[slots.length - 1];
    const newStart = lastSlot ? lastSlot.end : "08:00";
    const newEnd = "17:00";
    
    slots.push({ start: newStart, end: newEnd });
    onChange({ ...value, [dayKey]: slots });
  };

  const removeTimeSlot = (dayKey: keyof WeeklyAvailability, index: number) => {
    const slots = [...value[dayKey]];
    slots.splice(index, 1);
    onChange({ ...value, [dayKey]: slots });
  };

  const updateTimeSlot = (
    dayKey: keyof WeeklyAvailability,
    index: number,
    field: "start" | "end",
    newValue: string
  ) => {
    const slots = [...value[dayKey]];
    slots[index] = { ...slots[index], [field]: newValue };
    onChange({ ...value, [dayKey]: slots });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <h3 className="font-semibold text-lg">Disponibilités hebdomadaires</h3>
      
      {DAYS.map(({ key, label }) => (
        <div key={key} className="space-y-3 pb-3 border-b last:border-b-0">
          <div className="flex items-center gap-2">
            <Checkbox
              id={key}
              checked={isDayActive(key)}
              onCheckedChange={() => toggleDay(key)}
            />
            <Label htmlFor={key} className="font-medium cursor-pointer">
              {label}
            </Label>
            {!isDayActive(key) && (
              <span className="text-sm text-muted-foreground">(Fermé)</span>
            )}
          </div>

          {isDayActive(key) && (
            <div className="ml-6 space-y-2">
              {(value[key] || []).map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={slot.start}
                    onValueChange={(v) => updateTimeSlot(key, index, "start", v)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <span className="text-muted-foreground">-</span>
                  
                  <Select
                    value={slot.end}
                    onValueChange={(v) => updateTimeSlot(key, index, "end", v)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTimeSlot(key, index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addTimeSlot(key)}
                className="mt-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter un créneau
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
