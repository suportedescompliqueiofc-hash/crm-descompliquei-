import { useFunnelMetrics } from "@/hooks/useFunnelMetrics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRange } from "react-day-picker";
import { AlertCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LabelList } from 'recharts';

interface FunnelMetricsTabProps {
  dateRange: DateRange | undefined;
}

export function FunnelMetricsTab({ dateRange }: FunnelMetricsTabProps) {
  const { data: funnelData, isLoading, error } = useFunnelMetrics(dateRange);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  if (error || !funnelData || funnelData.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Dados Insuficientes</h3>
          <p className="text-muted-foreground max-w-sm">
            Não foi possível carregar as etapas do funil padrão.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Funil de Vendas (Acumulado)</CardTitle>
            <CardDescription>Visualização acumulada do volume de leads por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={funnelData} 
                  layout="vertical"
                  margin={{ top: 20, right: 120, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="stageName" 
                    type="category" 
                    width={180} 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar 
                    dataKey="count" 
                    barSize={32} 
                    radius={[0, 4, 4, 0]}
                  >
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                    ))}
                    <LabelList 
                      dataKey="count" 
                      position="right" 
                      formatter={(val: number) => `${val}`}
                      style={{ fontWeight: 'bold' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}