// Seção "Artefatos" — 04-plano-de-acao.md (a anatomia do plano) e
// 03-materiais-por-elo.md (o catálogo, filtrável por elo/grupo).
import { useMemo, useState } from 'react';
import { Section, ListRow, StatusIndicator } from '@/components/cs/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  O_QUE_E_UM_PLANO,
  O_QUE_NAO_E_UM_PLANO,
  EVIDENCIA_QUE_MOTIVA_O_RIGOR,
  UM_ELO_POR_PLANO,
  REGRA_PERMANENTE_PLATAFORMA_JA_FAZ,
  ANATOMIA_DO_PLANO,
  ACOES_DO_JOAO,
  PROGRESSAO_DENTRO_DO_MES,
  TESTE_DE_QUALIDADE_DE_UMA_ACAO,
  PARES_ACAO_RUIM_BOA,
  COMO_O_MATERIAL_SE_ACOPLA_AO_PLANO,
  MATERIAIS,
  O_QUE_NAO_VIRA_MATERIAL,
  COMO_O_CLAUDE_PRODUZ_MATERIAL,
  REGRA_DE_ENTREGA,
  getMateriaisPorGrupo,
} from '@/content/cs';
import type { GrupoMaterialId } from '@/content/cs';

const GRUPOS: { id: GrupoMaterialId | 'todos'; nome: string }[] = [
  { id: 'todos', nome: 'Todos os grupos' },
  { id: 'adocao', nome: 'Camada 0 — Adoção' },
  { id: 'demanda', nome: 'Demanda' },
  { id: 'agendamento', nome: 'Agendamento' },
  { id: 'resgate_lead_frio', nome: 'Resgate de Lead Frio' },
  { id: 'comparecimento', nome: 'Comparecimento' },
  { id: 'fechamento', nome: 'Fechamento' },
  { id: 'ticket', nome: 'Ticket' },
  { id: 'ciclo_venda', nome: 'Ciclo de Venda' },
  { id: 'recompra', nome: 'Recompra' },
];

