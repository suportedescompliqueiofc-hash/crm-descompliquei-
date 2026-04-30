import TabMateriaisAdmin from '../../super-admin/tabs/TabMateriais';
import { useToast } from '@/hooks/use-toast';

export default function TabMateriais() {
  const { toast } = useToast();
  return (
    <div className="text-white bg-[#0A0A0A]">
      <TabMateriaisAdmin toast={toast} />
    </div>
  );
}
