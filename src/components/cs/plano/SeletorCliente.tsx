// Seletor de cliente (troca o org da rota /plano/:orgId) + navegação de volta
// para a ficha dele (/cliente/:orgId). Fonte de clientes: useCarteira() — nunca
// tabela de cliente direto.
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
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
      <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[280px]">
        <span className="p-1.5 rounded-lg bg-muted shrink-0">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
        <Select
          value={orgId ?? undefined}
          onValueChange={(value) => navigate(`/plano/${value}`)}
          disabled={isLoading || clientes.length === 0}
        >
          <SelectTrigger className="h-10 text-sm rounded-lg border-border/60">
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
      </div>

      {orgId && (
        <button
          type="button"
          onClick={() => navigate(`/cliente/${orgId}`)}
          className="h-9 w-fit inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a ficha do cliente
        </button>
      )}
    </div>
  );
}
