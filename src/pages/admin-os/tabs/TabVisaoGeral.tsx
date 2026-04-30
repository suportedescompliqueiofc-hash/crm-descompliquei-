import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Bot, BrainCircuit, Activity } from 'lucide-react';

export default function TabVisaoGeral() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Visão Geral</h2>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#141414] border-border/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              <Users className="w-4 h-4 mr-2" /> Clientes Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">0</div>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">0 GCA</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">0 PCA</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#141414] border-border/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              <BookOpen className="w-4 h-4 mr-2" /> Progresso da Trilha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">0%</div>
            <p className="text-xs text-muted-foreground mt-2">Média geral dos clientes</p>
          </CardContent>
        </Card>

        <Card className="bg-[#141414] border-border/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              <Bot className="w-4 h-4 mr-2" /> Utilização IAs (Hoje)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">0</div>
            <p className="text-xs text-muted-foreground mt-2">Consultas realizadas</p>
          </CardContent>
        </Card>

        <Card className="bg-[#141414] border-border/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              <BrainCircuit className="w-4 h-4 mr-2" /> Cérebro Central
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">0</div>
            <p className="text-xs text-muted-foreground mt-2">Configurados (0 ausentes)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* RECENT ACTIVITY */}
        <Card className="bg-[#141414] border-border/10">
          <CardHeader className="border-b border-border/10">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white flex items-center">
              <Activity className="w-4 h-4 mr-2 text-[#E85D24]" /> Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/10">
              <div className="p-4 text-sm text-muted-foreground text-center">Nenhuma atividade registrada hoje.</div>
            </div>
          </CardContent>
        </Card>

        {/* ALERTS */}
        <Card className="bg-[#141414] border-border/10">
          <CardHeader className="border-b border-border/10">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center">
              Alertas do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/10">
              <div className="p-4 text-sm text-muted-foreground text-center">Nenhum alerta crítico.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
