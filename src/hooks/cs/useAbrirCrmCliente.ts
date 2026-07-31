// Abre a plataforma/CRM de um cliente em NOVA ABA, com a organização dele já
// ativa — pedido do CEO em 2026-07-31: "eu tô no cliente e já conseguiria
// ver, clicando no botão, a plataforma do cliente já com login dele... para
// ter uma análise muito mais assertiva". Crítico: a aba do console de CS não
// pode fechar nem recarregar — as duas ficam abertas lado a lado.
//
// Reaproveita a MESMA sequência de impersonação do Super Admin
// (`handleImpersonate`) e do "Sair do Cliente"
// (`src/components/layout/SidebarContent.tsx`, `handleBackToMaster`) — ver
// CLAUDE.md, seção "Impersonation (Acessar CRM)". A troca de organização é um
// UPDATE em `perfis.organization_id`: estado GLOBAL do usuário, não da aba.
//
// ── Permissão (revisto em 2026-07-31) ────────────────────────────────────
// Este hook NÃO checa mais se a org ativa do perfil é a MASTER_ORG_ID antes
// de trocar. A permissão de quem pode abrir o CRM do cliente já é garantida
// ANTES de qualquer tela do console renderizar — é o `CsGuard`
// (`useIsInternalUser`, is_super_admin()/is_admin()), que barra quem não é
// da equipe interna sem depender de qual organização está ativa no perfil.
// Exigir MASTER_ORG_ID aqui era o bug: assim que o primeiro clique trocava
// a org ativa para a do cliente A, o botão sumia da ficha de TODOS os
// outros clientes — o CEO não conseguia ir direto de A para B. Ver
// `ClienteResumo.tsx` para a mesma troca de regra na visibilidade do botão.
// É seguro afrouxar porque: (1) quem chega até aqui já passou pelo CsGuard;
// (2) a restauração para a org master (`original_master_org_id` abaixo, e
// "Devolver à org master" no `CsLayout`) usa MASTER_ORG_ID **hardcoded**,
// nunca a organização do cliente anterior — trocar de A para B não corrompe
// o caminho de volta. A regra antiga (só a partir da master) existe no app
// do CLIENTE para impedir que um admin de clínica impersone outro cliente;
// esse cenário não existe aqui, quem usa este console já é interno.
//
// Sequência (a ordem importa, e os dois primeiros passos são contraintuitivos):
//   1. Abre a aba VAZIA imediatamente, ainda dentro do clique.
//   2. Relê `perfis.organization_id` (não confia em cache) — só para saber
//      se a org alvo JÁ é a ativa (evita um UPDATE desnecessário), não para
//      autorizar.
//   3. Grava `original_master_org_id` no localStorage (sempre MASTER_ORG_ID
//      hardcoded, nunca lido do perfil — mesmo trocando de cliente A para
//      cliente B, o caminho de volta continua sendo a master).
//   4. Se a org ativa já é a org alvo, pula o UPDATE. Senão, UPDATE
//      `perfis.organization_id` = org do cliente (troca direta, mesmo se a
//      org ativa hoje já for a de outro cliente).
//   5. Invalida `['profile', user.id]` — sem isso o aviso de impersonação do
//      CsLayout só apareceria num refetch natural, já que o console roda com
//      `refetchOnWindowFocus: false`.
//   6. Aponta a aba já aberta para o CRM. Se qualquer passo falhar, a aba é
//      FECHADA — aba aberta na organização errada é pior que aba nenhuma.
//
// ── Por que abrir a aba ANTES de tudo (passo 1) ──────────────────────────
// `window.open` chamado depois de um `await` perde o gesto do usuário e o
// navegador bloqueia como pop-up. Abrindo em branco no clique e só depois
// trocando o `location`, o gesto é preservado e nada é bloqueado.
//
// ── Por que NÃO passar 'noopener' ────────────────────────────────────────
// Com a feature `noopener`, `window.open` retorna `null` POR ESPECIFICAÇÃO —
// perderíamos a referência da aba (e uma checagem `if (!win)` acusaria
// "bloqueado" mesmo quando a aba abriu). Zeramos `win.opener` logo depois,
// que dá a mesma proteção sem perder o handle.
//
// ── localStorage entre domínios (produção) ───────────────────────────────
// Em produção o console vive em `cs.descompliqueiofc.com` e a plataforma em
// `plataforma.descompliqueiofc.com` — origens diferentes, logo o
// `original_master_org_id` gravado aqui NÃO existe lá. Isso é inofensivo,
// e foi verificado no código: `SidebarContent.tsx` mostra o botão de voltar
// tanto por `isImpersonating` (tem a chave) quanto por `isStuckOutsideMaster`
// (não tem a chave, mas a org do perfil não é a master) — e o
// `handleBackToMaster` restaura para `MASTER_ORG_ID` hardcoded, ignorando o
// localStorage. A gravação é mantida porque em DEV as duas entradas rodam no
// mesmo host e ali a chave é lida de verdade.
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MASTER_ORG_ID } from '@/lib/constants';

