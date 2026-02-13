import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PaymentStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  partial: { label: "Acompte payé", className: "bg-orange-100 text-orange-800 border-orange-200" },
  paid: { label: "Payé intégralement", className: "bg-green-100 text-green-800 border-green-200" },
  success: { label: "Payé intégralement", className: "bg-green-100 text-green-800 border-green-200" },
  failed: { label: "Paiement échoué", className: "bg-red-100 text-red-800 border-red-200" },
  refunded: { label: "Remboursé", className: "bg-gray-100 text-gray-800 border-gray-200" },
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  if (!status) return null;
  
  const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
  
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}