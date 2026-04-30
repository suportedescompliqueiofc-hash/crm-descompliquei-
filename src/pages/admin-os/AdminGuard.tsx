import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AdminGuard() {
  const { user, loading: authLoading } = useAuth();
  const { role, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (role === 'superadmin') {
      setChecking(false);
      return;
    }

    if (!user) {
      navigate('/crm/login');
      return;
    }

    supabase
      .from('platform_admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate('/plataforma');
        } else {
          setChecking(false);
        }
      });
  }, [user, authLoading, profileLoading, role, navigate]);

  if (authLoading || profileLoading || checking) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#E85D24] animate-spin" />
      </div>
    );
  }

  return <Outlet />;
}
