// Onde cada cliente está no próprio mês do ciclo — traduz `dias_de_ciclo`
// (ClienteCarteira) para a semana 1-4 do rito mensal (ver
// 05-operacoes-e-cs/sistema/ritos/00-o-mes-do-cs.md: Semana 1 instala, 2
// corrige, 3 aprofunda/escala, 4 fecha e planeja). O "mês do CS" é o mês do
// CICLO DE CADA CLIENTE (ancorado em `cliente_desde`), não um mês de
// calendário compartilhado — por isso o cálculo é sempre relativo a
// `dias_de_ciclo`, nunca à data corrente sozinha.
//
// Aproximação deliberada: o documento define o mês em ~30 dias corridos (6
// meses = 180 dias do PCA). Não há RPC que devolva "semana do rito"
// diretamente — é derivado aqui, no cliente, só para dar à tela Semana o
// mapa que o rito pede. Se a régua real (baseada em fechamento mensal via
// /cs-mes) divergir disso no futuro, é a fonte que manda, não este cálculo.
import type { ClienteCarteira } from '@/hooks/cs';
import { getSemanaDoMes } from '@/content/cs';

const DIAS_POR_MES = 30;

export interface RitoCliente {
  mesDoCiclo: number; // 1-6
  semanaDoMes: number; // 1-4
  faseLabel: string;
}

// Fallback só usado se o método (src/content/cs) não tiver a semana — não
// deveria acontecer com semanaDoMes sempre entre 1 e 4, mas cobre o caso.
const FASE_LABEL_FALLBACK: Record<number, string> = {
  1: 'Instalar',
  2: 'Corrigir',
  3: 'Aprofundar ou escalar',
  4: 'Fechar e planejar',
};

export function calcularRitoCliente(diasDeCiclo: number): RitoCliente {
  const diasNoMes = diasDeCiclo % DIAS_POR_MES;
  const mesDoCiclo = Math.min(Math.floor(diasDeCiclo / DIAS_POR_MES) + 1, 6);
  const semanaDoMes = Math.min(Math.floor(diasNoMes / 7) + 1, 4);
  const semana = getSemanaDoMes(semanaDoMes as 1 | 2 | 3 | 4);
  return { mesDoCiclo, semanaDoMes, faseLabel: semana?.titulo ?? FASE_LABEL_FALLBACK[semanaDoMes] };
}

export function agruparPorSemanaDoRito(clientes: ClienteCarteira[]) {
  const grupos = new Map<number, { cliente: ClienteCarteira; rito: RitoCliente }[]>([
    [1, []],
    [2, []],
    [3, []],
    [4, []],
  ]);
  for (const cliente of clientes) {
    const rito = calcularRitoCliente(cliente.dias_de_ciclo);
    grupos.get(rito.semanaDoMes)!.push({ cliente, rito });
  }
  return grupos;
}
