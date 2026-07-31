// Em que semana do MÊS CORRENTE a carteira inteira está — não a semana do
// próprio ciclo de cada cliente. Ver 05-operacoes-e-cs/sistema/ritos/00-o-mes-do-cs.md:
// Semana 1 instala, 2 corrige, 3 aprofunda/escala, 4 fecha e planeja.
//
// CORREÇÃO DE CONCEITO (2026-07-31): a versão anterior deste arquivo calculava
// a semana de CADA CLIENTE a partir de `dias_de_ciclo` (ancorado em
// `cliente_desde`), e a tela `/semana` distribuía os clientes entre as quatro
// semanas ("Semana 1 — Instalar: Dra. Anna Clara, Dra. Monção; Semana 2 —
// Corrigir: Dr. Derek..."), como se cada cliente vivesse o próprio ciclo
// mensal. Estava errado. O CEO corrigiu em 2026-07-31:
//
//   "A gente tinha falado que todos os clientes iam seguir a mesma ideia de
//   carteira: toda semana, todo mundo tá na semana 1, todo mundo tá na semana
//   2, todo mundo tá na semana 3, todo mundo tá na semana 4. Essa divisão não
//   faz muito sentido. Todos os clientes vão viver a mesma semana, até porque
//   a gente tem 4 semanas no mês, as semanas são sequenciais."
//
// O mês do CS é o MÊS DO CALENDÁRIO. As quatro semanas são as semanas do mês
// corrente, e a carteira inteira vive a mesma semana ao mesmo tempo — é isso
// que sustenta a sessão tática em grupo (segunda-feira, 8h) existir: não
// haveria sessão de grupo se cada cliente estivesse numa fase diferente.
//
// O que NÃO muda: o ciclo individual de 180 dias de cada cliente
// (`dias_de_ciclo`, ancorado em `cliente_desde`) continua existindo e
// importando — mas ele é o relógio do CONTRATO (quanto falta, em que mês do
// PCA o cliente está), não o ritmo semanal do rito. São duas réguas
// diferentes, e não podem ser confundidas de novo.
//
// Regra da semana corrente: semana = min(ceil(dia do mês / 7), 4). Os dias
// 29-31 caem na semana 4 — é determinístico e casa com "4 semanas no mês"
// (um mês de 29-31 dias não gera uma 5ª semana solta).
import { getSemanaDoMes } from '@/content/cs';

export interface SemanaCorrente {
  numero: 1 | 2 | 3 | 4;
  titulo: string;
  objetivo?: string;
}

// Fallback só usado se o método (src/content/cs) não tiver a semana — não
// deveria acontecer, mas cobre o caso.
const FASE_LABEL_FALLBACK: Record<number, string> = {
  1: 'Instalar',
  2: 'Corrigir',
  3: 'Aprofundar ou escalar',
  4: 'Fechar e planejar',
};

/** Semana do mês corrente (1-4), pela regra `min(ceil(dia do mês / 7), 4)`. */
export function calcularSemanaCorrente(referencia: Date = new Date()): 1 | 2 | 3 | 4 {
  const diaDoMes = referencia.getDate();
  return Math.min(Math.ceil(diaDoMes / 7), 4) as 1 | 2 | 3 | 4;
}

/** A semana em que a carteira inteira está agora, com o texto do método. */
export function getSemanaCorrente(referencia: Date = new Date()): SemanaCorrente {
  const numero = calcularSemanaCorrente(referencia);
  const semana = getSemanaDoMes(numero);
  return {
    numero,
    titulo: semana?.titulo ?? FASE_LABEL_FALLBACK[numero],
    objetivo: semana?.objetivo,
  };
}
