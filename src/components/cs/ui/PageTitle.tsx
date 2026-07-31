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
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface TrilhaItem {
  label: string;
  /** Sem `to`, é o item atual (não vira link). */
  to?: string;
}

interface PageTitleProps {
  title: string;
  /**
   * Caminho de volta. Toda tela que se chega a partir de outra DEVE ter — o
   * console não tem barra lateral e a barra de topo só conhece as quatro
   * rotas raiz, então sem trilha a única saída de uma ficha era o botão do
   * navegador (pedido do CEO em 2026-07-31: "senti falta de uns botões de
   * navegação pra conseguir voltar pra página anterior").
   *
   * Deliberadamente NÃO é um "voltar" genérico (`navigate(-1)`): voltar no
   * histórico é imprevisível — depois de abrir um cliente a partir da Semana,
   * "voltar" e "ir para a Carteira" são coisas diferentes. A trilha diz onde
   * você está na estrutura, que é estável, em vez de onde você esteve.
   */
  trilha?: TrilhaItem[];
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

export function PageTitle({ title, trilha, eyebrow, description, stats, action, className }: PageTitleProps) {
  return (
    <div className={cn('pb-5 mb-6 border-b border-border', className)}>
      {trilha && trilha.length > 0 && (
        <nav aria-label="Trilha de navegação" className="flex items-center gap-1.5 mb-3 text-[12px] min-w-0">
          {trilha.map((item, i) => (
            <span key={`${item.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <span className="text-muted-foreground/35 select-none">/</span>}
              {item.to ? (
                <Link
                  to={item.to}
                  className="text-muted-foreground hover:text-foreground underline-offset-[5px] hover:underline shrink-0 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-muted-foreground/50 truncate">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

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
