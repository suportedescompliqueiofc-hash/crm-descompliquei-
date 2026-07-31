// Barreira de erro do console de CS.
//
// Por que existe: em 2026-07-31 a ficha da Dra. Tayane abriu em TELA BRANCA.
// A causa era um detalhe minúsculo — um campo de data que o banco devolve como
// `date` e a tela tratava como 'YYYY-MM' — mas o efeito foi máximo: sem
// barreira, uma exceção em qualquer nó desmonta a árvore React inteira e o
// usuário fica com uma página em branco, sem nem saber em que cliente estava.
//
// A regra que fica: num sistema que o João usa sozinho, todo dia, para decidir
// o que fazer com clientes reais, **falha de um bloco não pode custar a tela
// toda**. A barreira envolve só a área de conteúdo — a barra de topo continua
// de pé, então dá para navegar para outro cliente sem recarregar nada.
//
// Ela NÃO substitui tratamento de erro de dado: erro de rede/RPC continua
// sendo `ErrorState` dentro do bloco que falhou (o hook sabe o que deu errado
// e sabe repetir). Esta barreira é a rede embaixo — para o que ninguém previu.
//
// `resetKey`: quando muda (a rota, tipicamente), a barreira se rearma. Sem
// isso, um erro numa ficha deixaria a área de conteúdo travada no estado de
// erro mesmo depois de navegar para outro cliente.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Panel, PanelBody, PanelHeader, Action, Evidence } from './ui';

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  erro: Error | null;
}

export default class CsErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // Mantém o rastro no console do navegador: a mensagem na tela é para o
    // João decidir o que fazer agora; a pilha é para consertar depois.
    console.error('[CS] Falha ao renderizar a tela:', erro, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.erro && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ erro: null });
    }
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    return (
      <div className="max-w-[560px] mx-auto py-10">
        <Panel tone="accent">
          <PanelHeader title="Esta tela não pôde ser desenhada" />
          <PanelBody className="space-y-4">
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              O erro está na montagem desta tela, não nos seus dados — nada foi perdido nem alterado. As outras telas
              do console continuam funcionando: dá para voltar pela barra de cima sem recarregar.
            </p>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60 mb-1.5">
                O que quebrou
              </p>
              <Evidence>{erro.message || 'Erro sem mensagem.'}</Evidence>
            </div>
            <div className="flex items-center gap-2">
              <Action variant="solid" onClick={() => this.setState({ erro: null })}>
                Tentar desenhar de novo
              </Action>
              <Action variant="outline" onClick={() => window.location.reload()}>
                Recarregar
              </Action>
            </div>
          </PanelBody>
        </Panel>
      </div>
    );
  }
}
