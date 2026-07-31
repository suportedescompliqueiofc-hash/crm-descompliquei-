// Segundo ponto de entrada do app — CS (cs.descompliqueiofc.com).
// Árvore de providers enxuta, deliberadamente menor que src/App.tsx:
// QueryClientProvider + TooltipProvider + BrowserRouter + AuthProvider + Toaster (sonner).
//
// NÃO inclui PlataformaProvider / BrandingProvider / TutorialProvider /
// AthosOSProvider / DashboardLeadsModalProvider — são do app do cliente
// (entitlements de produto, branding por org, tutorial interativo, chat do
// Athos, modal de leads do Dashboard) e só inflariam o bundle do CS sem uso.
// Qualquer componente reaproveitado de src/pages ou src/components que
// dependa de algum desses contexts vai quebrar aqui — se isso acontecer,
// é sinal de que o componente não devia ter sido reaproveitado tal como
// está (relatar, não arrastar o provider inteiro para consertar).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';

import CsGuard from '@/components/cs/CsGuard';
import CsLayout from '@/components/cs/CsLayout';
import CsLogin from '@/pages/cs/CsLogin';
import Carteira from '@/pages/cs/Carteira';
import ClienteDetalhe from '@/pages/cs/ClienteDetalhe';
import Semana from '@/pages/cs/Semana';
import Agenda from '@/pages/cs/Agenda';
import PlanoCliente from '@/pages/cs/PlanoCliente';
import Metodo from '@/pages/cs/Metodo'; // TEMP — só para medir o tamanho do bundle nesta entrega, revertido em seguida

// Mesmas opções de cache do App.tsx (staleTime 5min, sem refetch no foco) —
// instância própria, não compartilhada entre os dois bundles.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppCs = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<CsLogin />} />

            <Route element={<CsGuard />}>
              <Route element={<CsLayout />}>
                <Route path="/" element={<Carteira />} />
                <Route path="/cliente/:orgId" element={<ClienteDetalhe />} />
                <Route path="/semana" element={<Semana />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/plano/:orgId" element={<PlanoCliente />} />
                <Route path="/metodo" element={<Metodo />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default AppCs;
