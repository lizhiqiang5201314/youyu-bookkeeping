import { useState, useEffect } from 'react';
import { useBookStore } from '@/stores/bookStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';
import { Wallet, AlertCircle, Edit2, Plus, Trash2 } from 'lucide-react';
import { formatAmount, getDateRange } from '@/utils/constants';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

interface Budget {
  id: string;
  bookId: string;
  categoryId?: string;
  amount: number;
  period: 'monthly' | 'yearly';
  alertThreshold: number;
  createdAt: string;
}

export function BudgetPage() {
  const { currentBook, categories, fetchCategories } = useBookStore();
  const { getTransactionsByDateRange, fetchTransactions } = useTransactionStore();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // 预算表单
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [alertThreshold, setAlertThreshold] = useState('80');

  useEffect(() => {
    if (currentBook) {
      fetchBudgets();
      fetchTransactions(currentBook.id);
      fetchCategories(currentBook.id);
    }
  }, [currentBook, fetchTransactions, fetchCategories]);

  const fetchBudgets = async () => {
    if (!currentBook) return;
    
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('book_id', currentBook.id);

    if (error) {
      console.error('Fetch budgets error:', error);
      return;
    }

    setBudgets(data || []);
  };

  const handleSaveBudget = async () => {
    if (!currentBook) {
      toast.error('请先选择账本');
      return;
    }
    if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
      toast.error('请输入预算金额');
      return;
    }

    setIsLoading(true);
    
    try {
      const budgetData = {
        book_id: currentBook.id,
        category_id: selectedCategoryId || null,
        amount: Math.round(parseFloat(budgetAmount) * 100),
        period: 'monthly',
        alert_threshold: parseInt(alertThreshold),
      };

      if (editingBudget) {
        const { error } = await supabase
          .from('budgets')
          .update(budgetData)
          .eq('id', editingBudget.id);

        if (error) throw error;
        toast.success('预算修改成功');
      } else {
        const { error } = await supabase
          .from('budgets')
          .insert(budgetData);

        if (error) throw error;
        toast.success('预算设置成功');
      }

      setShowAddModal(false);
      setEditingBudget(null);
      resetForm();
      fetchBudgets();
    } catch (error) {
      console.error('Save budget error:', error);
      toast.error('保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', budgetId);

    if (error) {
      toast.error('删除失败');
      return;
    }

    toast.success('删除成功');
    fetchBudgets();
  };

  const resetForm = () => {
    setBudgetAmount('');
    setSelectedCategoryId(undefined);
    setAlertThreshold('80');
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setBudgetAmount((budget.amount / 100).toString());
    setSelectedCategoryId(budget.categoryId);
    setAlertThreshold(budget.alertThreshold.toString());
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setEditingBudget(null);
    resetForm();
    setShowAddModal(true);
  };

  // 计算预算使用情况
  const getBudgetUsage = (budget: Budget) => {
    if (!currentBook) return { spent: 0, percentage: 0 };
    
    const dateRange = getDateRange('month');
    const transactions = getTransactionsByDateRange(currentBook.id, dateRange, 'EXPENSE');
    
    const spent = transactions
      .filter(t => !budget.categoryId || t.categoryId === budget.categoryId)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const percentage = Math.min(Math.round((spent / budget.amount) * 100), 100);
    
    return { spent, percentage };
  };

  const expenseCategories = categories.filter((c: Category) => c.type === 'EXPENSE');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 px-4 pt-12 pb-8">
        <h1 className="text-2xl font-bold text-white">预算管理</h1>
        <p className="text-white/80 mt-1">设置月度预算，合理控制支出</p>
      </div>

      <div className="px-4 -mt-4">
        <Button
          onClick={openAddModal}
          className="w-full bg-white shadow-lg hover:bg-gray-50 text-teal-600 border border-teal-100"
        >
          <Plus className="w-4 h-4 mr-2" />
          设置新预算
        </Button>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {budgets.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无预算设置</p>
              <p className="text-gray-400 text-sm mt-1">点击上方按钮添加预算</p>
            </CardContent>
          </Card>
        ) : (
          budgets.map((budget) => {
            const { spent, percentage } = getBudgetUsage(budget);
            const category = expenseCategories.find((c: Category) => c.id === budget.categoryId);
            const isOverBudget = spent > budget.amount;
            const isNearLimit = percentage >= budget.alertThreshold;
            
            return (
              <Card key={budget.id} className={cn(
                'border-0 shadow-sm',
                isOverBudget && 'border-l-4 border-l-red-500'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {category?.name || '总预算'}
                      </p>
                      <p className="text-sm text-gray-500">
                        已用 {formatAmount(spent)} / 预算 {formatAmount(budget.amount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(isOverBudget || isNearLimit) && (
                        <AlertCircle className={cn(
                          'w-5 h-5',
                          isOverBudget ? 'text-red-500' : 'text-yellow-500'
                        )} />
                      )}
                      <button
                        onClick={() => openEditModal(budget)}
                        className="p-2 hover:bg-gray-100 rounded-full"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteBudget(budget.id)}
                        className="p-2 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                  
                  <Progress 
                    value={percentage} 
                    className={cn(
                      'h-2',
                      isOverBudget && 'bg-red-100',
                      isNearLimit && !isOverBudget && 'bg-yellow-100'
                    )}
                  />
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className={cn(
                      'text-sm font-medium',
                      isOverBudget ? 'text-red-600' : 
                      isNearLimit ? 'text-yellow-600' : 'text-gray-500'
                    )}>
                      {percentage}%
                    </span>
                    {isOverBudget && (
                      <span className="text-xs text-red-500">超支提醒</span>
                    )}
                    {isNearLimit && !isOverBudget && (
                      <span className="text-xs text-yellow-500">即将超支</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 添加/编辑预算弹窗 */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBudget ? '编辑预算' : '设置预算'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700">预算分类</label>
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value || undefined)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                <option value="">全部分类（总预算）</option>
                {expenseCategories.map((cat: Category) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">预算金额（元）</label>
              <Input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="输入预算金额"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">提醒阈值（%）</label>
              <div className="flex items-center gap-4 mt-1">
                <Input
                  type="range"
                  min="50"
                  max="100"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500 w-12">{alertThreshold}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                当支出达到预算的 {alertThreshold}% 时提醒
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddModal(false)}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-teal-500 hover:bg-teal-600"
                onClick={handleSaveBudget}
                disabled={isLoading}
              >
                {isLoading ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
