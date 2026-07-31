// Seção "Ritos" — os 6 documentos de 05-operacoes-e-cs/sistema/ritos/.
// Sub-navegação interna própria (mesma linguagem visual do SecaoNav, num
// nível abaixo) porque são 6 ritos densos — misturar tudo numa rolagem só
// tornaria a seção ilegível.
import { useState } from 'react';
import { Section, ListRow, StatusIndicator } from '@/components/cs/ui';
import { cn } from '@/lib/utils';
import {
  O_MES_E_DO_CLIENTE_NAO_DA_EMPRESA,
  RITO_DIARIO,
  RITO_SEMANAL,
  SEMANAS_DO_MES,
  SESSAO_TATICA_CALENDARIO,
  CADENCIA_INDIVIDUAL,
  CALENDARIO_DE_FECHAMENTO,
  SINAIS_RISCO,
  NIVEIS_RISCO,
  REGRAS_TRANSICAO,
  ORDENACAO_DA_FILA,
  ONBOARDING,
  FIM_DE_CICLO,
  REUNIAO_MENSAL_INTRO,
  PREPARACAO_ANTES_DA_CHAMADA,
  BLOCOS_REUNIAO_MENSAL,
  REGRAS_DURAS_DA_REUNIAO,
  CONVERSAS_DIFICEIS,
  SESSAO_TATICA_GRUPO,
} from '@/content/cs';
import type { NivelRiscoId } from '@/content/cs';

const RITOS = [
  { id: 'mes', nome: 'O mês do CS' },
  { id: 'risco', nome: 'A régua de risco' },
  { id: 'onboarding', nome: 'Onboarding' },
  { id: 'fim-de-ciclo', nome: 'Fim de ciclo' },
  { id: 'reuniao-mensal', nome: 'Reunião mensal' },
  { id: 'sessao-tatica', nome: 'Sessão tática em grupo' },
] as const;

type RitoId = (typeof RITOS)[number]['id'];

const TOM_NIVEL: Record<NivelRiscoId, 'critico' | 'atencao' | 'saudavel' | 'referencia'> = {
  critico: 'critico',
  atencao: 'atencao',
  saudavel: 'saudavel',
  referencia: 'referencia',
};

