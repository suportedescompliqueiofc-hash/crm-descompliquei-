// Seção de conteúdo do console — hoje é um Painel com cabeçalho em barra.
//
// Mudança de conceito (2026-07-31): antes, `Section` era só respiro vertical
// e um overline — hierarquia por tipografia e espaço, sem caixa. Isso é
// correto num documento e errado num sistema: sem superfície, blocos
// diferentes não têm limite, e a tela vira uma coluna de texto (foi o
// veredito do CEO). Agora toda seção é uma superfície com começo e fim.
//
// A API é a mesma de antes de propósito — telas que já usavam `<Section
// title=... />` ganham a moldura nova sem uma linha de edição.
//
// Empilhe seções com `space-y-4` (NUNCA mais `divide-y`: o filete era o que
// separava seções quando não havia painel; agora o painel se separa sozinho).
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Panel, PanelHeader, PanelBody } from './Panel';

interface SectionProps {
  /** Rótulo curto em caixa alta. Sem ele, a seção é um painel sem cabeçalho. */
  title?: string;
  /** Contexto de uma linha, ao lado do título. */
  description?: string;
  /** Controles no canto direito do cabeçalho. */
  action?: ReactNode;
  children: ReactNode;
  /** `flush` para quando o conteúdo é uma lista (`PanelRows`) coladinha à borda. */
  flush?: boolean;
  /** Fio de 2px no topo — só no bloco que pede ação agora. */
  tone?: 'default' | 'accent' | 'signal';
  className?: string;
}

export function Section({ title, description, action, children, flush, tone = 'default', className }: SectionProps) {
  return (
    <Panel tone={tone} className={cn(className)}>
      {(title || action) && <PanelHeader title={title ?? ''} hint={description} action={action} />}
      <PanelBody flush={flush}>{children}</PanelBody>
    </Panel>
  );
}
