import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { reportsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage } from '../lib/utils';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const DashboardPage = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await reportsApi.dashboard();
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Erro ao carregar dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { 
    current_balance = 0, 
    total_income = 0, 
    total_expense = 0, 
    income_vs_expense_change = 0,
    expenses_by_category = [],
    income_vs_expense_daily = [],
    monthly_comparison = [],
    recent_transactions = []
  } = dashboardData || {};

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-300 font-medium mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-300 font-medium">{payload[0].name}</p>
          <p className="text-sm" style={{ color: payload[0].payload.color }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Olá, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está o resumo das suas finanças
          </p>
        </div>
        <Link to="/transactions">
          <Button className="bg-indigo-600 hover:bg-indigo-500 btn-glow" data-testid="new-transaction-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {/* Balance */}
        <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/30 border-zinc-800 card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20">
                <Wallet className="w-6 h-6 text-indigo-400" />
              </div>
              <span className={`flex items-center text-sm font-medium ${income_vs_expense_change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {income_vs_expense_change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {formatPercentage(income_vs_expense_change)}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Saldo Atual</p>
              <p className={`text-2xl font-bold ${current_balance >= 0 ? 'text-foreground' : 'text-red-500'}`} data-testid="current-balance">
                {formatCurrency(current_balance)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Income */}
        <Card className="bg-card border-border card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Receitas do Mês</p>
              <p className="text-2xl font-bold text-emerald-500" data-testid="total-income">
                {formatCurrency(total_income)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="bg-card border-border card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Despesas do Mês</p>
              <p className="text-2xl font-bold text-red-500" data-testid="total-expense">
                {formatCurrency(total_expense)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Month Balance */}
        <Card className="bg-card border-border card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/10">
                <Calendar className="w-6 h-6 text-violet-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Balanço do Mês</p>
              <p className={`text-2xl font-bold ${(total_income - total_expense) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(total_income - total_expense)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses_by_category.length > 0 ? (
              <div className="h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={expenses_by_category}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="amount"
                      nameKey="name"
                    >
                      {expenses_by_category.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {expenses_by_category.slice(0, 5).map((cat, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-muted-foreground">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma despesa registrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Income vs Expense */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {income_vs_expense_daily.length > 0 ? (
              <div className="h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={income_vs_expense_daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#71717a" 
                      fontSize={12}
                      tickFormatter={(value) => value.split('-')[2]}
                    />
                    <YAxis 
                      stroke="#71717a" 
                      fontSize={12}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      name="Receitas"
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expense" 
                      name="Despesas"
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma transação registrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Comparison */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Comparativo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] min-w-0">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthly_comparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} tickFormatter={(value) => `R$${value}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Transações Recentes</CardTitle>
            <Link to="/transactions">
              <Button variant="ghost" size="sm" className="text-indigo-500 hover:text-indigo-400">
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recent_transactions.length > 0 ? (
              <div className="space-y-3">
                {recent_transactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${tx.category_color}20` }}
                      >
                        {tx.type === 'INCOME' ? (
                          <TrendingUp className="w-5 h-5" style={{ color: tx.category_color }} />
                        ) : (
                          <TrendingDown className="w-5 h-5" style={{ color: tx.category_color }} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {tx.category_name} • {formatDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Nenhuma transação recente
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
