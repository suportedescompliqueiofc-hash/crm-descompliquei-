// Tela de login do app de CS (cs.descompliqueiofc.com) — a ÚNICA tela do
// console sem a casca (CsLayout/CsTopNav): não há sessão ainda, então ela
// precisa carregar a identidade sozinha, sem depender de nada montado fora
// dela.
//
// Redesign 2026-07-31 (design "Console"): a versão anterior espelhava
// `PlataformaLogin.tsx` (o login DO CLIENTE) — painel escuro com glow laranja
// desfocado, grade de fundo, ícone `HeartHandshake` em pílula. Isso é
// exatamente o vocabulário da PLATAFORMA client-facing que o conceito do
// console proíbe (zero gradiente, zero glow, zero ícone — ver
// src/styles/cs-theme.css). A tradução para o console: fundo grafite
// (`--cs-ink`, o MESMO tom da barra de topo das telas internas) com um único
// <Panel> branco centralizado — a marca é texto puro (ponto laranja +
// "Descompliquei" + "CS"), idêntica à de CsSidebar.tsx, para que a tela de
// entrada já pareça a mesma aplicação que vem depois do login.
//
// Navegação para dentro do app (usuário já logado / login bem-sucedido) usa
// SEMPRE `useNavigate()` do router, nunca `window.location.href` — hard nav
// sai do bundle do CS e, em dev, cai no `index.html` padrão (app do
// cliente) em vez de continuar no bundle de `/index-cs.html`. Verificado
// nesta rodada: o arquivo já respeitava a regra (nenhum `window.location.href`
// encontrado) — mantida.
import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Panel, PanelBody, Action } from '@/components/cs/ui';

export default function CsLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // Já autenticado (sessão desta origem) — segue para a Carteira.
  // CsGuard decide se a conta tem acesso interno.
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-password-reset-public', {
        body: { email: forgotEmail },
      });
      if (error) throw error;
      setForgotSent(true);
    } catch {
      toast.error('Não foi possível enviar o e-mail. Tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        const msg = error.message?.includes('fetch')
          ? 'Servidor indisponível. Tente novamente em alguns segundos.'
          : (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials'))
            ? 'E-mail ou senha incorretos.'
            : error.message || 'E-mail ou senha incorretos.';
        toast.error(msg, { closeButton: true });
      } else {
        // signIn() do AuthContext compartilhado (useNavigate do MESMO
        // BrowserRouter deste bundle, ver App-cs.tsx) já navega para '/crm'
        // internamente. '/crm' não existe nas rotas do CS, então cairia na
        // wildcard (`path="*"`) e seria redirecionado para '/' de qualquer
        // forma — chamamos aqui explicitamente para não depender desse
        // hop e para garantir replace (sem entrada extra no histórico).
        // NUNCA usar window.location.href aqui — hard nav sai do bundle do
        // CS (ver comentário no topo do arquivo e em CsGuard.tsx).
        navigate('/', { replace: true });
      }
    } catch {
      toast.error('Não foi possível conectar ao servidor. Verifique sua conexão.', { closeButton: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--cs-ink))] px-4 py-12">
      <div className="w-full max-w-[380px]">
        {/* Marca — texto puro, idêntica à de CsSidebar.tsx (ponto laranja +
            "Descompliquei" + "CS"), para que login e app pareçam o mesmo
            sistema desde o primeiro pixel. */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <span className="h-[7px] w-[7px] rounded-[2px] bg-[hsl(var(--cs-accent))] shrink-0" />
          <span className="text-[13px] font-bold font-display tracking-[-0.01em] text-white/95">Descompliquei</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 pt-px">CS</span>
        </div>

        <Panel>
          <PanelBody className="px-7 py-7">
            {isForgotMode ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(false);
                    setForgotSent(false);
                    setForgotEmail('');
                  }}
                  className="text-[11.5px] font-medium text-muted-foreground/60 hover:text-foreground transition-colors mb-6"
                >
                  ‹ Voltar ao login
                </button>

                {forgotSent ? (
                  <div className="text-center py-2">
                    <p className="text-[19px] font-bold tracking-tight text-foreground font-display mb-2">
                      Verifique seu e-mail
                    </p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      Se o endereço <span className="font-medium text-foreground">{forgotEmail}</span> estiver
                      cadastrado, você receberá um link para redefinir sua senha em instantes.
                    </p>
                    <p className="text-[11.5px] text-muted-foreground/60 mt-4">Não recebeu? Verifique a pasta de spam.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60 mb-1.5">
                        Recuperar acesso
                      </p>
                      <h1 className="text-[20px] font-bold tracking-tight text-foreground font-display leading-tight">
                        Esqueceu a senha?
                      </h1>
                      <p className="text-[13px] text-muted-foreground mt-1.5">
                        Digite seu e-mail e enviaremos um link de redefinição.
                      </p>
                    </div>

                    <form onSubmit={handleForgotSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="forgot-email" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          E-mail
                        </Label>
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="seu.email@descompliquei.com"
                          className="h-10 text-sm rounded-lg border-border"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>

                      <Action type="submit" variant="accent" size="md" className="w-full" disabled={forgotLoading}>
                        {forgotLoading ? 'Enviando…' : 'Enviar link de redefinição'}
                      </Action>
                    </form>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60 mb-1.5">
                    Área interna
                  </p>
                  <h1 className="text-[20px] font-bold tracking-tight text-foreground font-display leading-tight">
                    Acesse o CS
                  </h1>
                  <p className="text-[13px] text-muted-foreground mt-1.5">Restrito à equipe da Descompliquei</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.email@descompliquei.com"
                      className="h-10 text-sm rounded-lg border-border"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Senha
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] font-medium text-muted-foreground/60 hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? 'ocultar' : 'mostrar'}
                      </button>
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      className="h-10 text-sm rounded-lg border-border"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <div className="flex justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotMode(true);
                          setForgotEmail(email);
                        }}
                        className="text-[11.5px] text-muted-foreground/60 hover:text-foreground transition-colors"
                      >
                        Esqueci a senha
                      </button>
                    </div>
                  </div>

                  <Action type="submit" variant="accent" size="md" className="w-full" disabled={loading}>
                    {loading ? 'Entrando…' : 'Entrar'}
                  </Action>
                </form>

                <p className="text-center text-[11px] text-muted-foreground/50 mt-6 pt-5 border-t border-border/70">
                  Acesso restrito à equipe interna da Descompliquei.
                </p>
              </>
            )}
          </PanelBody>
        </Panel>

        <p className="text-center text-[11px] text-white/25 mt-6">
          &copy; {new Date().getFullYear()} Descompliquei — Uso interno
        </p>
      </div>
    </div>
  );
}
