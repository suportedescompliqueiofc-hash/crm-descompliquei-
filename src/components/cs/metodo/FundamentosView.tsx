// Seção "Fundamentos" — 00-como-funciona.md, 01-a-cadeia.md, 02-diagnostico.md.
import { Section, ListRow, StatusIndicator } from '@/components/cs/ui';
import {
  O_QUE_E_O_SISTEMA,
  POR_QUE_EXISTE,
  PRINCIPIOS,
  TRES_RITUAIS,
  REGISTRAR_NAO_E_COMANDO,
  CAMADAS,
  ELOS,
  CRITERIO_DE_AGRUPAMENTO,
  CRITERIO_ELO_RESTRICAO,
  PASSOS_DO_DIAGNOSTICO,
  O_QUE_NUNCA_FAZER_NO_DIAGNOSTICO,
} from '@/content/cs';

export function FundamentosView() {
  return (
    // space-y-4: cada <Section> agora é um painel com moldura própria (ver
    // Section.tsx) — sem respiro entre eles, os painéis se tocam e voltam a
    // ler como bloco único. A regra do próprio primitivo é "empilhe com
    // space-y-4", nunca divide-y.
    <div className="space-y-4">
      <Section title="O sistema">
        <p className="text-sm leading-relaxed text-foreground">{O_QUE_E_O_SISTEMA}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{POR_QUE_EXISTE}</p>
      </Section>

      <Section title="Os princípios" description="Por que cada regra do método existe.">
        <div className="divide-y divide-border/50">
          {PRINCIPIOS.map((p) => (
            <ListRow key={p.id}>
              <p className="text-sm font-semibold text-foreground">
                {p.id} — {p.titulo}
              </p>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{p.texto}</p>
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title="Os três rituais" description="O que cada comando faz, e quando usar cada um.">
        <div className="divide-y divide-border/50">
          {TRES_RITUAIS.map((r) => (
            <ListRow key={r.comando}>
              <p className="text-sm font-semibold text-foreground font-display">{r.comando}</p>
              <p className="text-[13px] text-muted-foreground/80 font-medium">{r.nome}</p>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{r.descricao}</p>
            </ListRow>
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed pt-2">{REGISTRAR_NAO_E_COMANDO}</p>
      </Section>

      <Section
        title="A cadeia — 4 camadas, 8 elos"
        description="Critério de agrupamento: natureza do trabalho que move o elo, não a posição num funil."
      >
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{CRITERIO_DE_AGRUPAMENTO}</p>
        <div className="space-y-6">
          {CAMADAS.map((camada) => (
            <div key={camada.id}>
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Camada {camada.id} — {camada.nome}
                </p>
                {!camada.ehElo && <StatusIndicator tone="neutro" label="não é elo, é portão" />}
              </div>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{camada.oQueE}</p>
              {camada.observacao && (
                <p className="text-[13px] text-muted-foreground/80 mt-1 leading-relaxed">{camada.observacao}</p>
              )}
              {camada.elos.length > 0 && (
                <div className="mt-3 divide-y divide-border/50">
                  {ELOS.filter((e) => camada.elos.includes(e.id)).map((elo) => (
                    <ListRow key={elo.id}>
                      <p className="text-sm font-semibold text-foreground">{elo.nome}</p>
                      <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{elo.oQueE}</p>
                      <p className="text-[12px] text-muted-foreground/70 mt-1 font-mono">{elo.formula}</p>
                    </ListRow>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="O critério de elo-restrição" description="Não é o elo com a pior taxa — é o de maior ganho simulado.">
        <p className="text-sm leading-relaxed text-foreground">{CRITERIO_ELO_RESTRICAO.definicao}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{CRITERIO_ELO_RESTRICAO.metodo}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{CRITERIO_ELO_RESTRICAO.camada0EhPortao}</p>

        <div className="mt-4 rounded-lg border border-border/50 overflow-hidden">
          <div className="px-3 py-2 bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {CRITERIO_ELO_RESTRICAO.exemploIlustrativo.aviso}
          </div>
          <div className="divide-y divide-border/40">
            {CRITERIO_ELO_RESTRICAO.exemploIlustrativo.tabela.map(([label, valor]) => (
              <div key={label} className="flex items-center justify-between px-3 py-1.5 text-[13px]">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-display tabular-nums font-medium text-foreground">{valor}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-3">
          {CRITERIO_ELO_RESTRICAO.exemploIlustrativo.conclusao}
        </p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{CRITERIO_ELO_RESTRICAO.aritmeticaDoCiclo}</p>
      </Section>

      <Section title="O protocolo de diagnóstico" description="Passo a passo executável dentro de /cs-cliente ou /cs-mes.">
        <div className="divide-y divide-border/50">
          {PASSOS_DO_DIAGNOSTICO.map((p) => (
            <ListRow key={p.numero}>
              <p className="text-sm font-semibold text-foreground">
                {p.numero}. {p.titulo}
              </p>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{p.texto}</p>
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title="O que nunca fazer">
        <ul className="space-y-2">
          {O_QUE_NUNCA_FAZER_NO_DIAGNOSTICO.map((t, i) => (
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
