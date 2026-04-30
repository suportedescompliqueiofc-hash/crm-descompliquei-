import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlataforma } from "@/contexts/PlataformaContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle2, PlayCircle, Lock, ArrowLeft } from "lucide-react";

type PillarView = {
  num: number;
  title: string;
  phaseLabel: string;
  badgeText: string;
  badgeColor: string;
  locked: boolean;
};

export default function Pilar() {
  const { pilarId } = useParams();
  const navigate = useNavigate();
  const { plan, progress } = usePlataforma();

  const [modules, setModules] = useState<any[]>([]);
  const [progressDetails, setProgressDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const pilaresData: PillarView[] = [
    {
      num: 1,
      title: "FUNDAÇÃO CLÍNICA",
      phaseLabel: "Fase C do Método C.L.A.R.O.",
      badgeText: "P.C.A. e G.C.A.",
      badgeColor: "bg-emerald-500/10 text-emerald-500 border-transparent",
      locked: false,
    },
    {
      num: 2,
      title: "MOTOR DE DEMANDA",
      phaseLabel: "Fase L do Método C.L.A.R.O.",
      badgeText: plan === "pca" ? "Exclusivo G.C.A." : "G.C.A.",
      badgeColor:
        plan === "pca"
          ? "bg-[#E85D24]/10 text-[#E85D24] border-transparent"
          : "bg-emerald-500/10 text-emerald-500 border-transparent",
      locked: plan === "pca",
    },
    {
      num: 3,
      title: "MOTOR COMERCIAL",
      phaseLabel: "Fases A, R e O",
      badgeText: "P.C.A. e G.C.A.",
      badgeColor: "bg-emerald-500/10 text-emerald-500 border-transparent",
      locked: false,
    },
  ];

  const pilar = pilaresData.find((item) => item.num === Number(pilarId));

  useEffect(() => {
    async function load() {
      if (!pilar) {
        setIsLoading(false);
        return;
      }

      const { data: mods } = await supabase
        .from("platform_modules")
        .select("*")
        .eq("active", true)
        .eq("pillar", pilar.num)
        .order("order_index", { ascending: true });

      if (mods) {
        setModules(mods);
      }

      const { data: details } = await supabase
        .from("platform_module_progress_detail")
        .select("*");

      if (details) {
        setProgressDetails(details);
      }

      setIsLoading(false);
    }

    void load();
  }, [pilar]);

  const completedModules = useMemo(() => {
    return modules.filter((module) => progress.some((item) => item.module_id === module.id && item.completed)).length;
  }, [modules, progress]);

  const pillarProgressPercent = modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0;

  if (!pilar) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <h1 className="text-2xl font-bold">Pilar não encontrado</h1>
        <Button onClick={() => navigate("/plataforma/trilha")} variant="outline">
          Voltar para a Trilha
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <Button
        variant="ghost"
        onClick={() => navigate("/plataforma/trilha")}
        className="text-muted-foreground hover:text-foreground mb-4 pl-0"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para a Trilha
      </Button>

      <div className="space-y-4 border-b border-border pb-6">
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="outline" className={pilar.badgeColor}>
            {pilar.locked && <Lock className="w-3 h-3 mr-1" />}
            {pilar.badgeText}
          </Badge>
        </div>
        <h1 className="text-4xl font-bold uppercase tracking-tight text-foreground font-serif">
          Pilar {pilar.num} — {pilar.title}
        </h1>
        <p className="text-muted-foreground text-lg">
          {pilar.phaseLabel} · {modules.length} {modules.length === 1 ? "módulo" : "módulos"}
        </p>

        {modules.length > 0 && (
          <div className="mt-8 space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground font-medium">
              <span>Progresso do Pilar: {pillarProgressPercent}% concluído</span>
              <span>
                {completedModules} de {modules.length} módulos
              </span>
            </div>
            <Progress value={pillarProgressPercent} className="h-2 bg-muted" />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Módulos</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            {modules.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhum módulo encontrado neste pilar.</div>
            ) : (
              modules.map((mod) => {
                const isCompleted = progress.some((item) => item.module_id === mod.id && item.completed);
                const completedSteps = progressDetails.filter((detail) => detail.module_id === mod.id).length;
                const moduleProgressPercent = isCompleted ? 100 : Math.round((completedSteps / 4) * 100);
                const isInProgress = !isCompleted && completedSteps > 0;

                return (
                  <div
                    key={mod.id}
                    onClick={() => {
                      if (pilar.locked) return;
                      navigate(`/plataforma/trilha/${mod.id}`);
                    }}
                    className={`flex items-center justify-between p-5 border-b border-border last:border-0 transition-colors ${
                      pilar.locked
                        ? "cursor-not-allowed opacity-50 bg-background"
                        : "cursor-pointer group hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      ) : isInProgress ? (
                        <div className="relative shrink-0 w-6 h-6 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-[#E85D24]"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <div className="absolute top-0 right-0 w-2 h-2 bg-[#E85D24] rounded-full animate-pulse border border-white" />
                        </div>
                      ) : (
                        <PlayCircle
                          className={`w-6 h-6 shrink-0 ${
                            pilar.locked
                              ? "text-muted-foreground"
                              : "text-muted-foreground group-hover:text-[#E85D24] transition-colors"
                          }`}
                        />
                      )}
                      <div>
                        <p
                          className={`font-semibold transition-colors ${
                            isCompleted ? "text-foreground" : "text-card-foreground group-hover:text-foreground"
                          }`}
                        >
                          <span className="text-muted-foreground mr-2 text-sm">{mod.id}</span>
                          {mod.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{mod.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      {!pilar.locked && (
                        <div className="flex flex-col items-end gap-1.5 w-20">
                          <span className="text-xs font-bold text-muted-foreground">{moduleProgressPercent}%</span>
                          <Progress value={moduleProgressPercent} className="h-1.5 w-full bg-muted" />
                        </div>
                      )}
                      {pilar.locked && (
                        <div className="flex items-center text-xs text-[#E85D24] font-medium opacity-80 shrink-0">
                          <Lock className="w-3 h-3 mr-1.5" />
                          Faça upgrade
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
