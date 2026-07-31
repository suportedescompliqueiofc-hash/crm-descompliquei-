// Tradutor de dado em frase — o coração do redesign da Carteira
// (2026-07-30). O veredito do CEO foi que o app "parecia um painel super
// admin": uma tabela com colunas, cada linha virando um rótulo de status e
// um ponto colorido que ele precisava decodificar. A correção não é
// cosmética — é estrutural: em vez de colunas (Risco / Elo / Aderência),
// cada cliente vira 2-3 frases que entregam o essencial de uma vez, na
// ordem em que a régua de risco já classifica a carteira.
//
// Restrição deliberada: as palavras "crítico", "atenção", "saudável" e
// "referência" — vocabulário de `cs_carteira.nivel_risco` — NUNCA aparecem
// aqui. `nivel_risco` só é usado para calcular a AÇÃO recomendada de forma
// comportamental ("ligar hoje"), nunca impresso como rótulo.
//
// Limitação honesta: `useCarteira()` (RPC `cs_carteira`) não expõe QUAL dos
// 8 gatilhos de Crítico foi cruzado (05-operacoes-e-cs/sistema/ritos/
// 01-regua-de-risco.md) — só o nível final já calculado. Este arquivo
// reconstrói uma leitura razoável a partir dos campos que a RPC de fato
// devolve (camada_0_ok, pct_contrato, aderencia_pct, dias_sem_contato,
// elo_restricao), usando os MESMOS limiares documentados na régua (30/60%
// de aderência, 14/21 dias sem contato). Não inventa dado que a RPC não
// mandou (ex.: não afirma "nenhuma venda registrada" — esse fato só existe
// pra quem chama useClienteAdocao/useClienteElos por cliente, na Ficha).
import type { ClienteCarteira } from '@/hooks/cs';
import { formatInt, formatPct } from '@/lib/format';
import { getEloInfo } from '../eloMeta';
import { getNivelRisco } from '@/content/cs';
import type { NivelRiscoId } from '@/content/cs';

/** Primeira frase de um texto — usada para extrair uma ação curta do método
 * (`acaoObrigatoria` do nível, escrita em parágrafo corrido no manual). */
function primeiraFrase(texto: string): string {
  const m = /^(.*?[.!?])(\s|$)/.exec(texto.trim());
  return m ? m[1] : texto.trim();
}

export interface SituacaoCliente {
  /** 2-3 frases corridas — a situação do cliente, sem rótulo de status. */
  frase: string;
  /** Uma frase imperativa curta — o que fazer a respeito. */
  acao: string;
}

/**
 * O acréscimo de sinal pedido pela arquitetura (arquitetura-app-cs.md, seção
 * D — "Carteira"): se o cliente não tem plano publicado no mês corrente, ou
 * tem tarefas atrasadas, isso vira uma segunda linha discreta na
 * `CarteiraRow` — reaproveitando o mesmo campo que `ClientesSemPlano` já usa
 * (`aderencia_pct === null`) e uma contagem de `cs_tarefas` calculada pelo
 * chamador (Carteira.tsx já carrega `useTarefas()` para a tela Semana; aqui
 * só agrega por cliente). `null` quando não há nada para sinalizar — o
 * chamador não renderiza a linha.
 */
export function construirSinal(cliente: ClienteCarteira, tarefasAtrasadas: number): string | null {
  const partes: string[] = [];
  if (cliente.aderencia_pct == null) partes.push('sem plano publicado neste mês');
  if (tarefasAtrasadas > 0) {
    partes.push(`${formatInt(tarefasAtrasadas)} ${tarefasAtrasadas === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}`);
  }
  if (partes.length === 0) return null;
  const texto = partes.join(' · ');
  return texto.charAt(0).toUpperCase() + texto.slice(1) + '.';
}

// Mesmos limiares de 05-operacoes-e-cs/sistema/ritos/01-regua-de-risco.md.
const DIAS_CONTATO_ATENCAO = 14;
const DIAS_CONTATO_CRITICO = 21;
const ADERENCIA_CRITICA = 30;
const ADERENCIA_ATENCAO = 60;

export function construirSituacao(cliente: ClienteCarteira): SituacaoCliente {
  const pct = formatPct(cliente.pct_contrato, 0);
  const frases: string[] = [];

  if (!cliente.camada_0_ok) {
    frases.push(
      `${pct} do contrato consumido. A plataforma não está registrando o que a clínica de fato faz — o diagnóstico comercial não vale enquanto isso não for corrigido.`,
    );
  } else if (cliente.elo_restricao === 'Sem dado suficiente para simular') {
    frases.push(`${pct} do contrato consumido. Ainda não há dado suficiente para calcular um elo-restrição.`);
  } else {
    const { label, camadaLabel } = getEloInfo(cliente.elo_restricao);
    frases.push(
      label === '—'
        ? `${pct} do contrato consumido.`
        : `${pct} do contrato consumido, elo-restrição em ${label} (${camadaLabel}).`,
    );
  }

  // "Sem plano" não repete aqui — vira a linha de sinal (construirSinal),
  // junto com tarefas atrasadas. A frase corrida só fala de aderência
  // quando há um número real para relatar.
  if (cliente.aderencia_pct != null) {
    frases.push(`${formatPct(cliente.aderencia_pct, 0)} de aderência ao plano deste mês.`);
  }

  if (cliente.dias_sem_contato == null) {
    frases.push('Nenhum contato registrado ainda.');
  } else if (cliente.dias_sem_contato === 0) {
    frases.push('Contato hoje.');
  } else {
    frases.push(
      `Sem contato há ${formatInt(cliente.dias_sem_contato)} ${cliente.dias_sem_contato === 1 ? 'dia' : 'dias'}.`,
    );
  }

  // A ação prioriza o fato mais específico que os DADOS já provam (camada 0,
  // contato, aderência) — só cai para o texto do método (getNivelRisco) como
  // tradução geral de "o que este nível de risco pede", nunca imprimindo o
  // rótulo do nível em si (as palavras crítico/atenção/saudável não aparecem
  // na interface).
  let acao: string;
  if (!cliente.camada_0_ok) {
    acao = 'Destravar a adoção antes de qualquer plano comercial.';
  } else if (cliente.dias_sem_contato != null && cliente.dias_sem_contato > DIAS_CONTATO_CRITICO) {
    acao = 'Ligar hoje — mais de três semanas sem contato.';
  } else if (cliente.aderencia_pct != null && cliente.aderencia_pct < ADERENCIA_CRITICA) {
    acao = 'Ligar hoje — aderência muito baixa ao plano do mês.';
  } else if (cliente.aderencia_pct == null) {
    acao = 'Publicar o plano deste mês.';
  } else if (cliente.dias_sem_contato != null && cliente.dias_sem_contato > DIAS_CONTATO_ATENCAO) {
    acao = 'Mandar uma mensagem de checagem.';
  } else if (cliente.aderencia_pct < ADERENCIA_ATENCAO) {
    acao = 'Acompanhar de perto a execução do plano.';
  } else {
    const nivel = getNivelRisco(cliente.nivel_risco as NivelRiscoId);
    acao = nivel ? primeiraFrase(nivel.acaoObrigatoria) : 'Seguir o rito normal do mês — nada urgente agora.';
  }

  return { frase: frases.join(' '), acao };
}
