import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Import logo, if available locally. Otherwise, provide placeholder logic.
// Placeholder logic: We'll use a text-based logo since we don't have the image file path yet in this scope
// Updated to use the Descompliquei identity

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message || 'Erro ao criar conta', { closeButton: true });
        } else {
          toast.success('Conta criada com sucesso! Você já pode acessar o sistema.', { closeButton: true });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message || 'Email ou senha incorretos', { closeButton: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Brand (Black & Orange Theme) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#000000] items-center justify-center p-12 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF7F00] opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FF7F00] opacity-5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-md text-center relative z-10 text-white">
          <div className="mb-10 flex flex-col items-center">
            {/* Logo container */}
            <div className="w-64 h-64 flex items-center justify-center mb-6 shadow-2xl p-4">
              <img 
                src="/img/logo.jpeg" 
                alt="Logo Descompliquei" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <p className="text-3xl leading-relaxed font-bold tracking-tight">
            Gestão inteligente de<br/>
            <span className="text-[#FF7F00]">Marketing e Relacionamento</span>
          </p>
          <div className="mt-12 space-y-5 text-white/90 text-left pl-8 border-l-2 border-[#FF7F00]/30">
            <div className="flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-[#FF7F00]" />
              <span>Automação de WhatsApp</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-[#FF7F00]" />
              <span>Gestão de Leads Integrada</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-[#FF7F00]" />
              <span>Relatórios Estratégicos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {isSignUp ? 'Criar conta' : 'CRM Descompliquei'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isSignUp ? 'Preencha os dados para criar sua conta' : 'Acesse o sistema do seu negócio'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  className="h-12 border-slate-200 focus:border-[#FF7F00]"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@empresa.com"
                className="h-12 border-slate-200 focus:border-[#FF7F00]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 pr-10 border-slate-200 focus:border-[#FF7F00]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" className="data-[state=checked]:bg-[#FF7F00] data-[state=checked]:border-[#FF7F00]" />
                  <label
                    htmlFor="remember"
                    className="text-sm text-slate-600 cursor-pointer"
                  >
                    Lembrar-me
                  </label>
                </div>
              </div>
            )}

            <Button className="w-full h-12 text-base bg-[#FF7F00] hover:bg-[#e67300] text-white font-bold transition-all shadow-md hover:shadow-lg" size="lg" type="submit" disabled={loading}>
              {loading ? 'Processando...' : (isSignUp ? 'Criar conta' : 'Entrar')}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            {isSignUp ? 'Já possui acesso?' : 'Não possui acesso?'}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[#FF7F00] hover:text-[#e67300] font-medium underline-offset-4 hover:underline"
            >
              {isSignUp ? 'Fazer login' : 'Solicitar conta'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}