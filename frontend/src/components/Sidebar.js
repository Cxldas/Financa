import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Tags, 
  BarChart3, 
  Target, 
  Settings,
  LogOut,
  Sun,
  Moon,
  Wallet
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { path: '/categories', label: 'Categorias', icon: Tags },
  { path: '/reports', label: 'Relatórios', icon: BarChart3 },
  { path: '/goals', label: 'Metas', icon: Target },
  { path: '/settings', label: 'Configurações', icon: Settings },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-64 flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-foreground font-heading">FinGestão</h1>
          <p className="text-xs text-muted-foreground">Gestão Financeira</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            data-testid={`nav-${item.path.slice(1)}`}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          data-testid="theme-toggle"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-5 h-5" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5" />
              <span>Modo Escuro</span>
            </>
          )}
        </Button>

        {/* User Info */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600/20 text-indigo-500 font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full justify-start gap-3 text-red-500 hover:text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
