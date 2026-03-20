import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from '@/services/storage';

interface SettingsState {
  // 通知设置
  dailyReminder: boolean;
  reminderTime: string; // HH:mm 格式
  budgetAlert: boolean;
  budgetAlertThreshold: number; // 百分比

  // 打卡成就
  checkInStreak: number; // 连续打卡天数
  lastCheckInDate: string | null; // 最后打卡日期 YYYY-MM-DD
  totalCheckIns: number; // 总打卡次数
  longestStreak: number; // 最长连续打卡

  // Actions
  setDailyReminder: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  setBudgetAlert: (enabled: boolean) => void;
  setBudgetAlertThreshold: (threshold: number) => void;
  checkIn: () => boolean; // 返回是否打卡成功
  resetCheckInStreak: () => void;
}

// 检查是否是昨天
const isYesterday = (dateStr: string) => {
  const date = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

// 获取今天日期
const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      dailyReminder: true,
      reminderTime: '21:00',
      budgetAlert: true,
      budgetAlertThreshold: 80,
      checkInStreak: 0,
      lastCheckInDate: null,
      totalCheckIns: 0,
      longestStreak: 0,

      setDailyReminder: (enabled) => set({ dailyReminder: enabled }),
      setReminderTime: (time) => set({ reminderTime: time }),
      setBudgetAlert: (enabled) => set({ budgetAlert: enabled }),
      setBudgetAlertThreshold: (threshold) => set({ budgetAlertThreshold: threshold }),

      checkIn: () => {
        const today = getToday();
        const { lastCheckInDate, checkInStreak, totalCheckIns, longestStreak } = get();

        // 今天已经打卡
        if (lastCheckInDate === today) {
          return false;
        }

        let newStreak = 1;

        // 昨天打卡了，连续
        if (lastCheckInDate && isYesterday(lastCheckInDate)) {
          newStreak = checkInStreak + 1;
        }

        const newLongestStreak = Math.max(longestStreak, newStreak);

        set({
          checkInStreak: newStreak,
          lastCheckInDate: today,
          totalCheckIns: totalCheckIns + 1,
          longestStreak: newLongestStreak,
        });

        return true;
      },

      resetCheckInStreak: () => {
        set({ checkInStreak: 0 });
      },
    }),
    {
      name: 'settings-store',
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
