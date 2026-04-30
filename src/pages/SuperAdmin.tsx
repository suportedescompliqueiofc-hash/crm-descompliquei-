import { ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import TabClientesCRM from './super-admin/tabs/TabClientesCRM';
import TabIaGlobal from './super-admin/tabs/TabIaGlobal';

export default function SuperAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 w-full px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-[#E85D24]/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-6 w-6 text-[#E85D24]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Super Admin CRM</h1>
          <p className="text-sm text-muted-foreground">Gerencie os clientes do seu CRM.</p>
        </div>
      </div>

      <div className="w-full">
        <TabClientesCRM toast={toast} user={user} />
      </div>

      <div className="w-full">
        <TabIaGlobal toast={toast} />
      </div>
    </div>
  );
}
