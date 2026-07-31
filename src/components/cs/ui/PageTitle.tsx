// Cabeçalho de tela do console — a segunda camada de cromo.
//
// A barra escura do topo (CsTopNav) diz em que APLICAÇÃO você está; este
// bloco diz em que TELA e com que números. É essa dupla — cromo escuro sobre
// barra de contexto clara — que faz a interface ler como sistema, e não como
// um documento com um título em cima. A versão anterior era só um <h1> solto
// no branco, e foi o que o CEO chamou de "extremamente minimalista".
//
// Continua sendo o oposto do PageHero da plataforma do cliente: sem
// gradiente, sem glow, sem ícone, 90px em vez de 300px. O que mudou é que
// agora ele tem estrutura — sobrenome (eyebrow), número de leitura (stats) e
// um fio que fecha o bloco.
//
// Use no topo de TODA tela do console — nunca reconstrua um título na mão.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTitleProps {
  title: string;
  /** Rótulo minúsculo acima do título — o "onde estou" (ex.: CLIENTE, MÊS). */
  eyebrow?: string;
  /** Frase corrida abaixo do título. Pode conter <Metric> inline. */
  description?: ReactNode;
  /** Números de leitura à direita — use <Readout>, no máximo três. */
  stats?: ReactNode;
  /** Ação primária da tela. */
  action?: ReactNode;
  className?: string;
}

export function PageTitle({ title, eyebrow, description, stats, action, className }: PageTitleProps) {
  return (
    <div className={cn('pb-5 mb-6 border-b border-border', className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60 mb-1.5">
              {eyebrow}
            </p>
          )}
          <h1 className="text-[26px] leading-tight font-bold font-display tracking-[-0.02em] text-foreground">
            {title}
          </h1>
          {description && (
            <div className="text-[13.5px] text-muted-foreground mt-1.5 leading-relaxed max-w-[68ch]">{description}</div>
          )}
        </div>

        <div className="shrink-0 flex items-start gap-6">
          {stats && <div className="hidden md:flex items-start gap-7">{stats}</div>}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}
