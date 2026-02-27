import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OrderStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Service booking statuses
  pending: { label: "En attente", className: "bg-blue-100 text-blue-800 border-blue-200" },
  accepted: { label: "Acceptée", className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  on_the_way: { label: "En route", className: "bg-blue-100 text-blue-800 border-blue-200" },
  arrived: { label: "Arrivé", className: "bg-orange-100 text-orange-800 border-orange-200" },
  completed: { label: "Terminée", className: "bg-green-100 text-green-800 border-green-200" },
  partial: { label: "Partielle (50%)", className: "bg-amber-100 text-amber-800 border-amber-200" },
  expired: { label: "Expirée", className: "bg-gray-100 text-gray-800 border-gray-200" },
  pending_refund: { label: "Remboursement en attente", className: "bg-orange-100 text-orange-800 border-orange-200" },
  // Order statuses
  reserved: { label: "Réservé", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  confirmed: { label: "Confirmée", className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  in_progress: { label: "En cours", className: "bg-purple-100 text-purple-800 border-purple-200" },
  in_transit: { label: "En transit", className: "bg-purple-100 text-purple-800 border-purple-200" },
  delivered: { label: "Livrée", className: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Annulé", className: "bg-red-100 text-red-800 border-red-200" },
  refunded: { label: "Remboursée", className: "bg-gray-100 text-gray-800 border-gray-200" },
  return_pending: { label: "Retour en attente", className: "bg-orange-100 text-orange-800 border-orange-200" },
  return_in_progress: { label: "Retour en cours", className: "bg-orange-100 text-orange-800 border-orange-200" },
  returned: { label: "Retournée", className: "bg-gray-100 text-gray-800 border-gray-200" },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  if (!status) return null;
  
  const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
  
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
