import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OrderStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Livraison en attente", className: "bg-blue-100 text-blue-800 border-blue-200" },
  confirmed: { label: "Confirmée", className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  in_transit: { label: "En transit", className: "bg-purple-100 text-purple-800 border-purple-200" },
  delivered: { label: "Livrée", className: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Annulée", className: "bg-red-100 text-red-800 border-red-200" },
  refunded: { label: "Remboursée", className: "bg-gray-100 text-gray-800 border-gray-200" },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
  
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
