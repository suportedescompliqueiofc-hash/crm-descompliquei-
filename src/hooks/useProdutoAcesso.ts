import { usePlataforma } from '@/contexts/PlataformaContext';

export function useProdutoAcesso() {
  const { acesso } = usePlataforma();
  return acesso;
}
