import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { addDays, isBefore, startOfDay, format, getDay } from "date-fns";
import { fr } from "date-fns/locale";

interface WeeklyAvailability {
  [key: string]: Array<{ start: string; end: string }>;
}

interface ServiceBookingCalendarProps {
  weeklyAvailability: WeeklyAvailability;
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

// Map JS getDay() to French day names
const dayIndexToName: { [key: number]: string } = {
  0: "dimanche",
  1: "lundi",
  2: "mardi",
  3: "mercredi",
  4: "jeudi",
  5: "vendredi",
  6: "samedi",
};

export function ServiceBookingCalendar({
  weeklyAvailability,
  selectedDate,
  onSelect,
}: ServiceBookingCalendarProps) {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 60); // Allow booking up to 60 days ahead

  // Determine which days have availability
  const availableDayIndices = useMemo(() => {
    const indices: number[] = [];
    Object.entries(dayIndexToName).forEach(([index, name]) => {
      const slots = weeklyAvailability[name] || [];
      if (slots.length > 0) {
        indices.push(parseInt(index));
      }
    });
    return indices;
  }, [weeklyAvailability]);

  // Disable dates that are in the past or have no availability
  const isDateDisabled = (date: Date): boolean => {
    // Past dates
    if (isBefore(date, today)) return true;
    
    // Dates beyond max booking window
    if (isBefore(maxDate, date)) return true;
    
    // Days without availability slots
    const dayIndex = getDay(date);
    return !availableDayIndices.includes(dayIndex);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Choisir une date</p>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onSelect}
        disabled={isDateDisabled}
        locale={fr}
        className="rounded-md border"
        modifiers={{
          available: (date) => !isDateDisabled(date),
        }}
        modifiersStyles={{
          available: {
            fontWeight: "bold",
            backgroundColor: "hsl(var(--primary) / 0.1)",
          },
        }}
      />
      {availableDayIndices.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Ce prestataire n'a pas renseigné ses disponibilités
        </p>
      )}
    </div>
  );
}
