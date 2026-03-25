import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from '@/services/storage';
import { supabase } from '@/services/supabase';
import { db } from '@/services/db';
import { useSubscriptionStore } from './subscriptionStore';
import type { User, Category } from '@/types';
import bcrypt from 'bcryptjs';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isDataPreloaded: boolean; // 数据是否已预加载
  
  // Actions
  login: (phone: string, password: string) => Promise<boolean>;
  register: (phone: string, password: string) => Promise<boolean>;
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
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔐 尝试登录:', phone);

          // 查询用户
          const { data: users, error } = await supabase
            .from('app_users')
            .select('*')
            .eq('phone', phone)
            .single();

          if (error || !users) {
            console.error('❌ 用户不存在');
            set({ isLoading: false, error: '账号不存在' });
            return false;
          }

          // 验证密码
          const isValid = await bcrypt.compare(password, users.password_hash);
          
          if (!isValid) {
            console.error('❌ 密码错误');
            set({ isLoading: false, error: '密码错误' });
            return false;
          }

          const user: User = {
            id: users.id,
            phone: users.phone,
            nickname: users.nickname || `用户${users.phone.slice(-4)}`,
            avatar: users.avatar,
            createdAt: users.created_at,
          };
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          // 登录成功后同步会员信息
          await useSubscriptionStore.getState().fetchSubscriptions(user.id);
          
          // 预加载账本和分类到本地数据库
          await get().preloadUserData(user.id);
          
          console.log('🎉 登录成功，用户ID:', user.id);
          return true;
        } catch (error: any) {
          console.error('❌ 登录异常:', error);
          set({ isLoading: false, error: error?.message || '登录失败' });
          return false;
        }
      },

      // 注册
      register: async (phone: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('📝 注册新用户:', phone);

          // 检查手机号是否已存在
          const { data: existingUser } = await supabase
            .from('app_users')
            .select('id')
            .eq('phone', phone)
            .single();

          if (existingUser) {
            set({ isLoading: false, error: '该手机号已注册' });
            return false;
          }

          // 加密密码
          const passwordHash = await bcrypt.hash(password, 10);

          // 创建用户
          const { data: newUser, error } = await supabase
            .from('app_users')
            .insert({
              phone,
              password_hash: passwordHash,
              nickname: `用户${phone.slice(-4)}`,
            })
            .select()
            .single();

          if (error || !newUser) {
            console.error('❌ 注册失败:', error);
            set({ isLoading: false, error: '注册失败，请重试' });
            return false;
          }

          const user: User = {
            id: newUser.id,
            phone: newUser.phone,
            nickname: newUser.nickname,
            avatar: newUser.avatar,
            createdAt: newUser.created_at,
          };
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          // 注册成功后同步会员信息（初始为空）
          await useSubscriptionStore.getState().fetchSubscriptions(user.id);
          
          // 新用户预加载数据（可能没有账本，但保持逻辑一致）
          await get().preloadUserData(user.id);
          
          console.log('🎉 注册成功，用户ID:', user.id);
          return true;
        } catch (error: any) {
          console.error('❌ 注册异常:', error);
          set({ isLoading: false, error: error?.message || '注册失败' });
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

          let allBooks: any[] = createdBooks.data || [];
          
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
              const categories: Category[] = cats.map((c: any) => ({
                id: c.id,
                bookId: c.book_id,
                name: c.name,
                type: c.type as 'INCOME' | 'EXPENSE',
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
          
          set({ isDataPreloaded: true });
          console.log('✅ 用户数据预加载完成');
        } catch (error) {
          console.error('❌ 预加载用户数据失败:', error);
        }
      },

      // 短信登录设置用户
      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
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
