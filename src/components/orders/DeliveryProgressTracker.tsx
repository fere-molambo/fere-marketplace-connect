import { Check, Clock, Package, Truck, MapPin, Eye, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryProgressTrackerProps {
  deliveryStatus: string | null | undefined;
  paymentMethod?: string | null;
}

const steps = [
  { key: "pending", label: "En attente", icon: Clock, description: "Recherche d'un livreur" },
  { key: "assigned", label: "Acceptée", icon: Check, description: "Livreur en route vers la boutique" },
  { key: "in_progress", label: "Vers pickup", icon: Truck, description: "Le livreur se dirige vers la boutique" },
  { key: "picked_up", label: "Récupérée", icon: Package, description: "Colis récupéré" },
  { key: "en_route_client", label: "En route", icon: Navigation, description: "En route vers vous" },
  { key: "arrived", label: "Arrivé", icon: MapPin, description: "Le livreur est arrivé" },
  { key: "delivered", label: "Livrée", icon: Check, description: "Livraison terminée" },
];

export function DeliveryProgressTracker({ deliveryStatus, paymentMethod }: DeliveryProgressTrackerProps) {
  if (!deliveryStatus) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
        La livraison sera créée après confirmation de la commande.
      </div>
    );
  }
  
  const currentIndex = steps.findIndex((s) => s.key === deliveryStatus);
  
  if (deliveryStatus === "cancelled") {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-center">
        <p className="text-sm font-medium text-destructive">
          Livraison annulée
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isCompleted = deliveryStatus === "delivered" ? true : currentIndex > index;
          const isCurrent = deliveryStatus === "delivered" ? index === steps.length - 1 : currentIndex === index;
          const isPending = deliveryStatus === "delivered" ? false : currentIndex < index;
          const Icon = step.icon;
          
          return (
            <div 
              key={step.key} 
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-all",
                isCurrent && "bg-primary/10",
                isCompleted && !isCurrent && "opacity-60"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary/20 text-primary ring-2 ring-primary ring-offset-1",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className={cn("h-4 w-4", isCurrent && "animate-pulse")} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted && "text-primary",
                    isCurrent && "text-primary",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
