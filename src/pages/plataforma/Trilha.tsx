import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlataforma } from "@/contexts/PlataformaContext";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, ChevronRight } from "lucide-react";
import { SemAcesso } from "@/components/SemAcesso";

type PillarCard = {
  num: number;
  title: string;
  phaseLabel: string;
  badgeText: string;
  badgeColor: string;
  locked: boolean;
};

export default function Trilha() {
  const { plan, totalModules, completedModules, progressPercent, acesso } = usePlataforma();
  const navigate = useNavigate();
  const [modules, setModules] = useState<any[]>([]);
  const [pilaresDB, setPilaresDB] = useState<{ id: string; ordem_index: number }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Se não tem nenhum pilar liberado, bloqueia acesso
  const temTrilha = (acesso.pilares_liberados?.length ?? 0) > 0;

  useEffect(() => {
    async function load() {
      const [{ data: mods }, { data: pils }] = await Promise.all([
        supabase
          .from("platform_modules")
          .select("*")
          .eq("active", true)
          .order("order_index", { ascending: true }),
        supabase
          .from("platform_pilares")
          .select("id, ordem_index")
          .order("ordem_index", { ascending: true }),
      ]);

      if (mods) setModules(mods);
      if (pils) setPilaresDB(pils as any);

      setIsLoading(false);
    }

    void load();
  }, []);

  // Mapear UUIDs liberados → números de pilar (ordem_index)
  const pilaresLiberadosNums = useMemo(() => {
    if (!acesso.pilares_liberados?.length) return new Set<number>();
    return new Set(
      pilaresDB
        .filter(p => acesso.pilares_liberados.includes(p.id))
        .map(p => p.ordem_index)
    );
  }, [acesso.pilares_liberados, pilaresDB]);

  const moduleCountByPillar = useMemo(() => {
    return modules.reduce<Record<number, number>>((accumulator, module) => {
      const pillarNumber = Number(module.pillar);
      if (!Number.isFinite(pillarNumber)) {
        return accumulator;
      }

      accumulator[pillarNumber] = (accumulator[pillarNumber] || 0) + 1;
      return accumulator;
    }, {});
  }, [modules]);

  if (!temTrilha) return <SemAcesso />;

  const pilares: PillarCard[] = [
    {
      num: 1,
      title: "FUNDAÇÃO CLÍNICA",
      phaseLabel: "Fase C do Método C.L.A.R.O.",
      badgeText: pilaresLiberadosNums.has(1) ? "Liberado" : "Bloqueado",
      badgeColor: pilaresLiberadosNums.has(1)
        ? "bg-emerald-500/10 text-emerald-500 border-transparent"
        : "bg-[#E85D24]/10 text-[#E85D24] border-transparent",
      locked: !pilaresLiberadosNums.has(1),
    },
    {
      num: 2,
      title: "MOTOR DE DEMANDA",
      phaseLabel: "Fase L do Método C.L.A.R.O.",
      badgeText: pilaresLiberadosNums.has(2) ? "Liberado" : "Bloqueado",
      badgeColor: pilaresLiberadosNums.has(2)
        ? "bg-emerald-500/10 text-emerald-500 border-transparent"
        : "bg-[#E85D24]/10 text-[#E85D24] border-transparent",
      locked: !pilaresLiberadosNums.has(2),
    },
    {
      num: 3,
      title: "MOTOR COMERCIAL",
      phaseLabel: "Fases A, R e O",
      badgeText: pilaresLiberadosNums.has(3) ? "Liberado" : "Bloqueado",
      badgeColor: pilaresLiberadosNums.has(3)
        ? "bg-emerald-500/10 text-emerald-500 border-transparent"
        : "bg-[#E85D24]/10 text-[#E85D24] border-transparent",
      locked: !pilaresLiberadosNums.has(3),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="space-y-4 border-b border-border pb-6">
        <h1 className="text-4xl font-bold uppercase tracking-tight text-foreground font-serif">
          Trilha C.L.A.R.O.
        </h1>
        <div className="flex items-center justify-between text-sm text-muted-foreground font-medium">
          <span>Progresso da Trilha: {progressPercent}% concluído</span>
          <span>
            {completedModules} módulos concluídos de {totalModules}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2 bg-muted" />
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          pilares.map((pilar) => {
            const moduleCount = moduleCountByPillar[pilar.num] || 0;

            return (
              <div
                key={pilar.num}
                className="border border-border rounded-lg bg-card overflow-hidden transition-all shadow-sm hover:shadow-md hover:border-primary/50 group"
              >
                <div
                  onClick={() => {
                    if (!pilar.locked) {
                      navigate(`/plataforma/trilha/pilar/${pilar.num}`);
                    }
                  }}
                  className={`p-4 md:p-6 flex items-center justify-between transition-colors ${
                    pilar.locked ? "cursor-not-allowed opacity-75" : "cursor-pointer hover:bg-muted/50"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2
                        className={`text-lg font-bold uppercase tracking-wider transition-colors ${
                          pilar.locked ? "text-muted-foreground" : "text-card-foreground group-hover:text-primary"
                        }`}
                      >
                        Pilar {pilar.num} — {pilar.title}
                      </h2>
                      <Badge variant="outline" className={pilar.badgeColor}>
                        {pilar.locked && <Lock className="w-3 h-3 mr-1" />}
                        {pilar.badgeText}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pilar.phaseLabel} · {moduleCount} {moduleCount === 1 ? "módulo" : "módulos"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pilar.locked ? (
                      <span className="text-xs font-semibold text-[#E85D24]">Faça upgrade</span>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
