import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface OrdersChartProps {
  data: { name: string; commandes: number; reservations: number }[];
  title?: string;
  description?: string;
}

export const OrdersChart = ({ data, title = "Volume commandes & réservations", description }: OrdersChartProps) => {
  const isMobile = useIsMobile();
  const hasData = data.some((d) => d.commandes > 0 || d.reservations > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Aucune donnée pour cette période
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" tick={{ fontSize: isMobile ? 10 : 12 }} />
              <YAxis className="text-xs" allowDecimals={false} width={isMobile ? 30 : 40} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
              <Line type="monotone" dataKey="commandes" name="Commandes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="reservations" name="Réservations" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
