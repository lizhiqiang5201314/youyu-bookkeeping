import type { Category, SubscriptionPlanConfig, AssetType } from '@/types';

// 内置支出分类
export const BUILTIN_EXPENSE_CATEGORIES: Omit<Category, 'id' | 'bookId'>[] = [
  { name: '餐饮', type: 'EXPENSE', icon: '🍔', color: '#FF6B6B', sortOrder: 1, isBuiltin: true },
  { name: '交通', type: 'EXPENSE', icon: '🚗', color: '#4ECDC4', sortOrder: 2, isBuiltin: true },
  { name: '购物', type: 'EXPENSE', icon: '🛍️', color: '#45B7D1', sortOrder: 3, isBuiltin: true },
  { name: '娱乐', type: 'EXPENSE', icon: '🎮', color: '#96CEB4', sortOrder: 4, isBuiltin: true },
  { name: '居住', type: 'EXPENSE', icon: '🏠', color: '#FFEAA7', sortOrder: 5, isBuiltin: true },
  { name: '医疗', type: 'EXPENSE', icon: '💊', color: '#DDA0DD', sortOrder: 6, isBuiltin: true },
  { name: '教育', type: 'EXPENSE', icon: '📚', color: '#98D8C8', sortOrder: 7, isBuiltin: true },
  { name: '人情', type: 'EXPENSE', icon: '🎁', color: '#F7DC6F', sortOrder: 8, isBuiltin: true },
  { name: '其他', type: 'EXPENSE', icon: '📦', color: '#BB8FCE', sortOrder: 99, isBuiltin: true },
];

// 内置收入分类
export const BUILTIN_INCOME_CATEGORIES: Omit<Category, 'id' | 'bookId'>[] = [
  { name: '工资', type: 'INCOME', icon: '💰', color: '#27AE60', sortOrder: 1, isBuiltin: true },
  { name: '奖金', type: 'INCOME', icon: '🏆', color: '#F39C12', sortOrder: 2, isBuiltin: true },
  { name: '投资', type: 'INCOME', icon: '📈', color: '#3498DB', sortOrder: 3, isBuiltin: true },
  { name: '兼职', type: 'INCOME', icon: '💼', color: '#9B59B6', sortOrder: 4, isBuiltin: true },
  { name: '红包', type: 'INCOME', icon: '🧧', color: '#E74C3C', sortOrder: 5, isBuiltin: true },
  { name: '其他', type: 'INCOME', icon: '📦', color: '#95A5A6', sortOrder: 99, isBuiltin: true },
];

// 资产类型配置
export const ASSET_TYPE_CONFIG: Record<AssetType, { name: string; icon: string; color: string; isLiability: boolean }> = {
  CASH: { name: '现金', icon: '💵', color: '#27AE60', isLiability: false },
  DEBIT_CARD: { name: '借记卡', icon: '💳', color: '#3498DB', isLiability: false },
  CREDIT_CARD: { name: '信用卡', icon: '💳', color: '#E74C3C', isLiability: true },
  ALIPAY: { name: '支付宝', icon: '🔵', color: '#1677FF', isLiability: false },
  WECHAT: { name: '微信', icon: '🟢', color: '#07C160', isLiability: false },
  INVESTMENT: { name: '投资理财', icon: '📊', color: '#F39C12', isLiability: false },
  LOAN: { name: '借款', icon: '📋', color: '#95A5A6', isLiability: true },
  OTHER: { name: '其他', icon: '📦', color: '#34495E', isLiability: false },
};

// 会员方案配置
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanConfig> = {
  COUPLE: {
    name: '情侣账本',
    maxMembers: 2,
    monthly: {
      price: 9.9,
      durationDays: 30,
      productId: 'couple_monthly_9_9',
    },
    yearly: {
      price: 99,
      durationDays: 365,
      productId: 'couple_yearly_99',
      savings: '节省17%',
    },
  },
  FAMILY: {
    name: '家庭账本',
    maxMembers: 5,
    monthly: {
      price: 13.9,
      durationDays: 30,
      productId: 'family_monthly_13_9',
    },
    yearly: {
      price: 159,
      durationDays: 365,
      productId: 'family_yearly_159',
      savings: '节省5%',
    },
  },
};

// 存储键名
export const STORAGE_KEYS = {
  USER: 'bookkeeping_user',
  TOKEN: 'bookkeeping_token',
  BOOKS: 'bookkeeping_books',
  CURRENT_BOOK: 'bookkeeping_current_book',
  TRANSACTIONS: 'bookkeeping_transactions',
  CATEGORIES: 'bookkeeping_categories',
  ASSETS: 'bookkeeping_assets',
  SUBSCRIPTION: 'bookkeeping_subscription',
  SETTINGS: 'bookkeeping_settings',
};

// 货币符号
export const CURRENCY_SYMBOL: Record<string, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
};

// 时间范围选项
export const TIME_RANGES = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
];

// 生成UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 格式化金额
export function formatAmount(amount: number, currency: string = 'CNY'): string {
  const symbol = CURRENCY_SYMBOL[currency] || '¥';
  return `${symbol}${(amount / 100).toFixed(2)}`;
}

// 格式化日期
export function formatDate(date: string | Date, format: 'full' | 'date' | 'time' = 'date'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  switch (format) {
    case 'full':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'date':
      return `${year}-${month}-${day}`;
    case 'time':
      return `${hours}:${minutes}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

// 获取日期范围
export function getDateRange(range: 'day' | 'week' | 'month' | 'year', date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date);
  const end = new Date(date);
  
  switch (range) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + (6 - day));
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }
  
  return { start, end };
}
