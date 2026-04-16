import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Upload, Palette, RefreshCw } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const COLOR_FIELDS = [
  { key: 'color_primary', label: 'Cor Primária (botões, links)', hint: 'Principal destaque' },
  { key: 'color_accent', label: 'Cor Accent', hint: 'Fundos suaves e destaques leves' },
  { key: 'color_sidebar_bg', label: 'Fundo do Menu Lateral', hint: 'Background da sidebar' },
] as const;

function hslStringToHex(hsl: string): string {
  try {
    const parts = hsl.trim().split(/\s+/);
    if (parts.length !== 3) return '#6b7280';
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  } catch {
    return '#6b7280';
  }
}

function hexToHsl(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch {
    return '220 10% 50%';
  }
}

export function BrandingSettings() {
  const { branding, updateBranding, refetch } = useBranding();
  const { profile } = useProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    brand_name: '',
    tagline: '',
    color_primary: '38 45% 55%',
    color_accent: '38 45% 94%',
    color_sidebar_bg: '220 10% 10%',
  });

  useEffect(() => {
    if (branding) {
      setForm({
        brand_name: branding.brand_name || '',
        tagline: branding.tagline || '',
        color_primary: branding.color_primary || '38 45% 55%',
        color_accent: branding.color_accent || '38 45% 94%',
        color_sidebar_bg: branding.color_sidebar_bg || '220 10% 10%',
      });
    }
  }, [branding]);

  const extractColorsFromImage = (imageUrl: string): Promise<{ primary: string, accent: string, sidebar: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve({ primary: '220 15% 20%', accent: '220 10% 97%', sidebar: '220 15% 8%' });

        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        try {
          const imageData = ctx.getImageData(0, 0, 50, 50).data;
          let colors: { h: number, s: number, l: number, weight: number }[] = [];
          let grayscaleColors: { h: number, s: number, l: number, weight: number }[] = [];

          for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i], g = imageData[i+1], b = imageData[i+2], a = imageData[i+3];
            if (a < 128) continue;

            const r_norm = r / 255, g_norm = g / 255, b_norm = b / 255;
            const max = Math.max(r_norm, g_norm, b_norm), min = Math.min(r_norm, g_norm, b_norm);
            let h = 0, s = 0, l = (max + min) / 2;

            if (max !== min) {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              if (max === r_norm) h = (g_norm - b_norm) / d + (g_norm < b_norm ? 6 : 0);
              else if (max === g_norm) h = (b_norm - r_norm) / d + 2;
              else h = (r_norm - g_norm) / d + 4;
              h *= 60;
            }

            const sat = s * 100;
            const lum = l * 100;

            if (sat > 12 && lum > 15 && lum < 85) {
              colors.push({ h, s: sat, l: lum, weight: sat * (1 - Math.abs(2 * l - 1)) });
            } else if (lum > 5 && lum < 95) {
              grayscaleColors.push({ h, s: sat, l: lum, weight: 1 - Math.abs(2 * l - 1) });
            }
          }

          // Se tiver cores vibrantes, usa a melhor. Senão, usa tons de cinza/preto da logo
          const candidatePool = colors.length > 0 ? colors : grayscaleColors;
          
          if (candidatePool.length === 0) {
             return resolve({ primary: '220 15% 20%', accent: '220 10% 97%', sidebar: '220 15% 8%' });
          }

          candidatePool.sort((a, b) => b.weight - a.weight);
          const top = candidatePool[0];
          const isGrayscale = colors.length === 0;

          // REGRAS PARA MARCAS SÓBRIAS (P&B) OU COLORIDAS
          let primaryH = Math.round(top.h);
          let primaryS = isGrayscale ? 15 : Math.min(Math.max(top.s, 40), 90);
          let primaryL = isGrayscale ? 20 : Math.min(Math.max(top.l, 40), 55);

          // Accent: Quase branco
          let accentS = isGrayscale ? 5 : Math.min(top.s, 20);
          let accentL = 97;

          // Sidebar: Quase preto
          let sidebarS = isGrayscale ? 10 : Math.min(top.s, 15);
          let sidebarL = 8;

          resolve({
            primary: `${primaryH} ${primaryS}% ${primaryL}%`,
            accent: `${primaryH} ${accentS}% ${accentL}%`,
            sidebar: `${primaryH} ${sidebarS}% ${sidebarL}%`
          });
        } catch (e) {
          resolve({ primary: '220 15% 20%', accent: '220 10% 97%', sidebar: '220 15% 8%' });
        }
      };
      img.src = imageUrl;
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const orgId = branding?.organization_id || profile?.organization_id;
    if (!file || !orgId) return;

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${orgId}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('organization-logos').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // Extrair cores
      const colors = await extractColorsFromImage(publicUrl);
      
      const newBranding = { 
        logo_url: publicUrl,
        color_primary: colors.primary,
        color_accent: colors.accent,
        color_sidebar_bg: colors.sidebar
      };

      await updateBranding(newBranding);
      
      // Atualizar o formulário local para refletir as novas cores imediatamente
      setForm(prev => ({
        ...prev,
        color_primary: colors.primary,
        color_accent: colors.accent,
        color_sidebar_bg: colors.sidebar
      }));

      toast({ title: 'Identidade Visual Extraída!', description: 'As cores foram ajustadas para combinar com sua logo.' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateBranding(form);
      toast({ title: 'Marca salva!', description: 'As cores e identidade foram aplicadas.' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Logo da Marca
          </CardTitle>
          <CardDescription className="text-xs">Upload da logo — o sistema extrairá as cores automaticamente</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-4">
            {branding?.logo_url ? (
              <div className="h-20 w-20 rounded-xl border-2 border-primary/20 overflow-hidden bg-muted flex items-center justify-center">
                <img src={branding.logo_url} alt="Logo" className="h-full w-full object-contain p-2" />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-xl border-2 border-dashed border-primary/30 flex items-center justify-center bg-muted/30">
                <Palette className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
            <div className="space-y-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Enviando...' : 'Escolher Logo'}
              </Button>
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG — máx. 5MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identidade */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg">Identidade da Marca</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome exibido no sistema</Label>
              <Input
                value={form.brand_name}
                onChange={e => setForm({ ...form, brand_name: e.target.value })}
                placeholder="Ex: CRM Odontonova"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tagline (opcional)</Label>
              <Input
                value={form.tagline}
                onChange={e => setForm({ ...form, tagline: e.target.value })}
                placeholder="Ex: Gestão inteligente"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paleta de Cores */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Paleta de Cores
          </CardTitle>
          <CardDescription className="text-xs">Ajuste as cores do sistema para combinar com sua marca. Formato: H S% L% (ex: 220 80% 50%)</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COLOR_FIELDS.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs font-semibold">{field.label}</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={hslStringToHex(form[field.key as keyof typeof form])}
                    onChange={e => setForm({ ...form, [field.key]: hexToHsl(e.target.value) })}
                    className="h-9 w-10 rounded-md border border-input cursor-pointer bg-transparent p-0.5"
                  />
                  <Input
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    className="font-mono text-xs"
                    placeholder="H S% L%"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{field.hint}</p>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 rounded-xl border border-border space-y-3 bg-card shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
            <div className="flex gap-2 flex-wrap">
              <div className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: `hsl(${form.color_primary})` }}>Botão Primário</div>
              <div className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: `hsl(${form.color_accent})` }}>Accent</div>
            </div>
            <div className="h-12 rounded-lg flex items-center px-4"
              style={{ backgroundColor: `hsl(${form.color_sidebar_bg})` }}>
              <span className="text-sm font-medium" style={{ color: `hsl(${form.color_primary})` }}>Sidebar Preview</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="bg-primary hover:bg-primary/90" onClick={handleSave} disabled={isSaving}>
        {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        {isSaving ? 'Salvando...' : 'Salvar Marca'}
      </Button>
    </div>
  );
}
