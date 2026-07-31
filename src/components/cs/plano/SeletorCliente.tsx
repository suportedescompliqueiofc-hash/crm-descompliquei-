// Seletor de cliente (troca o org da rota /plano/:orgId) + navegação de volta
// para a ficha dele. Redesign 2026-07-30: sem ícone, sem pill. Fonte de
// clientes: useCarteira() — nunca tabela de cliente direto.
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ClienteCarteira } from '@/hooks/cs';

interface SeletorClienteProps {
  clientes: ClienteCarteira[];
  orgId: string | undefined;
  isLoading: boolean;
}

export function SeletorCliente({ clientes, orgId, isLoading }: SeletorClienteProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <Select
        value={orgId ?? undefined}
        onValueChange={(value) => navigate(`/plano/${value}`)}
        disabled={isLoading || clientes.length === 0}
      >
        <SelectTrigger className="h-10 text-sm rounded-lg border-border/60 w-full sm:w-[280px]">
          <SelectValue placeholder={isLoading ? 'Carregando clientes…' : 'Selecione um cliente'} />
        </SelectTrigger>
        <SelectContent>
          {clientes.map((c) => (
            <SelectItem key={c.organization_id} value={c.organization_id}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {orgId && (
        <button
          type="button"
          onClick={() => navigate(`/cliente/${orgId}`)}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 hover:no-underline w-fit"
        >
          Voltar para a ficha do cliente
        </button>
      )}
    </div>
  );
}
