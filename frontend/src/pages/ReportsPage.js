import { useState, useEffect } from 'react';
import { reportsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatCurrency, formatPercentage, getMonthName } from '../lib/utils';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { toast } from 'sonner';

const ReportsPage = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await reportsApi.monthly(selectedMonth, selectedYear);
      setReportData(response.data);
    } catch (error) {
      toast.error('Erro ao carregar relatório');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedMonth, selectedYear]);

  const handleExportCsv = async () => {
    try {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

      const response = await reportsApi.exportCsv({ start_date: startDate, end_date: endDate });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_${selectedMonth}_${selectedYear}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
    }
  };

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const {
    total_income = 0,
    total_expense = 0,
    balance = 0,
    income_change,
    expense_change,
    top_expense_categories = [],
    daily_balance = []
  } = reportData || {};

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada das suas finanças
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
          >
            <SelectTrigger className="w-[140px]" data-testid="month-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Selector */}
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[100px]" data-testid="year-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={handleExportCsv}
            data-testid="export-report-csv-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Income */}
        <Card className="bg-card border-border card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              {income_change !== null && (
                <span className={`flex items-center text-sm font-medium ${income_change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {income_change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {formatPercentage(income_change)}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Total de Receitas</p>
              <p className="text-2xl font-bold text-emerald-500" data-testid="report-income">
                {formatCurrency(total_income)}
              </p>
              {income_change !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  vs. mês anterior
                </p>
              )}
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
              {expense_change !== null && (
                <span className={`flex items-center text-sm font-medium ${expense_change <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {expense_change <= 0 ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  {formatPercentage(expense_change)}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Total de Despesas</p>
              <p className="text-2xl font-bold text-red-500" data-testid="report-expense">
                {formatCurrency(total_expense)}
              </p>
              {expense_change !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  vs. mês anterior
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/30 border-zinc-800 card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20">
                <Wallet className="w-6 h-6 text-indigo-400" />
              </div>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Saldo do Mês</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`} data-testid="report-balance">
                {formatCurrency(balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {getMonthName(selectedMonth)} de {selectedYear}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Expense Categories */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top 5 Categorias de Despesa</CardTitle>
          </CardHeader>
          <CardContent>
            {top_expense_categories.length > 0 ? (
              <div className="h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={top_expense_categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="amount"
                      nameKey="name"
                    >
                      {top_expense_categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {top_expense_categories.map((cat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm text-muted-foreground">{cat.name}</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(cat.amount)}</span>
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

        {/* Daily Balance */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Evolução Diária</CardTitle>
          </CardHeader>
          <CardContent>
            {daily_balance.length > 0 ? (
              <div className="h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={daily_balance}>
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
                    <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma transação no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Month Summary */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Resumo de {getMonthName(selectedMonth)} de {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Transações de Receita</p>
              <p className="text-xl font-bold text-emerald-500">{formatCurrency(total_income)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Transações de Despesa</p>
              <p className="text-xl font-bold text-red-500">{formatCurrency(total_expense)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Economia do Mês</p>
              <p className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Taxa de Economia</p>
              <p className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {total_income > 0 ? `${((balance / total_income) * 100).toFixed(1)}%` : '0%'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
