// 交易类型
export type TransactionType = 'INCOME' | 'EXPENSE';

// 账本类型
export type BookType = 'PERSONAL' | 'COUPLE' | 'FAMILY';

// 用户角色
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

// 资产类型
export type AssetType = 
  | 'CASH' 
  | 'DEBIT_CARD' 
  | 'CREDIT_CARD' 
  | 'ALIPAY' 
  | 'WECHAT' 
  | 'INVESTMENT' 
  | 'LOAN' 
  | 'OTHER';

// 订阅类型
export type SubscriptionType = 'COUPLE' | 'FAMILY';
export type SubscriptionPlan = 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

// 用户
export interface User {
  id: string;
  phone: string;
  email?: string;
  nickname?: string;
  avatar?: string;
  createdAt: string;
}

// 账本邀请
export interface BookInvite {
  id: string;
  bookId: string;
  code: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  maxUses?: number;
  usedCount: number;
}

// 账本
export interface Book {
  id: string;
  name: string;
  type: BookType;
  coverImage?: string;
  currency: string;
  createdAt: string;
  createdBy: string;
  members: BookMember[];
}

// 账本成员
export interface BookMember {
  userId: string;
  role: UserRole;
  joinedAt: string;
  user?: User;
}

// 分类
export interface Category {
  id: string;
  bookId: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  parentId?: string;
  sortOrder: number;
  isBuiltin: boolean;
}

// 交易记录
export interface Transaction {
  id: string;
  bookId: string;
  userId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  recordDate: string;
  images?: string[];
  location?: Location;
  createdAt: string;
  updatedAt?: string;
  category?: Category;
  user?: User;
}

// 位置
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

// 资产
export interface Asset {
  id: string;
  userId: string;
  name: string;
  type: AssetType;
  balance: number;
  initialAmount: number;
  currency: string;
  note?: string;
  isIncluded: boolean;
  createdAt: string;
  updatedAt: string;
}

// 订阅
export interface Subscription {
  id: string;
  userId: string;
  bookId: string;
  type: SubscriptionType;
  plan: SubscriptionPlan;
  price: number;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
}

// 日期范围
export interface DateRange {
  start: Date;
  end: Date;
}

// 统计摘要
export interface Summary {
  income: number;
  expense: number;
  balance: number;
}

// 图表数据
export interface ChartData {
  labels: string[];
  income: number[];
  expense: number[];
}

// 分类统计
export interface CategoryStat {
  categoryId: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
  count: number;
}

// 会员方案
export interface SubscriptionPlanConfig {
  name: string;
  maxMembers: number;
  monthly: {
    price: number;
    durationDays: number;
    productId: string;
  };
  yearly: {
    price: number;
    durationDays: number;
    productId: string;
    savings: string;
  };
}

// 预算
export interface Budget {
  id: string;
  bookId: string;
  categoryId?: string;
  year: number;
  month: number;
  amount: number;
  createdAt: string;
  updatedAt?: string;
}

// 导航页面
export type AppPage = 
  | 'home' 
  | 'transactions' 
  | 'statistics' 
  | 'assets' 
  | 'books' 
  | 'profile' 
  | 'subscription';
