import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import type { Budget } from '@/types';

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  fetchBudgets: (bookId: string) => Promise<void>;
  saveBudget: (data: { id?: string; bookId: string; categoryId?: string; amount: number; alertThreshold: number }) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  subscribeToBudgetChanges: (bookId: string) => (() => void);
}

export const useBudgetStore = create<BudgetState>()((set, get) => ({
  budgets: [],
  isLoading: false,

  fetchBudgets: async (bookId) => {
    if (!bookId) return;
    set({ isLoading: true });

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('book_id', bookId);

      if (error) throw error;

      const budgets: Budget[] = (data || []).map((item: any) => ({
        id: item.id,
        bookId: item.book_id,
        categoryId: item.category_id || undefined,
        year: item.year || new Date().getFullYear(),
        month: item.month || new Date().getMonth() + 1,
        amount: item.amount,
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.updated_at,
        alertThreshold: item.alert_threshold,
        period: item.period,
      } as Budget & { alertThreshold: number; period: 'monthly' | 'yearly' }));

      set({ budgets });
    } catch (error) {
      console.error('Fetch budgets error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveBudget: async ({ id, bookId, categoryId, amount, alertThreshold }) => {
    const payload = {
      book_id: bookId,
      category_id: categoryId || null,
      amount,
      period: 'monthly',
      alert_threshold: alertThreshold,
    };

    if (id) {
      const { error } = await supabase.from('budgets').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('budgets').insert(payload);
      if (error) throw error;
    }

    await get().fetchBudgets(bookId);
  },

  deleteBudget: async (budgetId) => {
    const { error } = await supabase.from('budgets').delete().eq('id', budgetId);
    if (error) throw error;
  },

  subscribeToBudgetChanges: (bookId: string) => {
    const channel = supabase
      .channel(`budgets_${bookId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `book_id=eq.${bookId}`,
        },
        async () => {
          await get().fetchBudgets(bookId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `book_id=eq.${bookId}`,
        },
        async () => {
          await get().fetchBudgets(bookId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
