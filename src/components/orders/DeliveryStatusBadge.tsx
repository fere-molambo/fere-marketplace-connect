import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DeliveryStatusBadgeProps {
  status: string | null | undefined;
}

const deliveryStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  assigned: { label: "Acceptée", className: "bg-blue-100 text-blue-800 border-blue-200" },
  in_progress: { label: "Vers pickup", className: "bg-purple-100 text-purple-800 border-purple-200" },
  picked_up: { label: "Récupérée", className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  en_route_client: { label: "Vers client", className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  arrived: { label: "Arrivé", className: "bg-amber-100 text-amber-800 border-amber-200" },
  delivered: { label: "Livrée", className: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Annulée", className: "bg-red-100 text-red-800 border-red-200" },
};

export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  if (!status) return null;
  
  const config = deliveryStatusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
  
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}
