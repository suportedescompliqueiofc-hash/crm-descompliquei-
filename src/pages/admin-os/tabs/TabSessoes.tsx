import TabSessoesTaticas from '../../super-admin/tabs/TabSessoesTaticas';
import { useToast } from '@/hooks/use-toast';

export default function TabSessoes() {
  const { toast } = useToast();
  return (
    <div className="text-white bg-[#0A0A0A]">
      <TabSessoesTaticas toast={toast} />
    </div>
  );
}
