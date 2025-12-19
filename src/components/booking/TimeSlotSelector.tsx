import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface TimeSlot {
  start: string;
  end: string;
}

interface TimeSlotSelectorProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  isLoading?: boolean;
}

export function TimeSlotSelector({
  slots,
  selectedSlot,
  onSelect,
  isLoading,
}: TimeSlotSelectorProps) {
  if (isLoading) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        Chargement des créneaux...
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground border rounded-lg bg-muted/30">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Aucun créneau disponible pour cette date</p>
        <p className="text-xs mt-1">Choisissez une autre date</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Créneaux disponibles</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((slot, index) => {
          const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
          return (
            <Button
              key={index}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => onSelect(slot)}
            >
              {slot.start} - {slot.end}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