/**
 * Domínio da plataforma do cliente em produção. Confirmado no repositório
 * (é o mesmo usado pelas edge functions em links enviados a clientes).
 * `VITE_PLATFORM_URL` sobrescreve, para o caso de o domínio mudar sem que
 * este arquivo seja tocado.
 */
const PLATAFORMA_URL_PADRAO = 'https://plataforma.descompliqueiofc.com';

function ehLocalhost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/**
 * Base da plataforma do cliente.
 *
 * Em desenvolvimento, as duas entradas Vite são servidas pelo MESMO host, então
 * a origem atual já é a plataforma. Em produção, o rewrite do `vercel.json`
 * manda **todo** caminho de `cs.descompliqueiofc.com` para `index-cs.html` —
 * ou seja, `cs.../crm` serve o console de novo, nunca o CRM. Por isso lá o
 * destino tem de ser um domínio explícito, e não `window.location.origin`.
 */
function resolverBasePlataforma(): string {
  const envUrl = (import.meta.env.VITE_PLATFORM_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  if (ehLocalhost(window.location.hostname)) return window.location.origin;
  return PLATAFORMA_URL_PADRAO;
}

interface UseAbrirCrmClienteResult {
  /** Troca a organização ativa e abre o CRM do cliente em nova aba. */
  abrir: (targetOrgId: string) => Promise<void>;
  /** true enquanto a troca de organização está em curso. */
  abrindo: boolean;
}

export function useAbrirCrmCliente(): UseAbrirCrmClienteResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [abrindo, setAbrindo] = useState(false);

  const abrir = useCallback(
    async (targetOrgId: string) => {
      if (!user) {
        toast.error('Sessão não identificada — recarregue a página e tente de novo.');
        return;
      }

      // Passo 1: a aba nasce aqui, dentro do gesto do clique (ver cabeçalho).
      const aba = window.open('', '_blank');
      if (!aba) {
        toast.error('O navegador bloqueou a nova aba.', {
          description: 'Libere pop-ups para este site e clique de novo. Nada foi alterado.',
        });
        return;
      }
      try {
        aba.opener = null;
      } catch {
        // Alguns navegadores não deixam escrever em `opener`; seguir é seguro.
      }

      setAbrindo(true);
      try {
        const { data: myProfile, error: profileError } = await supabase
          .from('perfis')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;

        // Sempre hardcoded — mesmo indo de um cliente já impersonado (A)
        // direto para outro (B), o caminho de volta continua sendo a master.
        localStorage.setItem('original_master_org_id', MASTER_ORG_ID);

        // Só faz o UPDATE se a org ativa ainda não for a do alvo — troca de
        // A para B é uma troca de verdade, mas reabrir o mesmo cliente não
        // precisa gravar nada de novo.
        if (myProfile?.organization_id !== targetOrgId) {
          const { error: updateError } = await supabase
            .from('perfis')
            .update({ organization_id: targetOrgId as any })
            .eq('id', user.id);
          if (updateError) throw updateError;

          queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
        }

        aba.location.replace(`${resolverBasePlataforma()}/crm`);
        toast.success('CRM deste cliente aberto em outra aba.', {
          description: 'Ao terminar, use "Devolver à org master" no topo do console.',
        });
      } catch (err: any) {
        aba.close();
        toast.error('Falha ao abrir o CRM do cliente', {
          description: err?.message || 'Erro desconhecido.',
        });
      } finally {
        setAbrindo(false);
      }
    },
    [user, queryClient],
  );

  return { abrir, abrindo };
}
