// Barrel público da camada de dados do CS. Importar hooks daqui:
//   import { useCarteira, useTarefas, useConcluirTarefa } from '@/hooks/cs';

export * from './types';

export { useCarteira } from './useCarteira';

export {
  useClienteElos,
  useClienteSerie,
  useClienteAdocao,
  useAderencia,
} from './useClienteCS';

export {
  useTarefas,
  useCriarTarefa,
  useConcluirTarefa,
  useReabrirTarefa,
  useEditarTarefa,
  useExcluirTarefa,
} from './useCsTarefas';

export {
  useReunioes,
  useAgendarReuniao,
  useRemarcarReuniao,
  useCancelarReuniao,
  useMarcarReuniaoRealizada,
  useSalvarNotasReuniao,
} from './useCsReunioes';
