import type { AcessoProduto } from '@/contexts/PlataformaContext';

export function getRedirectDestino(acesso: AcessoProduto | null): string {
  if (!acesso) return '/plataforma';

  const somenteCRM =
    acesso.acesso_crm === true &&
    acesso.acesso_cerebro === false &&
    acesso.acesso_sessoes_taticas === false &&
    acesso.acesso_materiais === false &&
    acesso.acesso_ia_comercial === false &&
    (!acesso.pilares_liberados || acesso.pilares_liberados.length === 0) &&
    (!acesso.ias_liberadas || acesso.ias_liberadas.length === 0);

  if (somenteCRM) return '/crm';
  return '/plataforma';
}
