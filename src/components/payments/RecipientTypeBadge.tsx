import { Badge } from "@/components/ui/badge";
import { Store, Truck } from "lucide-react";

export function RecipientTypeBadge({ type }: { type: string }) {
  if (type === "vendor") {
    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        <Store className="mr-1 h-3 w-3" />
        Vendeur
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
      <Truck className="mr-1 h-3 w-3" />
      Livreur
    </Badge>
  );
}