export function RitosView() {
  const [rito, setRito] = useState<RitoId>('mes');

  return (
    <div>
      <nav className="flex flex-wrap gap-x-5 gap-y-2 mb-2">
        {RITOS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRito(r.id)}
            className={cn(
              'text-[12.5px] font-medium rounded-md px-2.5 py-1 transition-colors',
              rito === r.id ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {r.nome}
          </button>
        ))}
      </nav>

      {rito === 'mes' && (
        <div>
          <Section title="O mês é do cliente, não da empresa">
            <p className="text-sm leading-relaxed text-foreground">{O_MES_E_DO_CLIENTE_NAO_DA_EMPRESA}</p>
          </Section>

          <Section title="Rito diário" description={RITO_DIARIO.duracao}>
            <ol className="space-y-2 list-decimal list-inside">
              {RITO_DIARIO.passos.map((p, i) => (
                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed">
                  {p}
                </li>
              ))}
            </ol>
            <p className="text-[13px] text-muted-foreground/80 leading-relaxed mt-3">{RITO_DIARIO.diaSemAcao}</p>
          </Section>

          <Section title="Rito semanal">
            <p className="text-sm text-foreground">{RITO_SEMANAL.descricao}</p>
            <ul className="mt-2 space-y-1.5">
              {RITO_SEMANAL.oQueSeDecide.map((t, i) => (
                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
                  <span className="text-muted-foreground/40">—</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="As quatro semanas do mês (de cada cliente)">
            <div className="divide-y divide-border/50">
              {SEMANAS_DO_MES.map((s) => (
                <ListRow key={s.numero}>
                  <p className="text-sm font-semibold text-foreground">
                    Semana {s.numero} — {s.titulo}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{s.objetivo}</p>
                  <div className="mt-2 grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">O CS faz</p>
                      <ul className="mt-1 space-y-1">
                        {s.oQueOCsFaz.map((t, i) => (
                          <li key={i} className="text-[12.5px] text-muted-foreground leading-relaxed">
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">O CS não faz</p>
                      <ul className="mt-1 space-y-1">
                        {s.oQueOCsNaoFaz.map((t, i) => (
                          <li key={i} className="text-[12.5px] text-muted-foreground leading-relaxed">
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </ListRow>
              ))}
            </div>
          </Section>

          <Section title="Sessão tática — calendário" description={SESSAO_TATICA_CALENDARIO.quandoCai}>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{SESSAO_TATICA_CALENDARIO.comoOTemaEEscolhido}</p>
          </Section>

          <Section title="Cadência individual">
            <ul className="space-y-2">
              <li className="text-[13px] text-muted-foreground leading-relaxed"><b className="text-foreground">Primeiros 30 dias:</b> {CADENCIA_INDIVIDUAL.primeiros30dias}</li>
              <li className="text-[13px] text-muted-foreground leading-relaxed"><b className="text-foreground">Depois de 30 dias:</b> {CADENCIA_INDIVIDUAL.depoisDe30dias}</li>
              <li className="text-[13px] text-muted-foreground leading-relaxed"><b className="text-foreground">Sob demanda:</b> {CADENCIA_INDIVIDUAL.sobDemanda}</li>
              <li className="text-[13px] text-muted-foreground leading-relaxed">{CADENCIA_INDIVIDUAL.reguaDeRisco}</li>
            </ul>
            <p className="text-[13px] text-muted-foreground/80 leading-relaxed mt-3">{CALENDARIO_DE_FECHAMENTO}</p>
          </Section>
        </div>
      )}

      {rito === 'risco' && (
        <div>
          <Section title="Os seis sinais">
            <div className="divide-y divide-border/50">
              {SINAIS_RISCO.map((s) => (
                <ListRow key={s.numero}>
                  <p className="text-sm font-semibold text-foreground">
                    {s.numero}. {s.nome}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    <b className="text-foreground/80">O que mede:</b> {s.oQueMede}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    <b className="text-foreground/80">Como se mede:</b> {s.comoSeMede}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    <b className="text-foreground/80">Por que importa:</b> {s.porQueImporta}
                  </p>
                  {s.detalhe && <p className="text-[13px] text-muted-foreground/80 mt-1 leading-relaxed">{s.detalhe}</p>}
                </ListRow>
              ))}
            </div>
          </Section>

          <Section title="Os quatro níveis">
            <div className="divide-y divide-border/50">
              {NIVEIS_RISCO.map((n) => (
                <ListRow key={n.nivel}>
                  <StatusIndicator tone={TOM_NIVEL[n.nivel]} label={n.nivel} />
                  <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{n.definicao}</p>
                  {n.gatilhos && (
                    <ul className="mt-2 space-y-1">
                      {n.gatilhos.map((g, i) => (
                        <li key={i} className="text-[12.5px] text-muted-foreground leading-relaxed flex gap-2">
                          <span className="text-muted-foreground/40">—</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
                    <b className="text-foreground/80">Cadência:</b> {n.cadenciaContato}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    <b className="text-foreground/80">Ação obrigatória:</b> {n.acaoObrigatoria}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    <b className="text-foreground/80">Muda no plano:</b> {n.oQueMudaNoPlano}
                  </p>
                </ListRow>
              ))}
            </div>
          </Section>

          <Section title="Regras de transição">
            <div className="divide-y divide-border/50">
              {REGRAS_TRANSICAO.map((r, i) => (
                <ListRow key={i}>
                  <p className="text-sm font-medium text-foreground">
                    {r.de} → {r.para}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{r.regra}</p>
                  {r.porQue && <p className="text-[13px] text-muted-foreground/80 mt-1 leading-relaxed">{r.porQue}</p>}
                </ListRow>
              ))}
            </div>
          </Section>

          <Section title="A ordenação da fila">
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              <b className="text-foreground/80">Chave primária:</b> {ORDENACAO_DA_FILA.chavePrimaria}
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{ORDENACAO_DA_FILA.travaAntesDoDesempate}</p>
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              {ORDENACAO_DA_FILA.desempateNumerico.map((d, i) => (
                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed">
                  {d.replace(/^\d+\.\s*/, '')}
                </li>
              ))}
            </ol>
          </Section>
        </div>
      )}

      {rito === 'onboarding' && (
        <div>
          <Section title="Onboarding" description={ONBOARDING.duracao}>
            <p className="text-sm leading-relaxed text-foreground">{ONBOARDING.tese}</p>
          </Section>

          <Section title="Checklist de handoff (comercial → CS)" description={ONBOARDING.semHandoffNaoComeca}>
            <div className="divide-y divide-border/50">
              {ONBOARDING.handoffChecklist.map((h) => (
                <ListRow key={h.item}>
                  <p className="text-sm font-medium text-foreground">{h.item}</p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{h.porQue}</p>
                </ListRow>
              ))}
            </div>
          </Section>

          <Section title="Checklist de ativação das automações">
            <div className="divide-y divide-border/50">
              {ONBOARDING.checklistAtivacaoAutomacoes.map((a) => (
                <ListRow key={a.automacao}>
                  <p className="text-sm font-medium text-foreground">{a.automacao}</p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{a.oQuePassaAFazer}</p>
                </ListRow>
              ))}
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed mt-3">{ONBOARDING.regraAbsoluta}</p>
          </Section>

          <Section title="Semana 1">
            <p className="text-sm text-foreground">{ONBOARDING.semana1.objetivo}</p>
            <div className="mt-2 grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">O CS faz</p>
                <ul className="mt-1 space-y-1">
                  {ONBOARDING.semana1.oQueOCsFaz.map((t, i) => (
                    <li key={i} className="text-[12.5px] text-muted-foreground leading-relaxed">{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Critério de saída</p>
                <ul className="mt-1 space-y-1">
                  {ONBOARDING.semana1.criterioSaida.map((t, i) => (
                    <li key={i} className="text-[12.5px] text-muted-foreground leading-relaxed">{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section title="Semana 2">
            <p className="text-sm text-foreground">{ONBOARDING.semana2.objetivo}</p>
            <div className="mt-2 grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">O cliente faz</p>
                <ul className="mt-1 space-y-1">
                  {ONBOARDING.semana2.oQueOClienteFaz.map((t, i) => (
                    <li key={i} className="text-[12.5px] text-muted-foreground leading-relaxed">{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Critério de saída</p>
                <ul className="mt-1 space-y-1">
                  {ONBOARDING.semana2.criterioSaida.map((t, i) => (
                    <li key={i} className="text-[12.5px] text-muted-foreground leading-relaxed">{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section title="Se o critério não for atingido">
            <p className="text-[13px] text-muted-foreground leading-relaxed">{ONBOARDING.seCriterioNaoAtingido}</p>
          </Section>

          <Section title="Semana 3 — meta comercial e primeiro plano">
            <p className="text-[13px] text-muted-foreground leading-relaxed">{ONBOARDING.semana3}</p>
          </Section>
        </div>
      )}

      {rito === 'fim-de-ciclo' && (
        <div>
          <Section title="Fim de ciclo — os últimos 30 dias dos 180">
            <p className="text-sm leading-relaxed text-foreground">{FIM_DE_CICLO.restricaoDoDocumento}</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{FIM_DE_CICLO.prazo}</p>
          </Section>

          <Section title={`Quando começa: ${FIM_DE_CICLO.quandoComeca}`}>
            <ul className="space-y-1.5">
              {FIM_DE_CICLO.porQueNao175.map((t, i) => (
                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
                  <span className="text-muted-foreground/40">—</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="A prestação de contas">
            <div className="divide-y divide-border/50">
              {FIM_DE_CICLO.prestacaoDeContas.colunas.map((c) => (
                <ListRow key={c.nome}>
                  <p className="text-sm font-medium text-foreground">{c.nome}</p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{c.fonte}</p>
                </ListRow>
              ))}
            </div>
            <p className="text-[13px] font-medium text-foreground leading-relaxed mt-3">{FIM_DE_CICLO.prestacaoDeContas.regraDura}</p>
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              {FIM_DE_CICLO.prestacaoDeContas.comoConduzirQuandoAPromessaNaoFoiCumprida.map((t, i) => (
                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed">{t}</li>
              ))}
            </ol>
          </Section>

          <Section title="O que o cliente leva">
            <p className="text-[13px] text-muted-foreground leading-relaxed"><b className="text-foreground/80">Processos instalados:</b> {FIM_DE_CICLO.oQueOClienteLeva.processosInstalados}</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mt-2"><b className="text-foreground/80">Continua funcionando:</b> {FIM_DE_CICLO.oQueOClienteLeva.oQueContinuaFuncionando}</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mt-2"><b className="text-foreground/80">O que para:</b> {FIM_DE_CICLO.oQueOClienteLeva.oQuePara}</p>
          </Section>

          <Section title="A conversa sobre o depois">
            <ul className="space-y-1.5">
              {FIM_DE_CICLO.conversaSobreODepois.perguntas.map((p, i) => (
                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
                  <span className="text-muted-foreground/40">—</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{FIM_DE_CICLO.conversaSobreODepois.oQueSeRegistra}</p>
          </Section>

          <Section title="O que o CS aprende de cada ciclo encerrado">
            <ul className="space-y-1.5">
              {FIM_DE_CICLO.oQueOCsAprendeDeCadaCicloEncerrado.map((t, i) => (
                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
                  <span className="text-muted-foreground/40">—</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {rito === 'reuniao-mensal' && (
        <div>
          <Section title="A reunião mensal individual">
            <p className="text-sm leading-relaxed text-foreground">{REUNIAO_MENSAL_INTRO}</p>
          </Section>

          <Section title="Preparação — antes de entrar na chamada" description={PREPARACAO_ANTES_DA_CHAMADA.quando}>
            <ul className="space-y-1.5">
              {PREPARACAO_ANTES_DA_CHAMADA.itens.map((t, i) => (
                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
                  <span className="text-muted-foreground/40">—</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-muted-foreground/80 leading-relaxed mt-2">{PREPARACAO_ANTES_DA_CHAMADA.seAlgoFaltar}</p>
          </Section>

          <Section title="O roteiro, bloco a bloco (45-60 min)">
            <div className="divide-y divide-border/50">
              {BLOCOS_REUNIAO_MENSAL.map((b) => (
                <ListRow key={b.numero}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {b.numero}. {b.titulo}
                    </p>
                    <span className="text-[11px] text-muted-foreground/60 shrink-0">{b.duracao}</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    <b className="text-foreground/80">Dizer:</b> {b.oQueDizer}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    <b className="text-foreground/80">Mostrar:</b> {b.oQueMostrar}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    <b className="text-foreground/80">Perguntar:</b> {b.oQuePerguntar}
                  </p>
                </ListRow>
              ))}
            </div>
          </Section>

          <Section title="Regras duras da reunião">
            <ul className="space-y-1.5">
              {REGRAS_DURAS_DA_REUNIAO.map((t, i) => (
                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
                  <span className="text-muted-foreground/40">—</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Conversas difíceis">
            <div className="divide-y divide-border/50">
              {CONVERSAS_DIFICEIS.map((c) => (
                <ListRow key={c.caso}>
                  <p className="text-sm font-medium text-foreground">{c.caso}</p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{c.comoConduzir}</p>
                </ListRow>
              ))}
            </div>
          </Section>
        </div>
      )}

      {rito === 'sessao-tatica' && (
        <div>
          <Section title="A sessão tática semanal em grupo" description={SESSAO_TATICA_GRUPO.diaHorario}>
            <p className="text-sm leading-relaxed text-foreground">{SESSAO_TATICA_GRUPO.oQueE}</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{SESSAO_TATICA_GRUPO.problemaAtual}</p>
          </Section>

          <Section title="O que não é">
            <ul className="space-y-1.5">
              {SESSAO_TATICA_GRUPO.oQueNaoE.map((t, i) => (
                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
                  <span className="text-muted-foreground/40">—</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Como o tema é escolhido">
            <p className="text-[13px] text-muted-foreground leading-relaxed">{SESSAO_TATICA_GRUPO.comoOTemaEEscolhido}</p>
          </Section>

          <Section title="O formato da hora">
            <div className="divide-y divide-border/50">
              {SESSAO_TATICA_GRUPO.blocos.map((b) => (
                <ListRow key={b.numero}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {b.numero}. {b.titulo}
                    </p>
                    <span className="text-[11px] text-muted-foreground/60 shrink-0">{b.duracao}</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{b.descricao}</p>
                </ListRow>
              ))}
            </div>
          </Section>

          <Section title="O que sobra depois da sessão">
            <ul className="space-y-1.5">
              {SESSAO_TATICA_GRUPO.oQueSobraDepois.map((t, i) => (
                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
                  <span className="text-muted-foreground/40">—</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-muted-foreground leading-relaxed mt-3">{SESSAO_TATICA_GRUPO.comoSeConectaAoIndividual}</p>
          </Section>
        </div>
      )}
    </div>
  );
}
