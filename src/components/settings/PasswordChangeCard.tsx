import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';

interface Props {
  /** Cor do botão primário (hex). Default: laranja Descompliquei */
  accentColor?: string;
}

export default function PasswordChangeCard({ accentColor = '#E85D24' }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha precisa ter no mínimo 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação da nova senha não confere.');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('A nova senha deve ser diferente da atual.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Sessão inválida. Faça login novamente.');

      // Reautentica para validar a senha atual
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInErr) {
        throw new Error('Senha atual incorreta.');
      }

      // Atualiza para a nova senha
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      toast.success('Senha alterada com sucesso!');
      reset();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar senha.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" style={{ color: accentColor }} />
          Alterar Senha
        </CardTitle>
        <CardDescription>
          Para sua segurança, informe a senha atual e escolha uma nova senha de pelo menos 8 caracteres.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Senha atual</Label>
          <div className="relative">
            <Input
              id="current-password"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar nova senha</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={reset} disabled={isSaving}>
            Limpar
          </Button>
          <Button
            onClick={handleChangePassword}
            disabled={isSaving}
            style={{ backgroundColor: accentColor, color: 'white' }}
            className="hover:opacity-90"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSaving ? 'Salvando...' : 'Alterar senha'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
