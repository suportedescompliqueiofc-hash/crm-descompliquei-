import TabTrilhaConteudo from '../../super-admin/tabs/TabTrilhaConteudo';
import { useToast } from '@/hooks/use-toast';

export default function TabConteudo() {
  const { toast } = useToast();
  return (
    <div className="text-white bg-[#0A0A0A]">
      <TabTrilhaConteudo toast={toast} />
    </div>
  );
}
