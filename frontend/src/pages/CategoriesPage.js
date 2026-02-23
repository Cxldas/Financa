import { useState, useEffect } from 'react';
import { categoriesApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
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
  Pencil, 
  Trash2,
  Tags,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight
} from 'lucide-react';
import { categoryTypeLabels } from '../lib/utils';
import { toast } from 'sonner';

const ICONS = [
  { name: 'utensils', label: 'Alimentação' },
  { name: 'car', label: 'Transporte' },
  { name: 'home', label: 'Moradia' },
  { name: 'heart-pulse', label: 'Saúde' },
  { name: 'graduation-cap', label: 'Educação' },
  { name: 'gamepad-2', label: 'Lazer' },
  { name: 'tv', label: 'Assinaturas' },
  { name: 'trending-up', label: 'Investimentos' },
  { name: 'wallet', label: 'Carteira' },
  { name: 'laptop', label: 'Tecnologia' },
  { name: 'shopping-bag', label: 'Compras' },
  { name: 'gift', label: 'Presentes' },
  { name: 'plane', label: 'Viagens' },
  { name: 'music', label: 'Música' },
  { name: 'dumbbell', label: 'Academia' },
  { name: 'more-horizontal', label: 'Outros' },
];

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#71717a', '#18181b'
];

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE',
    color: '#6366f1',
    icon: 'more-horizontal'
  });
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [reassignCategoryId, setReassignCategoryId] = useState('');

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesApi.list();
      setCategories(response.data);
    } catch (error) {
      toast.error('Erro ao carregar categorias');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon || 'more-horizontal'
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        type: 'EXPENSE',
        color: '#6366f1',
        icon: 'more-horizontal'
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, formData);
        toast.success('Categoria atualizada com sucesso!');
      } else {
        await categoriesApi.create(formData);
        toast.success('Categoria criada com sucesso!');
      }

      setModalOpen(false);
      loadCategories();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao salvar categoria';
      toast.error(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      await categoriesApi.delete(deletingCategory.id, reassignCategoryId || null);
      toast.success('Categoria excluída com sucesso!');
      setDeleteModalOpen(false);
      setDeletingCategory(null);
      setReassignCategoryId('');
      loadCategories();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao excluir categoria';
      toast.error(message);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'INCOME':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'EXPENSE':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <ArrowLeftRight className="w-4 h-4 text-violet-500" />;
    }
  };

  const incomeCategories = categories.filter(c => c.type === 'INCOME' || c.type === 'BOTH');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE' || c.type === 'BOTH');

  return (
    <div className="space-y-6" data-testid="categories-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categorias</h1>
          <p className="text-muted-foreground mt-1">
            Organize suas transações em categorias
          </p>
        </div>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-500 btn-glow" 
          onClick={() => handleOpenModal()}
          data-testid="new-category-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Tags className="w-12 h-12 mb-4 opacity-50" />
            <p>Nenhuma categoria encontrada</p>
            <Button 
              variant="link" 
              onClick={() => handleOpenModal()}
              className="text-indigo-500 mt-2"
            >
              Criar sua primeira categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Categories */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <CardTitle className="text-lg">Categorias de Receita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {incomeCategories.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Nenhuma categoria de receita
                </p>
              ) : (
                incomeCategories.map(cat => (
                  <div 
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    data-testid={`category-${cat.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: cat.color }} 
                        />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryTypeLabels[cat.type]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(cat)}
                        data-testid={`edit-cat-${cat.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingCategory(cat);
                          setDeleteModalOpen(true);
                        }}
                        className="text-red-500 hover:text-red-400"
                        data-testid={`delete-cat-${cat.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Expense Categories */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <CardTitle className="text-lg">Categorias de Despesa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {expenseCategories.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Nenhuma categoria de despesa
                </p>
              ) : (
                expenseCategories.map(cat => (
                  <div 
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    data-testid={`category-${cat.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: cat.color }} 
                        />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryTypeLabels[cat.type]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(cat)}
                        data-testid={`edit-cat-${cat.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingCategory(cat);
                          setDeleteModalOpen(true);
                        }}
                        className="text-red-500 hover:text-red-400"
                        data-testid={`delete-cat-${cat.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Atualize os dados da categoria' : 'Preencha os dados da nova categoria'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: Alimentação, Salário..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="category-name-input"
                required
                minLength={2}
                maxLength={50}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger data-testid="category-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      Despesa
                    </div>
                  </SelectItem>
                  <SelectItem value="INCOME">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Receita
                    </div>
                  </SelectItem>
                  <SelectItem value="BOTH">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-violet-500" />
                      Ambos
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-offset-background ring-white' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
              >
                <SelectTrigger data-testid="category-icon-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICONS.map(icon => (
                    <SelectItem key={icon.name} value={icon.name}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500"
                disabled={formLoading}
                data-testid="submit-category-btn"
              >
                {formLoading ? 'Salvando...' : (editingCategory ? 'Atualizar' : 'Criar')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir Categoria</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a categoria "{deletingCategory?.name}"?
              <br /><br />
              Se houver transações vinculadas, selecione uma categoria para reatribuí-las:
            </DialogDescription>
          </DialogHeader>
          
          <Select
            value={reassignCategoryId}
            onValueChange={setReassignCategoryId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma categoria (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter(c => c.id !== deletingCategory?.id)
                .map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteModalOpen(false);
              setReassignCategoryId('');
            }}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              data-testid="confirm-delete-category-btn"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesPage;
