// Um cliente da carteira — um bloco de texto, não uma linha de tabela.
// Redesign completo (2026-07-30): a versão anterior era uma grade de 4
// colunas (Cliente / Risco / Elo-restrição / Aderência) com um ponto
// colorido — exatamente a "cara de painel administrativo" que o CEO
// rejeitou. Agora: nome, a situação em frases (narrativa.ts) e o que fazer.
// Sem grid, sem StatusIndicator, sem cor de risco.
import { useNavigate } from 'react-router-dom';
import type { ClienteCarteira } from '@/hooks/cs';
import { ListRow } from '@/components/cs/ui';
import { construirSituacao, construirSinal } from './narrativa';

interface CarteiraRowProps {
  cliente: ClienteCarteira;
  /**
   * Tarefas abertas com prazo vencido deste cliente — calculado pelo
   * chamador (Carteira.tsx) a partir de `useTarefas()`. Ver arquitetura-app-cs.md
   * seção D: "se o cliente não tem plano publicado no mês corrente, ou tem
   * tarefas atrasadas, isso vira uma segunda linha discreta".
   */
  tarefasAtrasadas?: number;
}

export function CarteiraRow({ cliente, tarefasAtrasadas = 0 }: CarteiraRowProps) {
  const navigate = useNavigate();
  const { frase, acao } = construirSituacao(cliente);
  const sinal = construirSinal(cliente, tarefasAtrasadas);

  return (
    <ListRow onClick={() => navigate(`/cliente/${cliente.organization_id}`)}>
      <div className="space-y-1.5 max-w-[680px]">
        <p className="text-[15px] font-semibold font-display text-foreground">{cliente.nome}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{frase}</p>
        <p className="text-sm font-medium text-foreground">{acao}</p>
        {sinal && <p className="text-[13px] text-muted-foreground/70">{sinal}</p>}
      </div>
    </ListRow>
  );
}
