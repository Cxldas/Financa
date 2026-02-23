import { useState, useEffect } from 'react';
import { goalsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  Plus, 
  Target, 
  Pencil, 
  Trash2,
  CalendarIcon,
  Trophy,
  Home,
  Plane,
  Wallet,
  Car,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const GOAL_ICONS = [
  { name: 'target', label: 'Meta', icon: Target },
  { name: 'trophy', label: 'Conquista', icon: Trophy },
  { name: 'home', label: 'Casa', icon: Home },
  { name: 'plane', label: 'Viagem', icon: Plane },
  { name: 'wallet', label: 'Reserva', icon: Wallet },
  { name: 'car', label: 'Carro', icon: Car },
  { name: 'graduation-cap', label: 'Educação', icon: GraduationCap },
  { name: 'shield-check', label: 'Emergência', icon: ShieldCheck },
];

const COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
];

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    deadline: null,
    icon: 'target',
    color: '#6366f1'
  });
  const [formLoading, setFormLoading] = useState(false);

  // Add amount modal
  const [addAmountModalOpen, setAddAmountModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [addAmount, setAddAmount] = useState('');

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState(null);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const response = await goalsApi.list();
      setGoals(response.data);
    } catch (error) {
      toast.error('Erro ao carregar metas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleOpenModal = (goal = null) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        name: goal.name,
        target_amount: goal.target_amount.toString(),
        current_amount: goal.current_amount.toString(),
        deadline: goal.deadline ? new Date(goal.deadline) : null,
        icon: goal.icon || 'target',
        color: goal.color
      });
    } else {
      setEditingGoal(null);
      setFormData({
        name: '',
        target_amount: '',
        current_amount: '0',
        deadline: null,
        icon: 'target',
        color: '#6366f1'
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = {
        ...formData,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount || '0'),
        deadline: formData.deadline?.toISOString() || null
      };

      if (editingGoal) {
        await goalsApi.update(editingGoal.id, payload);
        toast.success('Meta atualizada com sucesso!');
      } else {
        await goalsApi.create(payload);
        toast.success('Meta criada com sucesso!');
      }

      setModalOpen(false);
      loadGoals();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao salvar meta';
      toast.error(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddAmount = async () => {
    if (!selectedGoal || !addAmount) return;

    try {
      const newAmount = selectedGoal.current_amount + parseFloat(addAmount);
      await goalsApi.update(selectedGoal.id, { current_amount: newAmount });
      toast.success('Valor adicionado com sucesso!');
      setAddAmountModalOpen(false);
      setAddAmount('');
      setSelectedGoal(null);
      loadGoals();
    } catch (error) {
      toast.error('Erro ao adicionar valor');
    }
  };

  const handleDelete = async () => {
    if (!deletingGoal) return;

    try {
      await goalsApi.delete(deletingGoal.id);
      toast.success('Meta excluída com sucesso!');
      setDeleteModalOpen(false);
      setDeletingGoal(null);
      loadGoals();
    } catch (error) {
      toast.error('Erro ao excluir meta');
    }
  };

  const getIconComponent = (iconName) => {
    const iconData = GOAL_ICONS.find(i => i.name === iconName);
    return iconData ? iconData.icon : Target;
  };

  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <div className="space-y-6" data-testid="goals-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Metas Financeiras</h1>
          <p className="text-muted-foreground mt-1">
            Defina e acompanhe suas metas de economia
          </p>
        </div>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-500 btn-glow" 
          onClick={() => handleOpenModal()}
          data-testid="new-goal-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {/* Overall Progress */}
      {goals.length > 0 && (
        <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/30 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Progresso Geral</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {formatCurrency(totalCurrent)} 
                  <span className="text-lg text-muted-foreground"> de {formatCurrency(totalTarget)}</span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Conclusão</p>
                  <p className="text-2xl font-bold text-indigo-400">
                    {overallProgress.toFixed(1)}%
                  </p>
                </div>
                <Trophy className={`w-10 h-10 ${overallProgress >= 100 ? 'text-amber-500' : 'text-zinc-600'}`} />
              </div>
            </div>
            <Progress value={Math.min(overallProgress, 100)} className="mt-4 h-3" />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Target className="w-12 h-12 mb-4 opacity-50" />
            <p>Nenhuma meta definida</p>
            <Button 
              variant="link" 
              onClick={() => handleOpenModal()}
              className="text-indigo-500 mt-2"
            >
              Criar sua primeira meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => {
            const IconComponent = getIconComponent(goal.icon);
            const isCompleted = goal.progress >= 100;
            
            return (
              <Card 
                key={goal.id} 
                className={cn(
                  "bg-card border-border card-hover relative overflow-hidden",
                  isCompleted && "border-emerald-500/50"
                )}
                data-testid={`goal-${goal.id}`}
              >
                {isCompleted && (
                  <div className="absolute top-2 right-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="flex items-center justify-center w-12 h-12 rounded-xl"
                      style={{ backgroundColor: `${goal.color}20` }}
                    >
                      <IconComponent className="w-6 h-6" style={{ color: goal.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{goal.name}</h3>
                      {goal.deadline && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Prazo: {formatDate(goal.deadline)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(goal.current_amount)}
                      </span>
                      <span className="text-sm font-medium" style={{ color: goal.color }}>
                        {goal.progress.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(goal.progress, 100)} 
                      className="h-2"
                      style={{ '--progress-color': goal.color }}
                    />
                    <p className="text-right text-sm text-muted-foreground mt-2">
                      Meta: {formatCurrency(goal.target_amount)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setAddAmountModalOpen(true);
                      }}
                      data-testid={`add-amount-${goal.id}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenModal(goal)}
                      data-testid={`edit-goal-${goal.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingGoal(goal);
                        setDeleteModalOpen(true);
                      }}
                      className="text-red-500 hover:text-red-400"
                      data-testid={`delete-goal-${goal.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? 'Editar Meta' : 'Nova Meta'}
            </DialogTitle>
            <DialogDescription>
              {editingGoal ? 'Atualize os dados da meta' : 'Defina uma nova meta financeira'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Meta *</Label>
              <Input
                id="name"
                placeholder="Ex: Reserva de emergência, Viagem..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="goal-name-input"
                required
              />
            </div>

            {/* Target Amount */}
            <div className="space-y-2">
              <Label htmlFor="target_amount">Valor da Meta *</Label>
              <Input
                id="target_amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={formData.target_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, target_amount: e.target.value }))}
                data-testid="goal-target-input"
                required
              />
            </div>

            {/* Current Amount */}
            <div className="space-y-2">
              <Label htmlFor="current_amount">Valor Atual</Label>
              <Input
                id="current_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.current_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, current_amount: e.target.value }))}
                data-testid="goal-current-input"
              />
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label>Prazo (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.deadline && "text-muted-foreground"
                    )}
                    data-testid="goal-deadline-btn"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deadline ? format(formData.deadline, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.deadline}
                    onSelect={(date) => setFormData(prev => ({ ...prev, deadline: date }))}
                    locale={ptBR}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {GOAL_ICONS.map(icon => {
                  const IconComp = icon.icon;
                  return (
                    <button
                      key={icon.name}
                      type="button"
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
                        formData.icon === icon.name 
                          ? "bg-indigo-600 text-white" 
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                      onClick={() => setFormData(prev => ({ ...prev, icon: icon.name }))}
                      title={icon.label}
                    >
                      <IconComp className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform hover:scale-110",
                      formData.color === color && "ring-2 ring-offset-2 ring-offset-background ring-white"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500"
                disabled={formLoading}
                data-testid="submit-goal-btn"
              >
                {formLoading ? 'Salvando...' : (editingGoal ? 'Atualizar' : 'Criar')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Amount Modal */}
      <Dialog open={addAmountModalOpen} onOpenChange={setAddAmountModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adicionar Valor</DialogTitle>
            <DialogDescription>
              Adicione um valor à meta "{selectedGoal?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor a Adicionar</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                data-testid="add-amount-input"
              />
            </div>
            {selectedGoal && (
              <p className="text-sm text-muted-foreground">
                Valor atual: {formatCurrency(selectedGoal.current_amount)} → 
                Novo valor: {formatCurrency(selectedGoal.current_amount + parseFloat(addAmount || '0'))}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddAmountModalOpen(false);
              setAddAmount('');
            }}>
              Cancelar
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-500"
              onClick={handleAddAmount}
              disabled={!addAmount || parseFloat(addAmount) <= 0}
              data-testid="confirm-add-amount-btn"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir Meta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a meta "{deletingGoal?.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              data-testid="confirm-delete-goal-btn"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalsPage;
