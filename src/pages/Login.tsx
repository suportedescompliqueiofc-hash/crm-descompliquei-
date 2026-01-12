import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
      {/* Left Side - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a0a0a] items-center justify-center p-12 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-md text-center relative z-10">
          <div className="mb-10 flex flex-col items-center">
            <img 
              src="https://mtnzghazudfnetcnleis.supabase.co/storage/v1/object/public/uploads/Teste/Logo%20Viviane%20Braga%20adv.webp" 
              alt="Logo Viviane Braga" 
              className="h-32 w-auto mb-6 object-contain opacity-90"
            />
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto rounded-full mb-6" />
          </div>
          <p className="text-2xl text-white/90 leading-relaxed font-light tracking-wide">
            Excelência e compromisso na<br/>
            <span className="text-primary font-medium">gestão jurídica</span>
          </p>
          <div className="mt-12 space-y-5 text-white/70 text-left pl-8 border-l border-white/10">
            <div className="flex items-center gap-4">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Controle processual inteligente</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Gestão eficiente de clientes</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Automação de atendimento</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-foreground font-serif tracking-tight">
              {isSignUp ? 'Criar conta' : 'Acesso ao Sistema'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isSignUp ? 'Preencha os dados para criar sua conta profissional' : 'Entre com suas credenciais de acesso'}
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
                  className="h-12 border-muted-foreground/20 focus:border-primary"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email corporativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="advogado@vivianebraga.com"
                className="h-12 border-muted-foreground/20 focus:border-primary"
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
                  className="h-12 pr-10 border-muted-foreground/20 focus:border-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <label
                    htmlFor="remember"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Lembrar-me
                  </label>
                </div>
              </div>
            )}

            <Button className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all shadow-md hover:shadow-lg" size="lg" type="submit" disabled={loading}>
              {loading ? 'Processando...' : (isSignUp ? 'Criar conta' : 'Entrar')}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? 'Já possui acesso?' : 'Não possui acesso?'}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline"
            >
              {isSignUp ? 'Fazer login' : 'Solicitar conta'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}