export function ArtefatosView() {
  const [grupo, setGrupo] = useState<GrupoMaterialId | 'todos'>('todos');

  const materiais = useMemo(() => (grupo === 'todos' ? MATERIAIS : getMateriaisPorGrupo(grupo)), [grupo]);

  return (
    <div>
      <Section title="O plano de ação mensal" description="O entregável central do sistema.">
        <p className="text-sm leading-relaxed text-foreground">{O_QUE_E_UM_PLANO}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-3">{EVIDENCIA_QUE_MOTIVA_O_RIGOR}</p>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60 mt-4">O que NÃO é</p>
        <ul className="mt-1 space-y-1.5">
          {O_QUE_NAO_E_UM_PLANO.map((t, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
              <span className="text-muted-foreground/40">—</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Um elo por plano">
        <p className="text-sm text-foreground">{UM_ELO_POR_PLANO.regra}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60 mt-3">Quando a exceção é aceitável</p>
        <ul className="mt-1 space-y-1.5">
          {UM_ELO_POR_PLANO.quandoAExcecaoEAceitavel.map((t, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
              <span className="text-muted-foreground/40">—</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={REGRA_PERMANENTE_PLATAFORMA_JA_FAZ.titulo} description="A correção mais importante do plano de ação.">
        <p className="text-sm leading-relaxed text-foreground">{REGRA_PERMANENTE_PLATAFORMA_JA_FAZ.citacaoDoCeo}</p>
        <div className="mt-3 divide-y divide-border/50">
          {REGRA_PERMANENTE_PLATAFORMA_JA_FAZ.errosEcorrecoes.map((e, i) => (
            <div key={i} className="py-2.5 grid sm:grid-cols-2 gap-2">
              <p className="text-[13px] text-red-700 dark:text-red-400 leading-relaxed">{e.errado}</p>
              <p className="text-[13px] text-emerald-700 dark:text-emerald-400 leading-relaxed">{e.certo}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Anatomia do plano">
        <p className="text-sm text-foreground font-medium">{ANATOMIA_DO_PLANO.tetoDeAcoesPorSemana.limite}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{ANATOMIA_DO_PLANO.tetoDeAcoesPorSemana.porQue}</p>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60 mt-4">
          {ANATOMIA_DO_PLANO.anatomiaDeUmaAcao.titulo}
        </p>
        <ol className="mt-1 space-y-1 list-decimal list-inside">
          {ANATOMIA_DO_PLANO.anatomiaDeUmaAcao.componentes.map((c, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed">{c}</li>
          ))}
        </ol>

        <p className="text-[13px] text-muted-foreground leading-relaxed mt-4">{ANATOMIA_DO_PLANO.criterioDeSucessoDoMes}</p>
      </Section>

      <Section title="Ações do João">
        <p className="text-[13px] text-muted-foreground leading-relaxed">{ACOES_DO_JOAO.oQueMudou}</p>
        <ul className="mt-2 space-y-1.5">
          {ACOES_DO_JOAO.oQueSobra.map((t, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
              <span className="text-muted-foreground/40">—</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="A progressão dentro do mês">
        <div className="divide-y divide-border/50">
          {PROGRESSAO_DENTRO_DO_MES.map((p) => (
            <ListRow key={String(p.semana)}>
              <p className="text-sm font-semibold text-foreground">Semana {p.semana}</p>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{p.resumo}</p>
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title="O teste de qualidade de uma ação">
        <ol className="space-y-1.5 list-decimal list-inside">
          {TESTE_DE_QUALIDADE_DE_UMA_ACAO.map((t, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed">{t}</li>
          ))}
        </ol>
      </Section>

      <Section title="Pares de ação ruim / boa, por elo">
        <div className="divide-y divide-border/50">
          {PARES_ACAO_RUIM_BOA.map((p) => (
            <ListRow key={p.elo}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{p.eloNome}</p>
                <StatusIndicator tone="neutro" label={`dono: ${p.dono}`} />
              </div>
              <p className="text-[13px] text-red-700 dark:text-red-400 mt-1.5 leading-relaxed">Ruim: {p.ruim}</p>
              <p className="text-[13px] text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">Boa: {p.boa}</p>
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title="Como o material se acopla ao plano">
        <p className="text-sm font-medium text-foreground leading-relaxed">{COMO_O_MATERIAL_SE_ACOPLA_AO_PLANO.regraDePrazo}</p>
        <ul className="mt-2 space-y-1.5">
          {COMO_O_MATERIAL_SE_ACOPLA_AO_PLANO.distribuicao.map((t, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
              <span className="text-muted-foreground/40">—</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="O catálogo de materiais" description="O elo diagnosticado determina qual material será produzido — ninguém escolhe de um menu.">
        <p className="text-[13px] text-muted-foreground leading-relaxed">{COMO_O_CLAUDE_PRODUZ_MATERIAL}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">
          <b className="text-foreground/80">{REGRA_DE_ENTREGA.titulo}.</b> {REGRA_DE_ENTREGA.texto}
        </p>

        <div className="mt-4 mb-1 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
            {materiais.length} {materiais.length === 1 ? 'material' : 'materiais'}
          </p>
          <Select value={grupo} onValueChange={(v) => setGrupo(v as GrupoMaterialId | 'todos')}>
            <SelectTrigger className="h-8 text-[12px] rounded-lg border-border/60 w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRUPOS.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y divide-border/50">
          {materiais.map((m) => (
            <ListRow key={m.id}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{m.nome}</p>
                <StatusIndicator tone="neutro" label={m.tipo === 'operacional' ? 'operacional' : 'estratégico'} />
              </div>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{m.oQueE}</p>
              <p className="text-[12.5px] text-muted-foreground/80 mt-1 leading-relaxed">
                <b className="text-foreground/70">Quando se aplica:</b> {m.quandoSeAplica}
              </p>
              <p className="text-[12.5px] text-muted-foreground/80 mt-1 leading-relaxed">
                <b className="text-foreground/70">Analisar antes:</b> {m.oQueAnalisarAntes}
              </p>
            </ListRow>
          ))}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60 mt-6">
          O que NÃO vira material — porque a plataforma já faz
        </p>
        <ul className="mt-2 space-y-1.5">
          {O_QUE_NAO_VIRA_MATERIAL.map((t, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
              <span className="text-muted-foreground/40">—</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
