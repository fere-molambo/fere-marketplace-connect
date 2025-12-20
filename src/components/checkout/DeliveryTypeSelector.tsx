import { Store, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryTypeSelectorProps {
  value: "pickup" | "delivery";
  onChange: (value: "pickup" | "delivery") => void;
  isMultiVendor: boolean;
  deliveryFee: number;
}

export function DeliveryTypeSelector({
  value,
  onChange,
  isMultiVendor,
  deliveryFee,
}: DeliveryTypeSelectorProps) {
  const canPickup = !isMultiVendor;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Pickup option */}
      <button
        type="button"
        disabled={!canPickup}
        onClick={() => onChange("pickup")}
        className={cn(
          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
          value === "pickup"
            ? "border-primary bg-primary/5"
            : "border-muted hover:border-muted-foreground/30",
          !canPickup && "opacity-50 cursor-not-allowed"
        )}
      >
        <Store className={cn("h-6 w-6", value === "pickup" ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("font-medium text-sm", value === "pickup" && "text-primary")}>
          Récupérer en boutique
        </span>
        <span className="text-xs text-green-600 font-medium">Gratuit</span>
      </button>

      {/* Delivery option */}
      <button
        type="button"
        onClick={() => onChange("delivery")}
        className={cn(
          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
          value === "delivery"
            ? "border-primary bg-primary/5"
            : "border-muted hover:border-muted-foreground/30"
        )}
      >
        <Truck className={cn("h-6 w-6", value === "delivery" ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("font-medium text-sm", value === "delivery" && "text-primary")}>
          Livrer à une adresse
        </span>
        <span className="text-xs text-muted-foreground">
          À partir de {deliveryFee.toLocaleString()} FCFA
        </span>
      </button>
    </div>
  );
}