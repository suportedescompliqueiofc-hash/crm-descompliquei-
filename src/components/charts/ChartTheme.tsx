import { TooltipProps } from "recharts";

// 1. Definições de Gradientes (Bioluminescence)
export const ChartGradients = () => (
  <defs>
    <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0.1}/>
    </linearGradient>
    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
    </linearGradient>
    <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#A855F7" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#A855F7" stopOpacity={0.1}/>
    </linearGradient>
    <linearGradient id="colorAmber" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
    </linearGradient>
    <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
    </linearGradient>
  </defs>
);

// 2. Cores Sólidas para Linhas e Barras
export const CHART_COLORS = {
  teal: "#2DD4BF",   // Teal-400
  cyan: "#06B6D4",   // Cyan-500
  blue: "#3B82F6",   // Blue-500
  purple: "#A855F7", // Purple-500
  pink: "#EC4899",   // Pink-500
  amber: "#F59E0B",  // Amber-500
  red: "#EF4444",    // Red-500
  grid: "rgba(100, 116, 139, 0.1)" // Slate-500 com baixa opacidade
};

// 3. Tooltip com Efeito Glassmorphism
export const CustomChartTooltip = ({ active, payload, label, formatter }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/70 dark:bg-black/60 backdrop-blur-md border border-white/20 dark:border-white/10 p-4 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <p className="font-bold text-sm mb-2 text-foreground/80">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs mb-1">
            <div 
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]" 
              style={{ backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}` }} 
            />
            <span className="text-muted-foreground font-medium">{entry.name}:</span>
            <span className="font-bold text-foreground">
              {formatter ? formatter(entry.value, entry.name, entry, index) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// 4. Classe base para Cards (Glassmorphism + Bento Grid)
export const glassCardClass = "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-500 ease-out rounded-[24px]";