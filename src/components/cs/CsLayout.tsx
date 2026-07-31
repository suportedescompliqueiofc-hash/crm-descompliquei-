// Casca do console de CS — cromo grafite no topo + canvas de trabalho.
//
// O canvas (`bg-background`, areia quente pelo cs-theme.css) não é
// decoração: é o que permite que exista PAINEL. Painel branco sobre página
// branca não é painel, é parágrafo com borda — e foi por isso que a versão
// anterior deste app lia como documento. A cor do fundo é, literalmente, a
// decisão que faz a interface parecer software.
//
// Largura: 1200px. A versão anterior usava coluna de leitura de 760px, que é
// medida de texto, não de sistema — com 760px não cabe ficha em duas colunas
// e todo bloco vira uma pilha vertical infinita. As telas definem o próprio
// grid dentro desta largura; nenhuma delas volta a fixar `max-w` própria.
//
// Mantida a decisão de NÃO forçar `perfis.organization_id` para a org master
// automaticamente ao carregar (o AdminLayout do app do cliente faz isso; aqui
// seria arrancar a org do João de baixo de outra aba aberta). O aviso de
// impersonação segue informativo por padrão — mas agora (2026-07-31, botão
// "Abrir CRM do cliente" na Ficha) ele ganhou uma ação explícita para devolver
// o perfil à org master: sem isso, fechar a aba do CRM deixa o perfil preso
// na org do cliente, e o único jeito de sair seria voltar ao Super Admin.
// Mesma restauração que "Sair do Cliente" faz em
// src/components/layout/SidebarContent.tsx (handleBackToMaster) — reescrita
// aqui em vez de importada de lá porque aquele componente pertence ao bundle
// do app do cliente (outros providers, outro ponto de entrada — ver
// App-cs.tsx) e não pode ser puxado para dentro do bundle do CS.
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CsTopNav } from './CsSidebar';
import CsErrorBoundary from './CsErrorBoundary';
import { Action } from './ui';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MASTER_ORG_ID } from '@/lib/constants';

export default function CsLayout() {
  const { profile, isLoading: profileLoading } = useProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [restaurando, setRestaurando] = useState(false);

  const showImpersonationNotice =
    !profileLoading && !!profile?.organization_id && profile.organization_id !== MASTER_ORG_ID;

  const handleRestaurarOrgMaster = async () => {
    if (!user) return;
    setRestaurando(true);
    try {
      const { error } = await supabase
        .from('perfis')
        .update({ organization_id: MASTER_ORG_ID as any })
        .eq('id', user.id);
      if (error) throw error;
      localStorage.removeItem('original_master_org_id');
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      toast.success('Perfil devolvido à organização master.');
    } catch (err: any) {
      toast.error('Falha ao devolver o perfil à organização master', {
        description: err?.message || 'Erro desconhecido.',
      });
    } finally {
      setRestaurando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CsTopNav />

      {showImpersonationNotice && (
        <div className="border-b border-border bg-[hsl(var(--cs-accent-soft))]">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-2 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="h-[6px] w-[6px] rounded-[2px] bg-[hsl(var(--cs-accent))] shrink-0" />
              <p className="text-[11.5px] text-foreground/70">
                Há uma organização de cliente aberta na plataforma (impersonação ativa noutra aba).
              </p>
            </div>
            <Action size="sm" onClick={handleRestaurarOrgMaster} disabled={restaurando}>
              {restaurando ? 'Restaurando…' : 'Devolver à org master'}
            </Action>
          </div>
        </div>
      )}

      {/* A barreira envolve só o conteúdo: se uma tela quebrar, o cromo do
          topo continua de pé e dá para ir a outro cliente sem recarregar.
          `resetKey` na rota rearma a barreira ao navegar — sem isso, a área
          de conteúdo ficaria travada no erro da tela anterior. */}
      <main className="flex-1 px-5 sm:px-8 py-7">
        <div className="max-w-[1200px] mx-auto">
          <CsErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </CsErrorBoundary>
        </div>
      </main>
    </div>
  );
}
