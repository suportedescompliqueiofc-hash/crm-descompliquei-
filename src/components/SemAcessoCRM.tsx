import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SemAcessoCRM() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 gap-5">
      <div
        className="h-16 w-16 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(232,93,36,0.1)', border: '1px solid rgba(232,93,36,0.2)' }}
      >
        <Lock className="h-7 w-7 text-[#E85D24]" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-lg font-bold text-foreground">Seu plano não inclui acesso ao CRM</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Entre em contato com o administrador para fazer upgrade do seu plano.
        </p>
      </div>
      <Button variant="outline" onClick={() => navigate('/plataforma')}>
        Voltar à Plataforma
      </Button>
    </div>
  );
}
