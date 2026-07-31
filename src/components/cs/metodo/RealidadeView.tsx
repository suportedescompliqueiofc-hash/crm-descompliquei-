// Seção "A realidade da operação" — o-que-a-plataforma-ja-faz.md,
// quem-atende-o-lead.md, comparecimento-e-fechamento.md.
import { Section, ListRow } from '@/components/cs/ui';
import {
  AMOSTRA_DATADA_AVISO,
  IA_PRE_ATENDIMENTO,
  FOLLOW_UP_AUTOMATICO,
  CONFIRMACAO_E_LEMBRETE,
  FUNIL_KANBAN,
  REGISTRO_VENDA_DESFECHO,
  METAS,
  NOTAS_PAGINAS,
  OUTRAS_AUTOMACOES_ENCONTRADAS,
  NUNCA_DECLARAR_ACAO_QUE_JA_EXISTE,
  TRABALHO_HUMANO_LEGITIMO,
  COMPARECIMENTO_E_FECHAMENTO,
  QUEM_ATENDE_O_LEAD,
} from '@/content/cs';

export function RealidadeView() {
  return (
    <div>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3.5 py-2.5">
        <p className="text-[12.5px] text-amber-800 dark:text-amber-400 leading-relaxed">{AMOSTRA_DATADA_AVISO}</p>
      </div>

      <Section title="O que a plataforma já faz sozinha" description="Nenhum plano pode mandar o cliente fazer à mão o que a plataforma já faz.">
        <div className="divide-y divide-border/50">
          <ListRow>
            <p className="text-sm font-semibold text-foreground">{IA_PRE_ATENDIMENTO.nome}</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{IA_PRE_ATENDIMENTO.oQueE}</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed italic">{IA_PRE_ATENDIMENTO.limiteDuro}</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{IA_PRE_ATENDIMENTO.quandoEntra}</p>
          </ListRow>
          <ListRow>
            <p className="text-sm font-semibold text-foreground">{FOLLOW_UP_AUTOMATICO.nome}</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{FOLLOW_UP_AUTOMATICO.comoFunciona}</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{FOLLOW_UP_AUTOMATICO.distintoDeCadencias}</p>
          </ListRow>
          <ListRow>
            <p className="text-sm font-semibold text-foreground">Confirmação e lembrete de consulta</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{CONFIRMACAO_E_LEMBRETE.confirmacaoImediata}</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{CONFIRMACAO_E_LEMBRETE.lembretes}</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed font-medium">{CONFIRMACAO_E_LEMBRETE.oQueNaoExiste}</p>
          </ListRow>
          <ListRow>
            <p className="text-sm font-semibold text-foreground">Funil / Kanban</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{FUNIL_KANBAN.texto}</p>
          </ListRow>
          <ListRow>
            <p className="text-sm font-semibold text-foreground">Registro de venda e desfecho de consulta</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{REGISTRO_VENDA_DESFECHO.venda}</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{REGISTRO_VENDA_DESFECHO.desfechoDeConsulta}</p>
          </ListRow>
          <ListRow>
            <p className="text-sm font-semibold text-foreground">Metas</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed"><b className="text-foreground/80">Automático:</b> {METAS.automatico}</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed"><b className="text-foreground/80">Manual:</b> {METAS.manual}</p>
          </ListRow>
          <ListRow>
            <p className="text-sm font-semibold text-foreground">Notas / Páginas</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{NOTAS_PAGINAS.oQueSao}</p>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{NOTAS_PAGINAS.formatacaoSuportada}</p>
          </ListRow>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60 mt-5">Outras automações encontradas</p>
        <ul className="mt-1 space-y-1.5">
          {OUTRAS_AUTOMACOES_ENCONTRADAS.map((t, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
              <span className="text-muted-foreground/40">—</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="O que o cliente nunca deve receber como tarefa">
        <div className="divide-y divide-border/50">
          {NUNCA_DECLARAR_ACAO_QUE_JA_EXISTE.map((e, i) => (
            <div key={i} className="py-2.5">
              <p className="text-[13px] text-red-700 dark:text-red-400 leading-relaxed">Errado: {e.errado}</p>
              <p className="text-[13px] text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">Certo: {e.certo}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="O que a plataforma NÃO faz — trabalho humano legítimo">
        <ul className="space-y-1.5">
          {TRABALHO_HUMANO_LEGITIMO.map((t, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
              <span className="text-muted-foreground/40">—</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Comparecimento e Fechamento — o dado existe" description="Investigação de 2026-07-30 — substitui a limitação registrada em versões anteriores do sistema.">
        <p className="text-sm leading-relaxed text-foreground">{COMPARECIMENTO_E_FECHAMENTO.veredito}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2"><b className="text-foreground/80">Comparecimento mora em:</b> {COMPARECIMENTO_E_FECHAMENTO.comparecimentoMoraEm}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-1"><b className="text-foreground/80">Fechamento mora em:</b> {COMPARECIMENTO_E_FECHAMENTO.fechamentoMoraEm}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{COMPARECIMENTO_E_FECHAMENTO.colunaMorta}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2 font-medium">{COMPARECIMENTO_E_FECHAMENTO.problemaRealEAdocaoNaoSchema}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{COMPARECIMENTO_E_FECHAMENTO.vendaAgendamentoIdQuaseSempreNulo}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{COMPARECIMENTO_E_FECHAMENTO.acaoDeOnboardingDerivada}</p>
      </Section>

      <Section title="Quem atende o lead, de fato" description="Investigação sobre mensagens.remetente — 2026-07-30.">
        <p className="text-sm leading-relaxed text-foreground">{QUEM_ATENDE_O_LEAD.veredito}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{QUEM_ATENDE_O_LEAD.achadoCentral}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2 font-medium">{QUEM_ATENDE_O_LEAD.implicacaoParaOCS}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{QUEM_ATENDE_O_LEAD.acaoDeOnboarding}</p>
      </Section>
    </div>
  );
}
