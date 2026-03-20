import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from '@/services/storage';
import { supabase } from '@/services/supabase';
import type { SubscriptionType, SubscriptionPlan, SubscriptionStatus } from '@/types';
import { SUBSCRIPTION_PLANS } from '@/utils/constants';

// 用户订阅状态
interface UserSubscription {
  id: string;
  userId: string;
  type: SubscriptionType;
  plan: SubscriptionPlan;
  price: number;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
}

interface SubscriptionState {
  subscriptions: UserSubscription[];
  isLoading: boolean;

  // Actions
  createSubscription: (userId: string, type: SubscriptionType, plan: SubscriptionPlan) => Promise<UserSubscription | null>;
  cancelSubscription: (userId: string, type: SubscriptionType) => void;
  checkSubscriptionStatus: (userId: string, type: SubscriptionType) => UserSubscription | null;
  isSubscriptionActive: (userId: string, type: SubscriptionType) => boolean;
  getActiveSubscription: (userId: string) => UserSubscription | null;
  getUserMemberLimit: (userId: string) => number;
  canCreateCoupleBook: (userId: string) => boolean;
  canCreateFamilyBook: (userId: string) => boolean;
  fetchSubscriptions: (userId: string) => Promise<void>;
  syncWithCloud: (userId: string) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      isLoading: false,

      // 创建订阅（基于用户）
      createSubscription: async (userId, type, plan) => {
        // 检查是否已有该类型订阅
        const existingSub = get().subscriptions.find(
          s => s.userId === userId && s.type === type && s.status === 'ACTIVE'
        );
        
        if (existingSub) {
          console.warn(`用户 ${userId} 已有 ${type} 会员`);
          return null;
        }

        const planConfig = SUBSCRIPTION_PLANS[type];
        const durationDays = plan === 'MONTHLY' 
          ? planConfig.monthly.durationDays 
          : planConfig.yearly.durationDays;
        const price = plan === 'MONTHLY'
          ? planConfig.monthly.price
          : planConfig.yearly.price;
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);
        
        const subscription: UserSubscription = {
          id: crypto.randomUUID(),
          userId,
          type,
          plan,
          price,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          status: 'ACTIVE',
          autoRenew: true,
        };

        // 先更新本地状态
        set(state => ({
          subscriptions: [...state.subscriptions, subscription],
        }));

        // 同步到云端
        try {
          await supabase.from('subscriptions').insert({
            id: subscription.id,
            user_id: subscription.userId,
            type: subscription.type,
            plan: subscription.plan,
            price: subscription.price,
            start_date: subscription.startDate,
            end_date: subscription.endDate,
            status: subscription.status,
            auto_renew: subscription.autoRenew,
          });
          console.log('Subscription synced to cloud:', subscription.id);
        } catch (error) {
          console.error('Sync subscription to cloud error:', error);
        }

        return subscription;
      },

      // 取消订阅
      cancelSubscription: (userId, type) => {
        set(state => ({
          subscriptions: state.subscriptions.map(s =>
            s.userId === userId && s.type === type && s.status === 'ACTIVE'
              ? { ...s, autoRenew: false }
              : s
          ),
        }));
      },

      // 检查订阅状态
      checkSubscriptionStatus: (userId, type) => {
        const subscription = get().subscriptions.find(
          s => s.userId === userId && s.type === type && s.status === 'ACTIVE'
        );
        
        if (subscription) {
          const now = new Date();
          const endDate = new Date(subscription.endDate);
          
          if (now > endDate) {
            // 订阅已过期，更新状态
            set(state => ({
              subscriptions: state.subscriptions.map(s =>
                s.id === subscription.id ? { ...s, status: 'EXPIRED' as SubscriptionStatus } : s
              ),
            }));
            
            // 同步到云端
            (async () => {
              try {
                await supabase
                  .from('subscriptions')
                  .update({ status: 'EXPIRED' })
                  .eq('id', subscription.id);
                console.log('Subscription marked as expired:', subscription.id);
              } catch (error) {
                console.error('Update expired subscription error:', error);
              }
            })();
            
            return null;
          }
        }
        
        return subscription || null;
      },

      // 检查是否活跃
      isSubscriptionActive: (userId, type) => {
        return get().checkSubscriptionStatus(userId, type) !== null;
      },

      // 获取用户的活跃订阅（优先返回更高级的）
      getActiveSubscription: (userId) => {
        // 先检查家庭会员（更高级）
        const familySub = get().checkSubscriptionStatus(userId, 'FAMILY');
        if (familySub) return familySub;
        
        // 再检查情侣会员
        const coupleSub = get().checkSubscriptionStatus(userId, 'COUPLE');
        if (coupleSub) return coupleSub;
        
        return null;
      },

      // 获取用户成员上限
      getUserMemberLimit: (userId) => {
        const familySub = get().checkSubscriptionStatus(userId, 'FAMILY');
        if (familySub) return SUBSCRIPTION_PLANS.FAMILY.maxMembers;
        
        const coupleSub = get().checkSubscriptionStatus(userId, 'COUPLE');
        if (coupleSub) return SUBSCRIPTION_PLANS.COUPLE.maxMembers;
        
        return 1; // 免费用户只能1人（自己）
      },

      // 是否可以创建情侣账本
      canCreateCoupleBook: (userId) => {
        return get().isSubscriptionActive(userId, 'COUPLE') || 
               get().isSubscriptionActive(userId, 'FAMILY'); // 家庭会员也可以创建情侣账本
      },

      // 是否可以创建家庭账本
      canCreateFamilyBook: (userId) => {
        return get().isSubscriptionActive(userId, 'FAMILY');
      },

      // 从云端获取订阅
      fetchSubscriptions: async (userId) => {
        if (!userId) return;
        set({ isLoading: true });

        try {
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Fetch subscriptions error:', error);
            return;
          }

          if (data) {
            const subscriptions: UserSubscription[] = data.map((s: any) => ({
              id: s.id,
              userId: s.user_id,
              type: s.type as SubscriptionType,
              plan: s.plan as SubscriptionPlan,
              price: s.price,
              startDate: s.start_date,
              endDate: s.end_date,
              status: s.status as SubscriptionStatus,
              autoRenew: s.auto_renew,
            }));

            // 检查过期状态
            const now = new Date();
            const validSubscriptions = subscriptions.map(s => {
              if (s.status === 'ACTIVE' && new Date(s.endDate) < now) {
                return { ...s, status: 'EXPIRED' as SubscriptionStatus };
              }
              return s;
            });

            set({ subscriptions: validSubscriptions });
            console.log('Subscriptions fetched from cloud:', validSubscriptions.length);
          }
        } catch (error) {
          console.error('Fetch subscriptions error:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      // 同步到云端
      syncWithCloud: async (userId) => {
        if (!userId) return;
        await get().fetchSubscriptions(userId);
      },
    }),
    {
      name: 'subscription-store',
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
