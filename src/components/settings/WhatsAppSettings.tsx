import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Smartphone, RefreshCw, Wifi, WifiOff, QrCode, Settings2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ConnectionStatus = 'not_configured' | 'disconnected' | 'qr_pending' | 'connected';

interface WhatsAppConnection {
  id: string;
  instance_name: string;
  uazapi_url: string;
  status: ConnectionStatus;
  phone_number: string | null;
  qr_code: string | null;
  n8n_webhook_url: string | null;
  last_connected_at: string | null;
  usuario_id_default: string | null;
}

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string; icon: React.ElementType }> = {
  not_configured: { label: 'Não configurado', color: 'bg-gray-100 text-gray-700', icon: WifiOff },
  disconnected: { label: 'Desconectado', color: 'bg-red-100 text-red-700', icon: WifiOff },
  qr_pending: { label: 'Aguardando QR Code', color: 'bg-amber-100 text-amber-700', icon: QrCode },
  connected: { label: 'Conectado ✅', color: 'bg-green-100 text-green-700', icon: Wifi },
};

export function WhatsAppSettings() {
  const { toast } = useToast();
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [qrPolling, setQrPolling] = useState<ReturnType<typeof setInterval> | null>(null);
  const [statusPolling, setStatusPolling] = useState<ReturnType<typeof setInterval> | null>(null);
  const [form, setForm] = useState({
    uazapi_url: '',
    uazapi_token: '',
    instance_name: '',
    n8n_webhook_url: '',
  });

  const loadConnection = async (isRetry = false) => {
    try {
      // 1. Primeiro, garantimos que temos o ID da organização do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('perfis').select('organization_id').eq('id', user.id).maybeSingle();
      const orgId = profile?.organization_id;

      if (!orgId) {
        // Se ainda não temos o ID da organização, esperamos um pouco (pode ser delay de cadastro)
        if (!isRetry) setTimeout(() => loadConnection(true), 1000);
        return;
      }

      // 2. Agora buscamos a conexão FILTRANDO pela organização para evitar erro de múltiplas linhas
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('organization_id', orgId) // <- FILTRO CRUCIAL
        .maybeSingle();
      
      if (data) {
        const conn = data as unknown as WhatsAppConnection;
        setConnection(conn);
        setForm(f => ({
          ...f,
          uazapi_url: conn.uazapi_url || f.uazapi_url,
          instance_name: conn.instance_name || f.instance_name,
          n8n_webhook_url: conn.n8n_webhook_url || f.n8n_webhook_url,
        }));
      } else if (error) {
        console.warn('Sincronizando conexão...', error.message);
      }
      
      // Se não encontrou dados iniciais, tenta de novo apenas uma vez
      if (!data && !isRetry) {
        setTimeout(() => loadConnection(true), 2000);
      }
    } catch (err) {
      console.error('Falha crítica ao carregar WhatsApp:', err);
    } finally {
      setIsLoading(false);
    }
  };


  // Verifica status na UAZAPI automaticamente ao abrir e a cada 30s
  const syncStatusFromUazapi = async () => {
    // Busca os dados mais recentes do banco ANTES de sincronizar para garantir que temos o URL/Token
    const { data: latestConn } = await supabase.from('whatsapp_connections').select('*').maybeSingle();
    
    if (!latestConn) {
      // Se ainda não temos dados nem no banco nem no form, não há o que sincronizar
      if (!form.uazapi_url || !form.instance_name) return;
    }

    try {
      const result = await callManageWhatsApp('check_status');
      if (result?.status) {
        setConnection(prev => {
          const base = prev || (latestConn as unknown as WhatsAppConnection);
          if (!base) return null;
          return { 
            ...base, 
            status: result.status as ConnectionStatus, 
            qr_code: result.status === 'connected' ? null : (result.qr || base.qr_code),
            phone_number: result.phone || base.phone_number
          };
        });
      }
    } catch (_e) {
      // Ignora erros silenciosos no polling de background
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadConnection();
      // Sincronia IMEDIATA e forçada com a UAZAPI ao entrar na página
      setTimeout(() => syncStatusFromUazapi(), 200);
      setTimeout(() => syncStatusFromUazapi(), 2000); // Back-up de segurança
    };
    init();

    // Polling contínuo a cada 30s
    const poll = setInterval(() => syncStatusFromUazapi(), 30000);
    setStatusPolling(poll);

    return () => {
      if (qrPolling) clearInterval(qrPolling);
      if (poll) clearInterval(poll);
    };
  }, []);

  const callManageWhatsApp = async (action: string, extra?: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('manage-whatsapp', {
      body: { action, ...form, ...extra },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    return res.data;
  };

  const handleConnect = async () => {
    if (!form.uazapi_url || !form.uazapi_token || !form.instance_name) {
      toast({ title: 'Preencha todos os campos', description: 'URL, Token e Nome da Instância são obrigatórios.', variant: 'destructive' });
      return;
    }
    setIsActing(true);

    // Limpar polling anterior
    if (qrPolling) { clearInterval(qrPolling); setQrPolling(null); }

    try {
      const result = await callManageWhatsApp('create_instance');

      if (result?.status === 'connected') {
        await loadConnection();
        toast({ title: '✅ WhatsApp já conectado!' });
        return;
      }

      // Mostrar QR se já veio na primeira resposta
      if (result?.qr) {
        setConnection(prev => ({
          ...(prev || { 
            id: '', 
            instance_name: form.instance_name, 
            uazapi_url: form.uazapi_url, 
            status: 'qr_pending' as ConnectionStatus, 
            phone_number: null, 
            qr_code: null, 
            n8n_webhook_url: null, 
            last_connected_at: null,
            usuario_id_default: null
          }),
          qr_code: result.qr,
          status: 'qr_pending'
        }) as WhatsAppConnection);
      } else {
        setConnection(prev => prev ? { ...prev, status: 'qr_pending' } : null);
        toast({ title: 'Conectando...', description: 'Aguardando QR Code da UAZAPI...' });
      }

      // Polling: a cada 4s busca um QR Code fresco direto da UAZAPI via check_status
      const poll = setInterval(async () => {
        try {
          const statusResult = await callManageWhatsApp('check_status');

          if (statusResult?.status === 'connected') {
            clearInterval(poll);
            setQrPolling(null);
            // Atualiza estado local IMEDIATAMENTE para sumir com o QR Code
            setConnection(prev => prev ? { 
              ...prev, 
              status: 'connected', 
              qr_code: null,
              phone_number: statusResult.phone || prev.phone_number 
            } : prev);
            
            toast({ title: '✅ WhatsApp conectado!', description: `Número: ${statusResult.phone || ''}` });
            loadConnection(); // Sincroniza com o banco em background
            return;
          }

          // Atualizar QR Code com o mais recente retornado pela UAZAPI (não do banco)
          if (statusResult?.qr) {
            setConnection(prev => prev ? { ...prev, qr_code: statusResult.qr, status: 'qr_pending' } : null);
          }
        } catch (_e) {
          // Ignora erros de rede durante o polling
        }
      }, 4000);

      setQrPolling(poll);
    } catch (err: any) {
      toast({ title: 'Erro ao conectar', description: err.message, variant: 'destructive' });
    } finally {
      setIsActing(false);
    }
  };


  const handleCheckStatus = async () => {
    setIsActing(true);
    try {
      const result = await callManageWhatsApp('check_status');

      // Força transição no clique manual também
      if (result?.status === 'connected') {
        setConnection(prev => prev ? { 
          ...prev, 
          status: 'connected', 
          qr_code: null,
          phone_number: result.phone || prev.phone_number 
        } : prev);
      }

      await loadConnection();
      toast({ title: `Status: ${STATUS_CONFIG[result?.status as ConnectionStatus]?.label || result?.status}` });
    } finally {
      setIsActing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsActing(true);
    if (qrPolling) { clearInterval(qrPolling); setQrPolling(null); }
    try {
      await callManageWhatsApp('disconnect');
      await loadConnection();
      toast({ title: 'WhatsApp desconectado.' });
    } finally {
      setIsActing(false);
    }
  };

  const currentStatus: ConnectionStatus = (connection?.status as ConnectionStatus) || 'not_configured';
  const statusConfig = STATUS_CONFIG[currentStatus];
  const StatusIcon = statusConfig.icon;

  if (isLoading) return <div className="h-32 flex items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              WhatsApp — UAZAPI
            </CardTitle>
            <Badge className={`${statusConfig.color} border-0 text-xs`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          {connection?.phone_number && (
            <CardDescription>Número conectado: <strong>{connection.phone_number}</strong></CardDescription>
          )}
        </CardHeader>

        {/* QR Code */}
        {currentStatus === 'qr_pending' && (
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl border-2 border-dashed border-primary/30">
              <QrCode className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium text-center">Escaneie o QR Code com seu WhatsApp</p>
              {connection?.qr_code ? (
                <img
                  src={connection.qr_code.startsWith('data:') ? connection.qr_code : `data:image/png;base64,${connection.qr_code}`}
                  alt="QR Code WhatsApp"
                  className="w-48 h-48 rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 rounded-lg bg-gray-100 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <p className="text-xs text-muted-foreground animate-pulse">Aguardando conexão...</p>
              <Button
                variant="outline"
                size="sm"
                disabled={isActing}
                onClick={async () => {
                  setIsActing(true);
                  try {
                    const result = await callManageWhatsApp('check_status');
                    if (result?.qr) {
                      setConnection(prev => prev ? { ...prev, qr_code: result.qr } : null);
                      toast({ title: 'QR Code renovado!', description: 'Escaneie rapidamente antes que expire.' });
                    } else if (result?.status === 'connected') {
                      await loadConnection();
                      toast({ title: '✅ WhatsApp conectado!' });
                    } else {
                      toast({ title: 'Aguardando...', description: 'QR Code ainda não disponível. Tente novamente.' });
                    }
                  } finally {
                    setIsActing(false);
                  }
                }}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isActing ? 'animate-spin' : ''}`} />
                Renovar QR Code
              </Button>
            </div>
          </CardContent>
        )}

      </Card>

      {/* Configuração */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Configuração UAZAPI
          </CardTitle>
          <CardDescription className="text-xs">Insira as credenciais da sua instância UAZAPI</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">URL da UAZAPI *</Label>
              <Input
                value={form.uazapi_url}
                onChange={e => setForm({ ...form, uazapi_url: e.target.value })}
                placeholder="https://api.suainstancia.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Token de Acesso *</Label>
              <Input
                type="password"
                value={form.uazapi_token}
                onChange={e => setForm({ ...form, uazapi_token: e.target.value })}
                placeholder="seu-token-secreto"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Instância *</Label>
              <Input
                value={form.instance_name}
                onChange={e => setForm({ ...form, instance_name: e.target.value })}
                placeholder="clinica-xyz"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Webhook n8n (URL de recebimento)</Label>
              <Input
                value={form.n8n_webhook_url}
                onChange={e => setForm({ ...form, n8n_webhook_url: e.target.value })}
                placeholder="https://n8n.seudominio.com/webhook/..."
              />
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap gap-3 pt-2">
            {currentStatus !== 'connected' && (
              <Button onClick={handleConnect} disabled={isActing} className="bg-primary hover:bg-primary/90">
                {isActing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                {connection ? 'Reconectar' : 'Conectar WhatsApp'}
              </Button>
            )}
            {connection && (
              <Button variant="outline" onClick={handleCheckStatus} disabled={isActing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isActing ? 'animate-spin' : ''}`} />
                Verificar Status
              </Button>
            )}
            {/* Salvar: persiste os dados do form no banco E configura o webhook no UaZAPI */}
            {connection && (
              <Button
                variant="outline"
                disabled={isActing}
                onClick={async () => {
                  setIsActing(true);
                  try {
                    // 1. Salva os dados da configuração no banco (upsert via create_instance)
                    await callManageWhatsApp('create_instance');
                    // 2. Configura o webhook no UaZAPI para apontar ao receive-message
                    const result = await callManageWhatsApp('configure_webhook');
                    if (result?.success) {
                      await loadConnection();
                      toast({ title: '✅ Configurações salvas e webhook configurado!' });
                    } else {
                      toast({ title: '⚠️ Dados salvos, mas webhook pode precisar ser reconfigurado.', variant: 'destructive' });
                    }
                  } catch (e: any) {
                    toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
                  } finally {
                    setIsActing(false);
                  }
                }}
                className="gap-2"
              >
                <Settings2 className="h-4 w-4" />
                Configurar Webhook
              </Button>
            )}
            {currentStatus === 'connected' && (
              <Button variant="destructive" onClick={handleDisconnect} disabled={isActing}>
                <Trash2 className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
