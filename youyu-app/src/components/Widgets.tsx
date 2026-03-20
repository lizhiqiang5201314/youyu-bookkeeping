import { useEffect, useState } from 'react';
import { useTransactionStore } from '@/stores/transactionStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';
import { Plus, Flame, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import type { Transaction } from '@/types';

// 桌面小组件类型
export type WidgetType = 'quick_add' | 'check_in' | 'today_summary' | 'budget';

// 快捷记账小组件
export function QuickAddWidget({ onQuickAdd }: { onQuickAdd?: () => void }) {
  return (
    <button
      onClick={onQuickAdd}
      className={cn(
        'w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center',
        'bg-gradient-to-br from-teal-500 to-cyan-500 text-white',
        'shadow-lg shadow-teal-500/30 active:scale-95 transition-transform'
      )}
    >
      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
        <Plus className="w-6 h-6" />
      </div>
      <span className="text-sm font-medium">记一笔</span>
    </button>
  );
}

// 打卡小组件
export function CheckInWidget() {
  const { checkInStreak, lastCheckInDate, checkIn } = useSettingsStore();
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setIsChecked(lastCheckInDate === today);
  }, [lastCheckInDate]);

  const handleCheckIn = () => {
    if (!isChecked) {
      const success = checkIn();
      if (success) {
        setIsChecked(true);
      }
    }
  };

  return (
    <button
      onClick={handleCheckIn}
      className={cn(
        'w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center',
        isChecked
          ? 'bg-green-500 text-white'
          : 'bg-gradient-to-br from-orange-500 to-red-500 text-white',
        'shadow-lg active:scale-95 transition-transform'
      )}
    >
      <div className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center mb-2',
        isChecked ? 'bg-white/20' : 'bg-white/20'
      )}>
        <Flame className="w-6 h-6" />
      </div>
      <span className="text-sm font-medium">
        {isChecked ? `已打卡 ${checkInStreak}天` : '今日打卡'}
      </span>
    </button>
  );
}

// 今日收支小组件
export function TodaySummaryWidget() {
  const { transactions } = useTransactionStore();
  const [todayStats, setTodayStats] = useState({ income: 0, expense: 0 });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter((t: Transaction) => t.recordDate === today);
    
    const income = todayTransactions
      .filter((t: Transaction) => t.type === 'INCOME')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    
    const expense = todayTransactions
      .filter((t: Transaction) => t.type === 'EXPENSE')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    setTodayStats({ income, expense });
  }, [transactions]);

  const formatAmount = (amount: number) => {
    return (amount / 100).toFixed(0);
  };

  return (
    <div className="w-full h-full rounded-2xl p-4 bg-white dark:bg-gray-800 shadow-lg">
      <h4 className="text-xs text-gray-500 dark:text-gray-400 mb-2">今日收支</h4>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-xs text-gray-500">收入</span>
          </div>
          <span className="text-sm font-medium text-green-500">+¥{formatAmount(todayStats.income)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-500" />
            <span className="text-xs text-gray-500">支出</span>
          </div>
          <span className="text-sm font-medium text-red-500">-¥{formatAmount(todayStats.expense)}</span>
        </div>
      </div>
    </div>
  );
}

// 预算小组件
export function BudgetWidget() {
  const budgetUsed = 65; // 示例数据

  return (
    <div className="w-full h-full rounded-2xl p-4 bg-white dark:bg-gray-800 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs text-gray-500 dark:text-gray-400">本月预算</h4>
        <Wallet className="w-4 h-4 text-teal-500" />
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-gray-900 dark:text-white">{budgetUsed}%</span>
          <span className="text-xs text-gray-500">已使用</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-orange-500' : 'bg-teal-500'
            )}
            style={{ width: `${Math.min(budgetUsed, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// 小组件容器
export function WidgetContainer({ children, size = 'small' }: { children: React.ReactNode; size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'w-[120px] h-[120px]',
    medium: 'w-[160px] h-[120px]',
    large: 'w-[200px] h-[120px]',
  };

  return (
    <div className={cn(sizeClasses[size])}>
      {children}
    </div>
  );
}
