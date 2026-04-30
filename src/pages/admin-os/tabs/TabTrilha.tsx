import TabTrilhaModulos from '../../super-admin/tabs/TabTrilhaModulos';
import { useToast } from '@/hooks/use-toast';

export default function TabTrilha() {
  const { toast } = useToast();
  return (
    <div className="text-white bg-[#0A0A0A]">
      <TabTrilhaModulos toast={toast} />
    </div>
  );
}
