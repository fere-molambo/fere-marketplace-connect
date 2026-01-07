import { Check, Clock, Package, Truck, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderTimelineProps {
  status: string;
}

const steps = [
  { key: "pending", label: "Créée", icon: Clock },
  { key: "confirmed", label: "Confirmée", icon: Check },
  { key: "in_transit", label: "En transit", icon: Truck },
  { key: "delivered", label: "Livrée", icon: MapPin },
];

export function OrderTimeline({ status }: OrderTimelineProps) {
  const currentIndex = steps.findIndex((s) => s.key === status);
  
  // Handle cancelled/refunded separately
  if (status === "cancelled" || status === "refunded") {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-center">
        <p className="text-sm font-medium text-destructive">
          {status === "cancelled" ? "Commande annulée" : "Commande remboursée"}
        </p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ 
            width: currentIndex >= 0 
              ? `${Math.min((currentIndex / (steps.length - 1)) * 100, 100)}%` 
              : '0%' 
          }}
        />
        
        {steps.map((step, index) => {
          // When status is "delivered", all steps are completed (including the last one)
          const isCompleted = status === "delivered" ? true : currentIndex > index;
          const isCurrent = status === "delivered" ? false : currentIndex === index;
          const isPending = status === "delivered" ? false : currentIndex < index;
          const Icon = step.icon;
          
          return (
            <div key={step.key} className="flex flex-col items-center z-10 flex-1">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className={cn("h-5 w-5", isCurrent && "animate-pulse")} />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center",
                  isCompleted && "text-primary",
                  isCurrent && "text-primary",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
