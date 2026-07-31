// Um cliente da carteira — um bloco de texto, não uma linha de tabela.
// Redesign completo (2026-07-30): a versão anterior era uma grade de 4
// colunas (Cliente / Risco / Elo-restrição / Aderência) com um ponto
// colorido — exatamente a "cara de painel administrativo" que o CEO
// rejeitou. Agora: nome, a situação em frases (narrativa.ts) e o que fazer.
// Sem grid, sem StatusIndicator, sem cor de risco.
import { useNavigate } from 'react-router-dom';
import type { ClienteCarteira } from '@/hooks/cs';
import { ListRow } from '@/components/cs/ui';
import { construirSituacao } from './narrativa';

export function CarteiraRow({ cliente }: { cliente: ClienteCarteira }) {
  const navigate = useNavigate();
  const { frase, acao } = construirSituacao(cliente);

  return (
    <ListRow onClick={() => navigate(`/cliente/${cliente.organization_id}`)}>
      <div className="space-y-1.5 max-w-[680px]">
        <p className="text-[15px] font-semibold font-display text-foreground">{cliente.nome}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{frase}</p>
        <p className="text-sm font-medium text-foreground">{acao}</p>
      </div>
    </ListRow>
  );
}
