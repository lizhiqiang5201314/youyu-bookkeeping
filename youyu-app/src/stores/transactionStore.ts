import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from '@/services/storage';
import { supabase } from '@/services/supabase';
import { db, parseDate } from '@/services/db';
import type { Transaction, TransactionType, DateRange, Summary, CategoryStat } from '@/types';
import { getDateRange } from '@/utils/constants';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  isSyncing: boolean;
  selectedDateRange: DateRange;
  
  // Actions
  fetchTransactions: (bookId: string) => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>, userId: string) => Promise<Transaction | null>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  setDateRange: (range: DateRange) => void;
  syncWithCloud: (bookId: string) => Promise<void>;
  
  // Queries
  getTransactionsByBook: (bookId: string) => Transaction[];
  getTransactionsByDateRange: (bookId: string, range: DateRange, type?: TransactionType) => Transaction[];
  getSummary: (bookId: string, range: DateRange) => Summary;
  getCategoryStats: (bookId: string, range: DateRange, type: TransactionType, categories: any[]) => CategoryStat[];
  getTrendData: (bookId: string, range: 'day' | 'week' | 'month' | 'year', date: Date) => { labels: string[]; income: number[]; expense: number[] };
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      isLoading: false,
      isSyncing: false,
      selectedDateRange: getDateRange('month'),

      fetchTransactions: async (bookId) => {
        set({ isLoading: true });
        
        try {
          // 1. 先读本地（快速响应）
          const localTxs = await db.transactions.where('bookId').equals(bookId).toArray();
          if (localTxs.length > 0) {
            const transactions = localTxs.map(t => ({
              id: t.id,
              bookId: t.bookId,
              userId: t.userId,
              categoryId: t.categoryId,
              amount: t.amount,
              type: t.type as TransactionType,
              description: t.description,
              recordDate: t.recordDate,
              images: t.images || [],
              createdAt: t.createdAt,
            }));
            
            set({ transactions });
          }

          // 2. 后台同步云端（等待完成）
          await get().syncWithCloud(bookId);
        } finally {
          set({ isLoading: false });
        }
      },

      syncWithCloud: async (bookId) => {
        if (get().isSyncing) return;
        set({ isSyncing: true });

        try {
          const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('book_id', bookId)
            .order('record_date', { ascending: false });

          if (error) {
            console.error('Sync transactions error:', error);
            return;
          }

          if (data) {
            const cloudTxs: Transaction[] = data.map((t: any) => ({
              id: t.id,
              bookId: t.book_id,
              userId: t.user_id,
              categoryId: t.category_id,
              amount: t.amount,
              type: t.type as TransactionType,
              description: t.description,
              recordDate: t.record_date,
              images: t.images || [],
              createdAt: t.created_at,
            }));

            // 合并到本地
            await db.transactions.bulkPut(
              cloudTxs.map(t => ({ ...t, synced: true, lastModified: Date.now() }))
            );

            set({ transactions: cloudTxs });
          }
        } catch (error) {
          console.error('Sync error:', error);
        } finally {
          set({ isSyncing: false });
        }
      },

      addTransaction: async (data, userId) => {
        if (!userId) return null;

        const transaction: Transaction = {
          id: crypto.randomUUID(),
          bookId: data.bookId,
          userId: userId,
          categoryId: data.categoryId,
          amount: data.amount,
          type: data.type,
          description: data.description,
          recordDate: data.recordDate,
          images: data.images || [],
          createdAt: new Date().toISOString(),
        };

        // 1. 先存本地（即时响应）
        await db.transactions.put({
          ...transaction,
          synced: false,
          lastModified: Date.now(),
        });

        set(state => ({
          transactions: [transaction, ...state.transactions],
        }));

        // 2. 后台同步云端（不阻塞用户）
        (async () => {
          try {
            const { data: txData, error } = await supabase
              .from('transactions')
              .insert({
                id: transaction.id,
                book_id: transaction.bookId,
                user_id: transaction.userId,
                category_id: transaction.categoryId,
                amount: transaction.amount,
                type: transaction.type,
                description: transaction.description,
                record_date: transaction.recordDate,
                images: transaction.images,
              })
              .select()
              .single();

            if (!error && txData) {
              await db.transactions.update(transaction.id, { synced: true });
            }
          } catch (error) {
            console.error('Sync transaction error:', error);
          }
        })();

        return transaction;
      },

      updateTransaction: async (id, data) => {
        // 更新本地
        await db.transactions.update(id, {
          ...data,
          synced: false,
          lastModified: Date.now(),
        });

        // 更新状态（避免重新读取数据库）
        set(state => ({
          transactions: state.transactions.map(t =>
            t.id === id ? { ...t, ...data } : t
          ),
        }));

        // 后台同步云端（不阻塞）
        (async () => {
          try {
            const updateData: any = {};
            if (data.categoryId) updateData.category_id = data.categoryId;
            if (data.amount !== undefined) updateData.amount = data.amount;
            if (data.type) updateData.type = data.type;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.recordDate) updateData.record_date = data.recordDate;
            if (data.images) updateData.images = data.images;

            await supabase.from('transactions').update(updateData).eq('id', id);
            await db.transactions.update(id, { synced: true });
          } catch (error) {
            console.error('Update transaction sync error:', error);
          }
        })();
      },

      deleteTransaction: async (id) => {
        // 删除本地
        await db.transactions.delete(id);

        set(state => ({
          transactions: state.transactions.filter(t => t.id !== id),
        }));

        // 后台同步云端（不阻塞）
        (async () => {
          try {
            await supabase.from('transactions').delete().eq('id', id);
          } catch (error) {
            console.error('Delete transaction sync error:', error);
          }
        })();
      },

      setDateRange: (range) => {
        set({ selectedDateRange: range });
      },

      getTransactionsByBook: (bookId) => {
        return get().transactions
          .filter(t => t.bookId === bookId)
          .sort((a, b) => parseDate(b.recordDate).getTime() - parseDate(a.recordDate).getTime());
      },

      getTransactionsByDateRange: (bookId, range, type) => {
        const startTime = range.start.getTime();
        const endTime = range.end.getTime();
        
        return get().transactions.filter(t => {
          const recordTime = parseDate(t.recordDate).getTime();
          const inRange = t.bookId === bookId && recordTime >= startTime && recordTime <= endTime;
          return type ? inRange && t.type === type : inRange;
        });
      },

      getSummary: (bookId, range) => {
        const transactions = get().getTransactionsByDateRange(bookId, range);
        
        const income = transactions
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const expense = transactions
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          income,
          expense,
          balance: income - expense,
        };
      },

      getCategoryStats: (bookId, range, type, categories) => {
        const transactions = get().getTransactionsByDateRange(bookId, range, type);
        
        const categoryMap = new Map<string, { amount: number; count: number }>();
        
        transactions.forEach(t => {
          const current = categoryMap.get(t.categoryId) || { amount: 0, count: 0 };
          categoryMap.set(t.categoryId, {
            amount: current.amount + t.amount,
            count: current.count + 1,
          });
        });

        const total = Array.from(categoryMap.values()).reduce((sum, v) => sum + v.amount, 0);
        
        return Array.from(categoryMap.entries())
          .map(([categoryId, data]) => {
            const category = categories.find((c: any) => c.id === categoryId);
            return {
              categoryId,
              name: category?.name || '未知分类',
              amount: data.amount,
              percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
              color: category?.color || '#999',
              icon: category?.icon || '📦',
              count: data.count,
            };
          })
          .sort((a, b) => b.amount - a.amount);
      },

      getTrendData: (bookId, range, date) => {
        const { start, end } = getDateRange(range, date);
        const transactions = get().getTransactionsByDateRange(bookId, { start, end });
        
        const labels: string[] = [];
        const income: number[] = [];
        const expense: number[] = [];
        
        if (range === 'day') {
          // 按小时统计（6点-24点，每3小时一个点）
          for (let i = 6; i <= 24; i += 3) {
            labels.push(`${i}点`);
            const hourStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), i, 0, 0);
            const hourEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), i + 2, 59, 59);
            
            const hourTransactions = transactions.filter(t => {
              const recordDate = parseDate(t.recordDate);
              return recordDate >= hourStart && recordDate <= hourEnd;
            });
            
            income.push(hourTransactions
              .filter(t => t.type === 'INCOME')
              .reduce((sum, t) => sum + t.amount, 0));
            expense.push(hourTransactions
              .filter(t => t.type === 'EXPENSE')
              .reduce((sum, t) => sum + t.amount, 0));
          }
        } else if (range === 'week') {
          // 按天统计（周一到周日）
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay() + 1); // 周一
          
          for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            labels.push(`${dayDate.getMonth() + 1}/${dayDate.getDate()}`);
            
            const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0);
            const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59);
            
            const dayTransactions = transactions.filter(t => {
              const recordDate = parseDate(t.recordDate);
              return recordDate >= dayStart && recordDate <= dayEnd;
            });
            
            income.push(dayTransactions
              .filter(t => t.type === 'INCOME')
              .reduce((sum, t) => sum + t.amount, 0));
            expense.push(dayTransactions
              .filter(t => t.type === 'EXPENSE')
              .reduce((sum, t) => sum + t.amount, 0));
          }
        } else if (range === 'month') {
          const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
          for (let i = 1; i <= daysInMonth; i++) {
            labels.push(`${i}日`);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), i, 0, 0, 0);
            const dayEnd = new Date(date.getFullYear(), date.getMonth(), i, 23, 59, 59);
            
            const dayTransactions = transactions.filter(t => {
              const recordDate = parseDate(t.recordDate);
              return recordDate >= dayStart && recordDate <= dayEnd;
            });
            
            income.push(dayTransactions
              .filter(t => t.type === 'INCOME')
              .reduce((sum, t) => sum + t.amount, 0));
            expense.push(dayTransactions
              .filter(t => t.type === 'EXPENSE')
              .reduce((sum, t) => sum + t.amount, 0));
          }
        } else if (range === 'year') {
          for (let i = 0; i < 12; i++) {
            labels.push(`${i + 1}月`);
            const monthStart = new Date(date.getFullYear(), i, 1);
            const monthEnd = new Date(date.getFullYear(), i + 1, 0, 23, 59, 59);
            
            const monthTransactions = transactions.filter(t => {
              const recordDate = parseDate(t.recordDate);
              return recordDate >= monthStart && recordDate <= monthEnd;
            });
            
            income.push(monthTransactions
              .filter(t => t.type === 'INCOME')
              .reduce((sum, t) => sum + t.amount, 0));
            expense.push(monthTransactions
              .filter(t => t.type === 'EXPENSE')
              .reduce((sum, t) => sum + t.amount, 0));
          }
        }
        
        return { labels, income, expense };
      },
    }),
    {
      name: 'transaction-store',
      // 优化：只持久化配置，不持久化大量交易数据
      partialize: (state) => ({
        selectedDateRange: state.selectedDateRange,
      }),
      storage: {
        getItem: async (name) => {
          const value = await storage.get<string>(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await storage.set(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await storage.remove(name);
        },
      },
    }
  )
);
