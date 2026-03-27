import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from '@/services/storage';
import { supabase } from '@/services/supabase';
import { db } from '@/services/db';
import { useSubscriptionStore } from './subscriptionStore';
import type { User, Category, BookType, TransactionType } from '@/types';

// Edge Function 基础 URL
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

type RemoteBookRecord = {
  id: string;
  name: string;
  type: BookType;
  created_at: string;
  created_by: string;
};

type RemoteCategoryRecord = {
  id: string;
  book_id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  sort_order: number;
  is_builtin: boolean;
};

const getErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message ? error.message : fallback
);

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isDataPreloaded: boolean; // 数据是否已预加载
  
  // Actions
  login: (phone: string, password: string) => Promise<boolean>;
  register: (phone: string, password: string) => Promise<boolean>;
  primeUserSession: (userId: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => Promise<void>;
  checkSession: () => Promise<void>;
  preloadUserData: (userId: string) => Promise<void>;
  setUser: (user: User) => void; // 短信登录设置用户
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isDataPreloaded: false,

      // 登录
      login: async (phone: string, password: string) => {
        set({ isLoading: true, error: null, isDataPreloaded: false });
        
        try {
          console.log('🔐 尝试登录:', phone);

          // 调用 Edge Function 进行密码验证
          const response = await fetch(`${EDGE_FUNCTION_URL}/password-login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, password }),
          });

          const data = await response.json();
          const rawError = String(data?.error || '');

          if (!response.ok) {
            console.error('❌ 登录失败:', rawError);

            let friendlyError = '登录失败，请稍后重试';
            const normalized = rawError.toLowerCase();

            if (
              rawError.includes('密码错误') ||
              normalized.includes('invalid password') ||
              normalized.includes('wrong password')
            ) {
              friendlyError = '密码错误，请重新输入';
            } else if (
              rawError.includes('账号不存在') ||
              rawError.includes('用户不存在') ||
              rawError.includes('未注册') ||
              normalized.includes('user not found') ||
              normalized.includes('not found')
            ) {
              friendlyError = '用户不存在，请先注册';
            }

            set({ isLoading: false, error: friendlyError });
            return false;
          }

          const user = data.user;

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          get().primeUserSession(user.id);

          console.log('🎉 登录成功，用户ID:', user.id);
          return true;
        } catch (error: unknown) {
          console.error('❌ 登录异常:', error);
          const message = getErrorMessage(error, '登录失败');
          const normalized = message.toLowerCase();
          const friendlyError = (
            message.includes('Failed to fetch') ||
            normalized.includes('failed to fetch') ||
            normalized.includes('cors') ||
            normalized.includes('networkerror')
          )
            ? '登录服务暂时不可用，请稍后重试'
            : (message || '登录失败');
          set({ isLoading: false, error: friendlyError });
          return false;
        }
      },

      // 注册
      register: async (phone: string, password: string) => {
        set({ isLoading: true, error: null, isDataPreloaded: false });
        
        try {
          console.log('📝 注册新用户:', phone);

          // 调用 Edge Function 进行注册
          const response = await fetch(`${EDGE_FUNCTION_URL}/password-register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            console.error('❌ 注册失败:', data.error);
            set({ isLoading: false, error: data.error || '注册失败' });
            return false;
          }

          const user = data.user;

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          get().primeUserSession(user.id);

          console.log('🎉 注册成功，用户ID:', user.id);
          return true;
        } catch (error: unknown) {
          console.error('❌ 注册异常:', error);
          set({ isLoading: false, error: getErrorMessage(error, '注册失败') });
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          isDataPreloaded: false,
        });
      },

      primeUserSession: (userId: string) => {
        if (!userId) return;

        if (get().user?.id === userId) {
          set({ isDataPreloaded: false });
        }

        void Promise.allSettled([
          useSubscriptionStore.getState().fetchSubscriptions(userId),
          get().preloadUserData(userId),
        ]).then((results) => {
          for (const result of results) {
            if (result.status === 'rejected') {
              console.error('❌ 登录后初始化失败:', result.reason);
            }
          }
        });
      },

      updateUser: async (userData) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const { error } = await supabase
          .from('app_users')
          .update(userData)
          .eq('id', currentUser.id);

        if (error) {
          console.error('Update user error:', error);
          return;
        }

        set({
          user: { ...currentUser, ...userData },
        });
      },

      checkSession: async () => {
        // 从 localStorage 恢复
        // persist 会自动处理，这里不需要额外逻辑
        console.log('检查本地session...');
      },

      // 预加载用户数据到本地数据库
      preloadUserData: async (userId: string) => {
        if (!userId) return;
        console.log('🔄 开始预加载用户数据...');
        
        try {
          // 1. 加载所有账本
          const [createdBooks, memberBooks] = await Promise.all([
            supabase.from('books').select('*').eq('created_by', userId),
            supabase.from('book_members').select('book_id').eq('user_id', userId)
          ]);

          let allBooks = (createdBooks.data || []) as RemoteBookRecord[];
          
          if (memberBooks.data?.length) {
            const bookIds = memberBooks.data.map(m => m.book_id);
            const { data: sharedBooks } = await supabase
              .from('books')
              .select('*')
              .in('id', bookIds);
            if (sharedBooks) {
              allBooks = [...allBooks, ...sharedBooks];
            }
          }

          // 去重
          const uniqueBooks = Array.from(new Map(allBooks.map(b => [b.id, b])).values());
          
          // 保存账本到本地
          for (const book of uniqueBooks) {
            await db.books.put({
              id: book.id,
              name: book.name,
              type: book.type,
              currency: 'CNY',
              createdAt: book.created_at,
              createdBy: book.created_by,
              members: [],
              synced: true,
              lastModified: Date.now(),
            });
          }
          
          console.log(`📚 已加载 ${uniqueBooks.length} 个账本到本地`);

          // 2. 为每个账本加载分类
          const allCategories: Category[] = [];
          for (const book of uniqueBooks) {
            const { data: cats } = await supabase
              .from('categories')
              .select('*')
              .eq('book_id', book.id)
              .order('sort_order');
            
            if (cats) {
              const categories: Category[] = (cats as RemoteCategoryRecord[]).map((c) => ({
                id: c.id,
                bookId: c.book_id,
                name: c.name,
                type: c.type,
                icon: c.icon,
                color: c.color,
                sortOrder: c.sort_order,
                isBuiltin: c.is_builtin,
              }));
              
              // 保存到本地数据库
              for (const cat of categories) {
                await db.categories.put({
                  ...cat,
                  synced: true,
                  lastModified: Date.now(),
                });
              }
              
              allCategories.push(...categories);
            }
          }
          
          console.log(`🏷️ 已加载 ${allCategories.length} 个分类到本地数据库`);
          
          if (get().user?.id === userId) {
            set({ isDataPreloaded: true });
            console.log('✅ 用户数据预加载完成');
          }
        } catch (error) {
          console.error('❌ 预加载用户数据失败:', error);
        }
      },

      // 短信登录设置用户
      setUser: (user: User) => {
        set((state) => ({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          isDataPreloaded: state.user?.id === user.id ? state.isDataPreloaded : false,
        }));
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // isDataPreloaded 不持久化，每次登录重新预加载
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
