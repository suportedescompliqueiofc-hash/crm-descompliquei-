import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WHATSAPP_URL = 'https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20fazer%20upgrade%20do%20meu%20plano';

export function SemAcesso() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 gap-5">
      <div className="h-16 w-16 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(232,93,36,0.1)', border: '1px solid rgba(232,93,36,0.2)' }}>
        <Lock className="h-7 w-7 text-[#E85D24]" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-lg font-bold text-foreground">Recurso não disponível</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Este recurso não está disponível no seu plano atual. Entre em contato para fazer upgrade.
        </p>
      </div>
      <Button
        onClick={() => window.open(WHATSAPP_URL, '_blank')}
        className="gap-2 bg-[#E85D24] hover:bg-[#d04e1a] text-white"
      >
        Falar com suporte via WhatsApp
      </Button>
    </div>
  );
}
