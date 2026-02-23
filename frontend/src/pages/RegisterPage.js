import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Wallet, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }

    if (password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password, confirmPassword);
      toast.success('Conta criada com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao criar conta';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-2xl text-foreground">FinGestão</h1>
              <p className="text-sm text-muted-foreground">Gestão Financeira Pessoal</p>
            </div>
          </div>

          {/* Card */}
          <Card className="border-border bg-card">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
              <CardDescription>
                Preencha os dados para criar sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      data-testid="register-name"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="register-email"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="register-password"
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres, 1 maiúscula, 1 minúscula e 1 número
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      data-testid="register-confirm-password"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 btn-glow"
                  disabled={loading}
                  data-testid="register-submit"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Criando conta...
                    </span>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Já tem uma conta? </span>
                <Link to="/login" className="text-indigo-500 hover:text-indigo-400 font-medium">
                  Entrar
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Hero Image */}
      <div 
        className="hidden lg:flex flex-1 items-center justify-center p-12 bg-cover bg-center relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1694852860772-ec8598c72c15?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwyfHwzZCUyMGFic3RyYWN0JTIwZGFyayUyMHNoYXBlcyUyMGZpbmFuY2UlMjB0ZWNobm9sb2d5fGVufDB8fHx8MTc3MTg1NDU4OHww&ixlib=rb-4.1.0&q=85)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-zinc-900/60 to-zinc-900/80" />
        <div className="relative z-10 text-center space-y-6 max-w-lg">
          <h2 className="text-4xl font-bold text-white">
            Comece sua jornada financeira hoje
          </h2>
          <p className="text-lg text-zinc-300">
            Crie sua conta gratuita e comece a organizar suas finanças em minutos.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur">
              <p className="text-2xl font-bold text-indigo-400">Fácil</p>
              <p className="text-xs text-zinc-400">de usar</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur">
              <p className="text-2xl font-bold text-emerald-400">Rápido</p>
              <p className="text-xs text-zinc-400">e eficiente</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur">
              <p className="text-2xl font-bold text-violet-400">Seguro</p>
              <p className="text-xs text-zinc-400">e privado</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
