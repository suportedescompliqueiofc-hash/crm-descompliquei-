// Verifica se o usuário autenticado é da equipe interna da Descompliquei —
// independente do `perfis.organization_id` que ele está com o app aberto no
// momento (ele pode estar impersonando um cliente via "Acessar CRM" no CRM,
// numa aba diferente).
//
// Atalho rápido: se `useProfile().role` já resolveu 'superadmin' no client,
// libera sem ida ao servidor.
//
// Caminho robusto: chama as funções SECURITY DEFINER `is_super_admin()`
// (checa `usuarios_papeis`) e `is_admin()` (checa `platform_admins`) via
// `supabase.rpc(...)`. As duas leem `auth.uid()` direto — não filtram por
// `organization_id` — então continuam corretas mesmo com o perfil apontando
// para a organização de um cliente.
//
// Erro de rede/permissão vira `status: 'error'` ("não sei"), NUNCA
// `'denied'` ("não é autorizado") — foi exatamente essa confusão que
// escondeu o bug original em CsGuard.tsx.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

export type InternalAccessStatus = 'checking' | 'authorized' | 'denied' | 'error';

interface UseIsInternalUserResult {
  status: InternalAccessStatus;
  errorMessage: string | null;
  retry: () => void;
}

export function useIsInternalUser(): UseIsInternalUserResult {
  const { user, loading: authLoading } = useAuth();
  const { role, isLoading: profileLoading } = useProfile();
  const [status, setStatus] = useState<InternalAccessStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const retry = useCallback(() => {
    setErrorMessage(null);
    setStatus('checking');
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (!user) {
      setStatus('denied');
      return;
    }

    // Atalho rápido: role já resolvido como superadmin no client.
    if (role === 'superadmin') {
      setStatus('authorized');
      return;
    }

    let isActive = true;
    setStatus('checking');

    (async () => {
      const [superAdminRes, adminRes] = await Promise.all([
        supabase.rpc('is_super_admin'),
        supabase.rpc('is_admin'),
      ]);

      if (!isActive || !isMounted.current) return;

      const isInternal = superAdminRes.data === true || adminRes.data === true;

      if (isInternal) {
        setStatus('authorized');
        return;
      }

      // Só é seguro dizer "negado" se AMBAS as chamadas realmente
      // completaram sem erro e vieram false. Se alguma falhou (rede,
      // permissão), não sabemos a resposta real — trate como erro, não
      // como negado.
      const anyError = superAdminRes.error || adminRes.error;
      if (anyError) {
        setErrorMessage(
          superAdminRes.error?.message ||
            adminRes.error?.message ||
            'Não foi possível verificar seu acesso.',
        );
        setStatus('error');
        return;
      }

      setStatus('denied');
    })();

    return () => {
      isActive = false;
    };
  }, [user, authLoading, profileLoading, role, attempt]);

  return { status, errorMessage, retry };
}
