import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlataforma } from "@/contexts/PlataformaContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, User, Shield, Bell, HelpCircle, Save, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PasswordChangeCard from "@/components/settings/PasswordChangeCard";

export default function Configuracoes() {
  const { user } = useAuth();
  const { plataformaUser, plan, progressPercent } = usePlataforma();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Profile
  const [fullName, setFullName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cityState, setCityState] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Prefs
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("PT-BR");

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setFullName(user.user_metadata?.full_name || "");
        
        if (plataformaUser) {
          setClinicName(plataformaUser.clinic_name || "");
          setSpecialty(plataformaUser.specialty || "");
          setWhatsapp(plataformaUser.whatsapp || "");
          setCityState(plataformaUser.city_state || "");
          setEmailNotifications(plataformaUser.email_notifications !== false);
          setAvatarUrl(plataformaUser.avatar_url || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    
    // Lê tema do localStorage (chave unificada 'theme')
    const savedTheme = localStorage.getItem("theme") || localStorage.getItem("vite-ui-theme") || "light";
    setTheme(savedTheme);
    // Aplica imediatamente
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(savedTheme);
  }, [user, plataformaUser]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      // Auth metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      if (authErr) throw authErr;

      // Platform User data
      const { error: dbErr } = await supabase
        .from("platform_users")
        .update({
          clinic_name: clinicName,
          specialty: specialty,
          whatsapp: whatsapp,
          city_state: cityState
        })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      toast.success("Perfil atualizado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar perfil: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePrefs = async () => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      const { error: dbErr } = await supabase
        .from("platform_users")
        .update({ email_notifications: emailNotifications })
        .eq("id", user.id);
      
      if (dbErr) throw dbErr;

      // Salva e aplica o tema (chave unificada)
      localStorage.setItem("theme", theme);
      localStorage.setItem("vite-ui-theme", theme); // compatibilidade
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);

      toast.success("Preferências atualizadas!");
    } catch (err: any) {
      toast.error("Erro ao salvar preferências: " + err.message);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleGlobalSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success("Desconectado de todos os dispositivos.");
    } catch (err: any) {
      toast.error("Erro ao desconectar: " + err.message);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(data.publicUrl);
      
      await supabase.from('platform_users').update({ avatar_url: data.publicUrl }).eq('id', user.id);
      toast.success('Foto de perfil atualizada!');
    } catch (error: any) {
      toast.error('Erro ao fazer upload da foto: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E85D24] mb-4" />
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-8 pb-32">
      {/* HEADER */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-8 h-8 text-[#E85D24]" /> Configurações
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie suas informações, preferências e segurança</p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* SEÇÃO 1 - PERFIL DA CONTA */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-[#E85D24]"/> Perfil da Conta</CardTitle>
            <CardDescription>Suas informações pessoais e públicas da clínica.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="md:col-span-2 flex items-center gap-6 mb-2">
              <Avatar className="w-20 h-20 border-2 border-[#E85D24]/20">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>{fullName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <label htmlFor="avatar-upload" className="cursor-pointer bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Alterar foto
                </label>
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG ou GIF. Máximo 2MB.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nome completo</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Email de acesso</label>
              <Input value={user?.email || ""} disabled className="bg-muted/50" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nome da Clínica</label>
              <Input value={clinicName} onChange={e => setClinicName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Especialidade</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={specialty} onChange={e => setSpecialty(e.target.value)}>
                <option value="">Selecione...</option>
                <option value="Odontologia">Odontologia</option>
                <option value="HOF">HOF</option>
                <option value="Cirurgia Plástica">Cirurgia Plástica</option>
                <option value="Dermatologia">Dermatologia</option>
                <option value="Estética Avançada">Estética Avançada</option>
                <option value="Outra">Outra</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">WhatsApp de contato</label>
              <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Cidade / UF</label>
              <Input value={cityState} onChange={e => setCityState(e.target.value)} placeholder="Ex: São Paulo, SP" />
            </div>

            <div className="md:col-span-2 flex justify-end mt-2">
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-[#E85D24] hover:bg-[#E85D24]/90 text-white">
                {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar Perfil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 2 - PREFERÊNCIAS */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-[#E85D24]"/> Preferências da Plataforma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h4 className="text-sm font-medium">Notificações por Email</h4>
                <p className="text-xs text-muted-foreground">Receba alertas sobre sua trilha e IAs</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} className="data-[state=checked]:bg-[#E85D24]" />
            </div>
            
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h4 className="text-sm font-medium">Tema da Interface</h4>
                <p className="text-xs text-muted-foreground">Escolha entre modo Claro ou Escuro</p>
              </div>
              <div className="flex gap-2">
                <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')} className={theme === 'light' ? 'bg-[#E85D24]' : ''}>Claro</Button>
                <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')} className={theme === 'dark' ? 'bg-[#E85D24]' : ''}>Escuro</Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Idioma</h4>
                <p className="text-xs text-muted-foreground">Idioma da interface da plataforma</p>
              </div>
              <select className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-32" value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="PT-BR">Português (BR)</option>
              </select>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handleSavePrefs} disabled={savingPrefs} variant="outline" className="border-[#E85D24] text-[#E85D24] hover:bg-[#E85D24]/10">
                {savingPrefs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar Preferências
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 3 - SEGURANÇA */}
        <PasswordChangeCard />

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-[#E85D24]"/> Sessões e Acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                 <h4 className="text-sm font-medium text-red-500">Sessões Ativas</h4>
                 <p className="text-xs text-muted-foreground">Isso encerrará sua sessão em todos os dispositivos conectados.</p>
               </div>
               <Button onClick={handleGlobalSignOut} variant="destructive" className="whitespace-nowrap">
                  <LogOut className="w-4 h-4 mr-2" /> Sair de todos os dispositivos
               </Button>
            </div>

            <div className="border-t border-border pt-6 text-xs text-muted-foreground flex gap-8">
               <div><strong>Membro desde:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}</div>
               <div><strong>Último acesso:</strong> {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('pt-BR') : 'N/A'}</div>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 4 - ASSINATURA */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><HelpCircle className="w-5 h-5 text-[#E85D24]"/> Minha Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-secondary/50 p-6 rounded-lg">
               <div>
                 <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Plano Atual</p>
                 <div className="flex items-center gap-2">
                   <span className="text-xl font-bold">{plan === 'gca' ? 'Gestão Comercial Avançada' : 'Profissional'}</span>
                   <Badge className="bg-[#E85D24] uppercase">{plan}</Badge>
                 </div>
               </div>
               <div>
                 <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Status</p>
                 <div className="flex items-center gap-2 text-emerald-500 font-bold">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Ativo
                 </div>
               </div>
               <div>
                 <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Progresso na Trilha</p>
                 <span className="text-xl font-bold">{progressPercent}%</span>
               </div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <p className="text-sm text-muted-foreground">Para alterações no plano ou suporte financeiro, entre em contato com a Descompliquei.</p>
               <Button onClick={() => window.open('https://wa.me/5511999999999', '_blank')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                 Falar com suporte
               </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
