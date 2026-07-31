// Um cliente da carteira — uma linha de fila, não uma linha de tabela.
// Redesign completo (2026-07-30): a versão anterior era uma grade de 4
// colunas (Cliente / Risco / Elo-restrição / Aderência) com um ponto
// colorido — exatamente a "cara de painel administrativo" que o CEO
// rejeitou. A base continua a mesma (nome, a situação em frases de
// narrativa.ts e o que fazer) — sem grid, sem cor de risco.
//
// Segunda passada (2026-07-31, conceito "Console"): a linha ganhou
// marcador e trilho. Densidade vem de painel/filete/chip/número, não de
// ícone — por isso o marcador é `RowIndex` (a posição na fila, já ordenada
// pelo banco em `ordem_fila`) em vez de um rótulo de status, e o número que
// ajuda a decidir (aderência ao plano do mês) vira `trailing`, ao lado,
// para bater o olho sem precisar ler a frase inteira. Nenhum dado novo:
// tudo aqui já vinha de `useCarteira()`/`useTarefas()`.
import { useNavigate } from 'react-router-dom';
import type { ClienteCarteira } from '@/hooks/cs';
import { formatPct } from '@/lib/format';
import { ListRow, RowIndex, Metric, Chip } from '@/components/cs/ui';
import { getEloInfo } from '../eloMeta';
import { construirSituacao, construirSinal } from './narrativa';

interface CarteiraRowProps {
  cliente: ClienteCarteira;
  /** Posição do cliente na lista renderizada (0-based) — vira o número da fila. */
  index: number;
  /**
   * Tarefas abertas com prazo vencido deste cliente — calculado pelo
   * chamador (Carteira.tsx) a partir de `useTarefas()`. Ver arquitetura-app-cs.md
   * seção D: "se o cliente não tem plano publicado no mês corrente, ou tem
   * tarefas atrasadas, isso vira uma segunda linha discreta".
   */
  tarefasAtrasadas?: number;
}

export function CarteiraRow({ cliente, index, tarefasAtrasadas = 0 }: CarteiraRowProps) {
  const navigate = useNavigate();
  const { frase, acao } = construirSituacao(cliente);
  const sinal = construirSinal(cliente, tarefasAtrasadas);

  // Mesma tradução comportamental usada no resumo da tela: a palavra
  // "crítico" nunca aparece, só o efeito dela (fio laranja + número laranja
  // na calha).
  const exigeAcaoAgora = cliente.nivel_risco === 'critico';

  // Chip de elo-restrição — vocabulário do método, cor petróleo (Chip
  // `tone="signal"`). Só aparece quando há um elo real eleito: os dois
  // valores especiais da RPC ("Adoção (Camada 0)" quando camada_0_ok é
  // falso, "Sem dado suficiente para simular") já viram frase própria em
  // narrativa.ts e não precisam de chip.
  const eloChip =
    cliente.camada_0_ok && cliente.elo_restricao && cliente.elo_restricao !== 'Sem dado suficiente para simular'
      ? getEloInfo(cliente.elo_restricao).label
      : null;

  return (
    <ListRow
      onClick={() => navigate(`/cliente/${cliente.organization_id}`)}
      flagged={exigeAcaoAgora}
      mark={<RowIndex n={index + 1} flagged={exigeAcaoAgora} />}
      trailing={
        <div className="flex flex-col items-end gap-1">
          <Metric
            size="sm"
            tone={cliente.aderencia_pct == null ? 'muted' : cliente.aderencia_pct < 30 ? 'accent' : 'muted'}
            value={cliente.aderencia_pct == null ? '—' : formatPct(cliente.aderencia_pct, 0)}
          />
          <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/45">aderência</span>
          {tarefasAtrasadas > 0 && (
            <Chip tone="accent" className="mt-0.5">
              {tarefasAtrasadas} {tarefasAtrasadas === 1 ? 'atrasada' : 'atrasadas'}
            </Chip>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        <p className="text-[13.5px] font-semibold font-display text-foreground truncate">{cliente.nome}</p>
        {eloChip && eloChip !== '—' && (
          <Chip tone="signal" className="shrink-0">
            {eloChip}
          </Chip>
        )}
      </div>
      <p className="text-[12.5px] text-muted-foreground leading-snug mt-1">{frase}</p>
      <p className="text-[12.5px] font-medium text-foreground mt-0.5">{acao}</p>
      {sinal && <p className="text-[11.5px] text-muted-foreground/65 mt-0.5">{sinal}</p>}
    </ListRow>
  );
}
