import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Building2, 
  Save,
  Palette,
  Users,
  Tag,
  GitBranch,
  Radio,
  ChevronRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { PhoneInput } from "@/components/MaskedInput";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { TagSettings } from "@/components/settings/TagSettings";
import { PipelineSettings } from "@/components/settings/PipelineSettings";
import { SourceSettings } from "@/components/settings/SourceSettings";
import { cn } from "@/lib/utils";

export default function Settings() {
  const [activeSection, setActiveSection] = useState("profile");
  const { user } = useAuth();
  const { profile, role, isLoading: isLoadingProfile, updateProfile } = useProfile();
  const { settings, updateSettings } = useClinicSettings();

  const [profileForm, setProfileForm] = useState({ nome_completo: '', telefone: '' });
  const [clinicForm, setClinicForm] = useState({ nome: '', cnpj: '', email: '', telefone: '' });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        nome_completo: profile.nome_completo || '',
        telefone: profile.telefone || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (settings) {
      setClinicForm({
        nome: settings.nome || '',
        cnpj: settings.cnpj || '',
        email: settings.email || '',
        telefone: settings.telefone || '',
      });
    }
  }, [settings]);

  const handleProfileSave = () => {
    updateProfile(profileForm);
  };

  const handleClinicSave = () => {
    updateSettings(clinicForm);
  };

  const menuItems = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "clinic", label: "Dados do Escritório", icon: Building2 },
    { id: "team", label: "Equipe", icon: Users, hidden: role !== 'admin' },
    { id: "pipeline", label: "Etapas do Pipeline", icon: GitBranch, hidden: role !== 'admin' },
    { id: "sources", label: "Fontes", icon: Radio, hidden: role !== 'admin' },
    { id: "tags", label: "Etiquetas", icon: Tag },
    { id: "appearance", label: "Aparência", icon: Palette },
  ];

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Preferências e ajustes do sistema</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Menu Lateral Adaptativo */}
        <Card className="lg:w-64 flex-shrink-0 border-none sm:border bg-transparent sm:bg-card shadow-none sm:shadow-sm">
          <CardContent className="p-0 sm:p-2">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-none p-1 sm:p-0">
              {menuItems.filter(item => !item.hidden).map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "flex items-center gap-2 sm:gap-3 px-4 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all text-left whitespace-nowrap text-xs sm:text-sm",
                      isActive 
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                        : 'bg-muted/40 sm:bg-transparent text-foreground/70 hover:bg-muted hover:text-foreground border border-transparent'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                    <ChevronRight className={cn("ml-auto h-3 w-3 hidden lg:block", isActive ? "opacity-100" : "opacity-0")} />
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Conteúdo Central */}
        <div className="flex-1 space-y-6 min-w-0">
          {activeSection === "profile" && (
            <Card className="shadow-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg">Meu Perfil</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Gerencie suas informações pessoais</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="flex justify-center sm:justify-start">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary/10">
                    <AvatarImage src={profile?.url_avatar || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-serif">
                      {profile?.nome_completo?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome Completo</Label>
                    <Input value={profileForm.nome_completo} onChange={e => setProfileForm({...profileForm, nome_completo: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">E-mail</Label>
                    <Input type="email" value={user?.email || ''} className="bg-muted/50" readOnly disabled />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Telefone</Label>
                    <PhoneInput value={profileForm.telefone} onChange={e => setProfileForm({...profileForm, telefone: e.target.value})} />
                  </div>
                </div>

                <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-sm" onClick={handleProfileSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Perfil
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === "clinic" && (
            <Card className="shadow-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg">Dados do Escritório</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Informações jurídicas do escritório</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome do Escritório</Label>
                    <Input value={clinicForm.nome} onChange={e => setClinicForm({...clinicForm, nome: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">CNPJ</Label>
                    <Input value={clinicForm.cnpj} onChange={e => setClinicForm({...clinicForm, cnpj: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">E-mail Principal</Label>
                    <Input type="email" value={clinicForm.email} onChange={e => setClinicForm({...clinicForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Telefone Principal</Label>
                    <PhoneInput value={clinicForm.telefone} onChange={e => setClinicForm({...clinicForm, telefone: e.target.value})} />
                  </div>
                </div>
                <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-sm" onClick={handleClinicSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Dados
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="w-full overflow-hidden">
            {activeSection === "team" && <TeamSettings />}
            {activeSection === "pipeline" && <PipelineSettings />}
            {activeSection === "sources" && <SourceSettings />}
            {activeSection === "tags" && <TagSettings />}
            {activeSection === "appearance" && <ThemeSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}