import TabSistemaAdmin from '../../super-admin/tabs/TabSistema';
import { useToast } from '@/hooks/use-toast';

export default function TabSistema() {
  const { toast } = useToast();
  return (
    <div className="text-white bg-[#0A0A0A]">
      <TabSistemaAdmin toast={toast} />
    </div>
  );
}
