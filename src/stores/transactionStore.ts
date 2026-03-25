import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from '@/services/storage';
import { supabase } from '@/services/supabase';
import { db, parseDate } from '@/services/db';
import type { Transaction, TransactionType, DateRange, Summary, CategoryStat } from '@/types';
import { getDateRange } from '@/utils/constants';
import { generateUUID } from '@/utils/uuid';

function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const recordDiff = parseDate(b.recordDate).getTime() - parseDate(a.recordDate).getTime();
    if (recordDiff !== 0) return recordDiff;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

const latestFetchRequestByBook: Record<string, number> = {};

// 🎯 按账本ID存储交易数据，彻底隔离
interface TransactionState {
  transactionsMap: Record<string, Transaction[]>; // key: bookId
  isLoading: boolean;
  isSyncingByBook: Record<string, boolean>; // 🎯 按账本分开的同步锁
  selectedDateRange: DateRange;

  // Actions
  init: () => void; // 🧹 初始化清空
  subscribeToTransactionChanges: (bookId: string) => (() => void);
  fetchTransactions: (bookId: string) => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>, userId: string) => Promise<Transaction | null>;
  updateTransaction: (id: string, data: Partial<Transaction>, bookId: string) => Promise<void>;
  deleteTransaction: (id: string, bookId: string) => Promise<void>;
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
      transactionsMap: {},
      isLoading: false,
      isSyncingByBook: {}, // 🎯 按账本分开的同步锁
      selectedDateRange: getDateRange('month'),

      // 🧹 初始化时清空所有数据
      init: () => {
        set({ transactionsMap: {} });
      },

      subscribeToTransactionChanges: (bookId: string) => {
        const channel = supabase
          .channel(`transactions_${bookId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'transactions',
              filter: `book_id=eq.${bookId}`,
            },
            async (payload) => {
              console.log('Realtime transaction changed:', payload);
              await get().fetchTransactions(bookId);
            }
          )
          .subscribe((status) => {
            console.log('Transaction subscription status:', bookId, status);
          });

        return () => {
          supabase.removeChannel(channel);
        };
      },

      fetchTransactions: async (bookId) => {
        if (!bookId) return;
        const requestId = Date.now() + Math.random();
        latestFetchRequestByBook[bookId] = requestId;
        set({ isLoading: true });

        try {
          // 1. 读本地（该账本的数据）
          const localTxs = await db.transactions.where('bookId').equals(bookId).toArray();
          const transactions = sortTransactions(localTxs.map(t => ({
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
          })));

          // 只在当前请求仍然有效时更新，避免旧请求回写导致列表跳动
          if (latestFetchRequestByBook[bookId] === requestId) {
            set(state => ({
              transactionsMap: {
                ...state.transactionsMap,
                [bookId]: transactions,
              }
            }));
          }

          // 2. 后台同步云端
          await get().syncWithCloud(bookId);
        } finally {
          set({ isLoading: false });
        }
      },

      syncWithCloud: async (bookId) => {
        if (!bookId) return;
        
        // 🎯 检查该账本是否正在同步
        if (get().isSyncingByBook[bookId]) return;
        
        set(state => ({
          isSyncingByBook: { ...state.isSyncingByBook, [bookId]: true }
        }));

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
            const cloudTxs = sortTransactions(data.map((t: any) => ({
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
            })));

            // 保存到本地
            await db.transactions.bulkPut(
              cloudTxs.map(t => ({ ...t, synced: true, lastModified: Date.now() }))
            );

            // 🎯 只更新该账本的数据
            set(state => ({
              transactionsMap: { ...state.transactionsMap, [bookId]: cloudTxs }
            }));
          }
        } catch (error) {
          console.error('Sync error:', error);
        } finally {
          set(state => ({
            isSyncingByBook: { ...state.isSyncingByBook, [bookId]: false }
          }));
        }
      },

      addTransaction: async (data, userId) => {
        if (!userId) return null;

        const transaction: Transaction = {
          id: generateUUID(),
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

        // 1. 先存本地
        await db.transactions.put({
          ...transaction,
          synced: false,
          lastModified: Date.now(),
        });

        // 🎯 更新该账本的数据
        set(state => ({
          transactionsMap: {
            ...state.transactionsMap,
            [transaction.bookId]: sortTransactions([transaction, ...(state.transactionsMap[transaction.bookId] || [])])
          }
        }));

        // 2. 后台同步云端
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

      updateTransaction: async (id, data, bookId) => {
        if (!bookId) return;

        // 1. 更新本地
        await db.transactions.update(id, {
          ...data,
          synced: false,
          lastModified: Date.now(),
        });

        // 🎯 更新该账本的数据（创建新数组触发响应式更新）
        set(state => {
          const bookTransactions = state.transactionsMap[bookId] || [];
          const updatedTransactions = sortTransactions(bookTransactions.map(t =>
            t.id === id ? { ...t, ...data } : t
          ));
          return {
            transactionsMap: {
              ...state.transactionsMap,
              [bookId]: updatedTransactions
            }
          };
        });

        // 2. 后台同步云端
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

      deleteTransaction: async (id, bookId) => {
        if (!bookId) return;

        // 1. 删除本地
        await db.transactions.delete(id);

        // 🎯 更新该账本的数据
        set(state => {
          const bookTransactions = state.transactionsMap[bookId] || [];
          return {
            transactionsMap: {
              ...state.transactionsMap,
              [bookId]: bookTransactions.filter(t => t.id !== id)
            }
          };
        });

        // 2. 后台同步云端
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
        return sortTransactions(get().transactionsMap[bookId] || []);
      },

      getTransactionsByDateRange: (bookId, range, type) => {
        const startTime = range.start.getTime();
        const endTime = range.end.getTime();

        const transactions = get().transactionsMap[bookId] || [];
        return sortTransactions(transactions.filter(t => {
          const recordTime = parseDate(t.recordDate).getTime();
          const inRange = recordTime >= startTime && recordTime <= endTime;
          return type ? inRange && t.type === type : inRange;
        }));
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
          for (let i = 6; i <= 24; i += 3) {
            labels.push(`${i}点`);
            const hourStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), i, 0, 0);
            const hourEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), i + 2, 59, 59);

            const hourTransactions = transactions.filter(t => {
              const recordDate = parseDate(t.recordDate);
              return recordDate >= hourStart && recordDate <= hourEnd;
            });

            income.push(hourTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0));
            expense.push(hourTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0));
          }
        } else if (range === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay() + 1);

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

            income.push(dayTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0));
            expense.push(dayTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0));
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

            income.push(dayTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0));
            expense.push(dayTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0));
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

            income.push(monthTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0));
            expense.push(monthTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0));
          }
        }

        return { labels, income, expense };
      },
    }),
    {
      name: 'transaction-store',
      partialize: (state) => ({
        selectedDateRange: state.selectedDateRange,
        // 🎯 transactionsMap 不持久化到 localStorage，每次都从 Dexie 加载
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
