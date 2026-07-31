// O que foi prometido na venda — segunda peça do dossiê, logo depois de
// "quem é o cliente". Hoje `promessa_venda` está vazio nos 7 clientes (ver
// 05-operacoes-e-cs/CLAUDE.md, pendência b) — a tela precisa mostrar isso
// como lacuna explícita e importante, não esconder um campo vazio.
import type { ClienteContexto } from '@/hooks/cs';
import { Section } from '@/components/cs/ui';

interface ContextoNegocioProps {
  contexto: ClienteContexto | null | undefined;
  isLoading: boolean;
}

export function ContextoNegocio({ contexto, isLoading }: ContextoNegocioProps) {
  if (isLoading) {
    return (
      <Section title="O que foi prometido na venda">
        <p className="text-sm text-muted-foreground/50 animate-pulse">Carregando…</p>
      </Section>
    );
  }

  const fatos: string[] = [];
  if (contexto?.quem_atende) fatos.push(`quem atende: ${contexto.quem_atende}`);
  if (contexto?.quem_vende) fatos.push(`quem vende: ${contexto.quem_vende}`);
  if (contexto?.tem_equipe) fatos.push(`equipe: ${contexto.tem_equipe}`);
  if (contexto?.convenio_particular) fatos.push(`modelo: ${contexto.convenio_particular}`);

  return (
    <Section title="O que foi prometido na venda">
      {contexto?.promessa_venda ? (
        <p className="text-sm text-foreground leading-relaxed max-w-[620px]">{contexto.promessa_venda}</p>
      ) : (
        <p className="text-sm text-foreground leading-relaxed max-w-[620px]">
          Não temos registrado o que foi prometido a este cliente na venda. É uma lacuna real — sem isso não dá pra
          checar se o que estamos entregando bate com o que foi vendido.
        </p>
      )}

      {fatos.length > 0 && (
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2 max-w-[620px]">
          {fatos.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join(' · ')}.
        </p>
      )}

      {contexto?.restricoes_conhecidas && (
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2 max-w-[620px]">
          Restrições conhecidas: {contexto.restricoes_conhecidas}
        </p>
      )}
    </Section>
  );
}
