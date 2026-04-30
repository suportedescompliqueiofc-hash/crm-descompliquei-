import TabPlataformaClientes from '../../super-admin/tabs/TabPlataformaClientes';
import { useToast } from '@/hooks/use-toast';

export default function TabClientes() {
  const { toast } = useToast();
  return (
    <div className="text-white">
      <TabPlataformaClientes toast={toast} />
    </div>
  );
}
