import TabIaConfig from '../../super-admin/tabs/TabIaConfig';
import { useToast } from '@/hooks/use-toast';

export default function TabIAs() {
  const { toast } = useToast();
  return (
    <div className="text-white bg-[#0A0A0A]">
      <TabIaConfig toast={toast} />
    </div>
  );
}
