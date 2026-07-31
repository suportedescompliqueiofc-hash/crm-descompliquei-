// Seção "Técnico" — 05-publicar-plano.md e 06-painel.md, condensado.
import { Section, ListRow } from '@/components/cs/ui';
import {
  SCHEMA_JORNADAS,
  REGRAS_DE_VISIBILIDADE,
  PROCEDIMENTO_DE_PUBLICACAO,
  QUERY_DE_ADERENCIA,
  LIMITES_DO_MODELO_DE_DADOS,
  PAINEL,
} from '@/content/cs';

export function TecnicoView() {
  return (
    // space-y-4 entre painéis — ver nota em FundamentosView.tsx.
    <div className="space-y-4">
      <Section title="Schema de jornadas" description="jornadas / jornada_estagios / jornada_passos / jornada_subtarefas — como o plano vira registro no CRM.">
        <div className="divide-y divide-border/50">
          {Object.entries(SCHEMA_JORNADAS).map(([tabela, campos]) => (
            <ListRow key={tabela}>
              <p className="text-sm font-semibold text-foreground font-mono">{tabela}</p>
              <ul className="mt-1.5 space-y-1">
                {campos.map((c, i) => (
                  <li key={i} className="text-[12.5px] text-muted-foreground leading-relaxed font-mono">
                    {c}
                  </li>
                ))}
              </ul>
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title="Regras de visibilidade">
        <p className="text-[13px] text-muted-foreground leading-relaxed">{REGRAS_DE_VISIBILIDADE.rascunhoInvisivel}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{REGRAS_DE_VISIBILIDADE.organizationIdSempre}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{REGRAS_DE_VISIBILIDADE.duasJornadasAtivas}</p>
      </Section>

      <Section title="Procedimento de publicação">
        <ol className="space-y-1.5">
          {PROCEDIMENTO_DE_PUBLICACAO.map((p, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed font-mono">
              {p}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Query de aderência">
        <p className="text-[13px] text-muted-foreground leading-relaxed">{QUERY_DE_ADERENCIA}</p>
      </Section>

      <Section title="Limites do modelo de dados hoje">
        <ul className="space-y-2">
          {LIMITES_DO_MODELO_DE_DADOS.map((l, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
              <span className="text-muted-foreground/40">—</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="O painel">
        <p className="text-[13px] text-muted-foreground leading-relaxed">{PAINEL.oQueE}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">
          <b className="text-foreground/80">Quando regenerar:</b> {PAINEL.quandoRegenerar}
        </p>
        <p className="text-[13px] text-amber-700 dark:text-amber-400 leading-relaxed mt-2">{PAINEL.comparecimentoFechamentoNoPainelAntigo}</p>
      </Section>
    </div>
  );
}
