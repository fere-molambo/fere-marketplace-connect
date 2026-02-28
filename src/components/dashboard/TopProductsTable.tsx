import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

interface TopProductsTableProps {
  products: TopProduct[];
  title?: string;
  limit?: number;
}

export const TopProductsTable = ({ products, title = "Top produits vendus", limit = 10 }: TopProductsTableProps) => {
  const items = products.slice(0, limit);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune vente enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[400px]">
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">Revenu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium truncate max-w-[200px]">{p.name}</TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{p.revenue.toLocaleString()} FCFA</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
