import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface RevenueChartProps {
  data: { name: string; produits: number; services: number; livraisons?: number }[];
  title?: string;
  description?: string;
}

export const RevenueChart = ({ data, title = "Revenus par période", description }: RevenueChartProps) => {
  const isMobile = useIsMobile();
  const hasData = data.some((d) => d.produits > 0 || d.services > 0 || (d.livraisons || 0) > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Aucune donnée de revenus pour cette période
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" tick={{ fontSize: isMobile ? 10 : 12 }} />
              <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={isMobile ? 35 : 50} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} FCFA`,
                  name === "produits" ? "Produits" : name === "services" ? "Services" : "Livraisons",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
              <Bar dataKey="produits" name="Produits" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="services" name="Services" stackId="a" fill="hsl(var(--secondary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="livraisons" name="Livraisons" stackId="a" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
