import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { 
  User, 
  Moon, 
  Sun, 
  Shield, 
  LogOut,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim() || name === user?.name) return;
    
    setLoading(true);
    try {
      await updateUser({ name: name.trim() });
      toast.success('Nome atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar nome');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências e conta
        </p>
      </div>

      {/* Profile Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600/20">
              <User className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Perfil</CardTitle>
              <CardDescription>Informações da sua conta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="settings-name-input"
                placeholder="Seu nome"
              />
              <Button 
                onClick={handleSaveName}
                disabled={loading || !name.trim() || name === user?.name}
                data-testid="save-name-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-600/20">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-violet-400" />
              ) : (
                <Sun className="w-5 h-5 text-violet-400" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">Aparência</CardTitle>
              <CardDescription>Personalize a interface</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Modo Escuro</p>
              <p className="text-sm text-muted-foreground">
                {theme === 'dark' ? 'Ativado' : 'Desativado'}
              </p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              data-testid="theme-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-600/20">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Segurança</CardTitle>
              <CardDescription>Configurações de segurança da conta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-foreground">Autenticação</p>
              <p className="text-sm text-muted-foreground">
                JWT com Refresh Token
              </p>
            </div>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-500">
              Ativo
            </span>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-foreground">Rate Limiting</p>
              <p className="text-sm text-muted-foreground">
                Proteção contra ataques de força bruta
              </p>
            </div>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-500">
              Ativo
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Logout Card */}
      <Card className="bg-card border-border border-red-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-600/20">
              <LogOut className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Sair da Conta</CardTitle>
              <CardDescription>Encerrar sua sessão atual</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            onClick={handleLogout}
            data-testid="logout-btn"
            className="w-full md:w-auto"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>FinGestão v1.0.0</p>
        <p>Sistema de Gestão Financeira Pessoal</p>
      </div>
    </div>
  );
};

export default SettingsPage;
