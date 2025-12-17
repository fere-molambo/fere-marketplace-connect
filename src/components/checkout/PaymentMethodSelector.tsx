import { CreditCard, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethodSelectorProps {
  value: "online" | "cash";
  onChange: (value: "online" | "cash") => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Online payment */}
      <button
        type="button"
        onClick={() => onChange("online")}
        className={cn(
          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
          value === "online"
            ? "border-primary bg-primary/5"
            : "border-muted hover:border-muted-foreground/30"
        )}
      >
        <CreditCard className={cn("h-6 w-6", value === "online" ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("font-medium text-sm", value === "online" && "text-primary")}>
          Payer maintenant
        </span>
        <span className="text-xs text-muted-foreground text-center">
          Wave, Mobile Money, Visa
        </span>
      </button>

      {/* Cash on delivery */}
      <button
        type="button"
        onClick={() => onChange("cash")}
        className={cn(
          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
          value === "cash"
            ? "border-primary bg-primary/5"
            : "border-muted hover:border-muted-foreground/30"
        )}
      >
        <Wallet className={cn("h-6 w-6", value === "cash" ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("font-medium text-sm", value === "cash" && "text-primary")}>
          Payer à la livraison
        </span>
        <span className="text-xs text-muted-foreground text-center">
          Cash à la réception
        </span>
      </button>
    </div>
  );
}