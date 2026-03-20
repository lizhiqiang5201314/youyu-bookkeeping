import Dexie, { type Table } from 'dexie';
import type { Book, Category, Transaction, Budget, BookInvite } from '@/types';

// 定义本地数据库
class BookkeepingDatabase extends Dexie {
  books!: Table<Book & { synced?: boolean; lastModified?: number }, string>;
  categories!: Table<Category & { synced?: boolean; lastModified?: number }, string>;
  transactions!: Table<Transaction & { synced?: boolean; lastModified?: number }, string>;
  budgets!: Table<Budget & { synced?: boolean; lastModified?: number }, string>;
  bookInvites!: Table<BookInvite, string>;

  constructor() {
    super('BookkeepingDB');
    
    this.version(2).stores({
      books: 'id, createdBy, type, lastModified',
      categories: 'id, bookId, type, lastModified',
      transactions: 'id, bookId, date, categoryId, type, lastModified',
      budgets: 'id, bookId, year, month, lastModified',
      bookInvites: 'id, bookId, code, expiresAt',
    });
  }
}

export const db = new BookkeepingDatabase();

// 同步状态管理
export interface SyncState {
  lastSync: number | null;
  isSyncing: boolean;
}

export const syncState: SyncState = {
  lastSync: null,
  isSyncing: false,
};

// 标记记录为已修改（未同步）
export function markAsUnsynced(table: string, id: string) {
  return db.table(table).update(id, {
    synced: false,
    lastModified: Date.now(),
  });
}

// 标记记录为已同步
export function markAsSynced(table: string, id: string) {
  return db.table(table).update(id, {
    synced: true,
  });
}

// 安全日期解析（避免时区问题）
export function parseDate(dateStr: string): Date {
  // 如果是 YYYY-MM-DD 格式，手动解析
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0); // 中午12点避免日期漂移
  }
  return new Date(dateStr);
}

// 格式化日期为 YYYY-MM-DD
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==================== 性能优化工具函数 ====================

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 带重试的异步操作（指数退避）
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // 最后一次尝试，直接抛出错误
      if (i === retries - 1) {
        throw lastError;
      }
      
      // 指数退避：1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, i);
      console.warn(`Retry ${i + 1}/${retries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// 分页查询工具
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export async function getTransactionsPaginated(
  bookId: string,
  options: PaginationOptions
): Promise<PaginatedResult<Transaction>> {
  const { page, pageSize } = options;
  const offset = (page - 1) * pageSize;
  
  // 获取总数
  const total = await db.transactions
    .where('bookId')
    .equals(bookId)
    .count();
  
  // 获取分页数据
  const data = await db.transactions
    .where('bookId')
    .equals(bookId)
    .reverse() // 最新的在前
    .offset(offset)
    .limit(pageSize)
    .toArray();
  
  return {
    data,
    total,
    hasMore: offset + data.length < total,
  };
}

// 批量同步未同步的数据（用于网络恢复时）
export async function getUnsyncedTransactions(): Promise<Transaction[]> {
  return db.transactions
    .filter(t => t.synced === false)
    .toArray();
}

export async function getUnsyncedBooks(): Promise<Book[]> {
  return db.books
    .filter(b => b.synced === false)
    .toArray();
}

export async function getUnsyncedCategories(): Promise<Category[]> {
  return db.categories
    .filter(c => c.synced === false)
    .toArray();
}
