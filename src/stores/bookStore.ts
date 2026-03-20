import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from '@/services/storage';
import { supabase } from '@/services/supabase';
import { db } from '@/services/db';
import type { Book, Category, BookMember, BookType } from '@/types';
import { BUILTIN_EXPENSE_CATEGORIES, BUILTIN_INCOME_CATEGORIES } from '@/utils/constants';
import { useSubscriptionStore } from './subscriptionStore';
import { generateUUID } from '@/utils/uuid';
import { toast } from 'sonner';

interface BookState {
  books: Book[];
  currentBook: Book | null;
  categories: Category[];
  isLoading: boolean;
  isSyncing: boolean;
  
  // Actions
  fetchBooks: (userId: string) => Promise<void>;
  createBook: (name: string, type: BookType, userId: string) => Promise<Book | null>;
  setCurrentBook: (book: Book | null) => void;
  deleteBook: (bookId: string, userId: string) => Promise<void>;
  exitBook: (bookId: string, userId: string) => Promise<boolean>;
  
  // 邀请相关
  generateInviteCode: (bookId: string) => Promise<string | null>;
  joinBookByCode: (code: string, userId: string) => Promise<Book | null>;
  
  // 实时同步
  subscribeToBookChanges: (bookId: string) => (() => void);
  
  // Category
  fetchCategories: (bookId: string) => Promise<void>;
  getCategoriesByType: (type: 'INCOME' | 'EXPENSE') => Category[];
  
  // 检查
  canCreateBookType: (userId: string, type: BookType) => { canCreate: boolean; message?: string };
  isBookOwner: (bookId: string, userId: string) => boolean;
  hasBookType: (userId: string, type: BookType) => boolean;
}

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      books: [],
      currentBook: null,
      categories: [],
      isLoading: false,
      isSyncing: false,

      // 检查是否可以创建某类型账本
      canCreateBookType: (userId, type) => {
        // 检查是否已有该类型账本（包括创建的和加入的）
        const existingBook = get().books.find(b => 
          b.type === type && (
            b.createdBy === userId || 
            b.members.some(m => m.userId === userId)
          )
        );
        
        if (existingBook) {
          const isCreator = existingBook.createdBy === userId;
          return { 
            canCreate: false, 
            message: isCreator 
              ? `您已创建了一个${type === 'COUPLE' ? '情侣' : '家庭'}账本`
              : `您已加入了一个${type === 'COUPLE' ? '情侣' : '家庭'}账本，请先退出`
          };
        }
        
        if (type === 'COUPLE') {
          const subStore = useSubscriptionStore.getState();
          if (!subStore.isSubscriptionActive(userId, 'COUPLE')) {
            return { canCreate: false, message: '需要开通情侣会员' };
          }
        }
        
        if (type === 'FAMILY') {
          const subStore = useSubscriptionStore.getState();
          if (!subStore.isSubscriptionActive(userId, 'FAMILY')) {
            return { canCreate: false, message: '需要开通家庭会员' };
          }
        }
        
        return { canCreate: true };
      },

      // 检查是否已有某类型账本（包括创建的和加入的）
      hasBookType: (userId, type) => {
        return get().books.some(b => 
          b.type === type && (
            b.createdBy === userId || 
            b.members.some(m => m.userId === userId)
          )
        );
      },

      // 为情侣/家庭账本设置实时订阅
      subscribeToBookChanges: (bookId: string) => {
        console.log('Starting subscription for book:', bookId);
        
        const subscription = supabase
          .channel(`book_${bookId}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'book_members', 
            filter: `book_id=eq.${bookId}` 
          }, async (payload) => {
            console.log('Book member changed:', payload);
            // 成员变化时重新加载账本数据
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) {
              await get().fetchBooks(user.id);
            }
          })
          .subscribe((status) => {
            console.log('Subscription status:', status);
          });

        return () => {
          console.log('Removing subscription for book:', bookId);
          supabase.removeChannel(subscription);
        };
      },

      // 加载账本
      fetchBooks: async (userId) => {
        if (!userId) return;
        set({ isLoading: true });

        try {
          // 从云端加载所有账本
          const [createdBooks, memberBooks] = await Promise.all([
            // 自己创建的
            supabase.from('books').select('*').eq('created_by', userId),
            // 作为成员的
            supabase.from('book_members').select('book_id').eq('user_id', userId)
          ]);

          let allBooks: any[] = createdBooks.data || [];
          
          // 加载成员账本
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

          // 加载成员信息 - 为每个账本单独查询确保准确
          const membersByBook: Record<string, BookMember[]> = {};
          
          for (const book of uniqueBooks) {
            const { data: bookMembers } = await supabase
              .from('book_members')
              .select('*')
              .eq('book_id', book.id);
            
            if (bookMembers) {
              membersByBook[book.id] = bookMembers.map((m: any) => ({
                userId: m.user_id,
                role: m.role,
                joinedAt: m.joined_at,
              }));
            }
          }

          // 组装账本数据
          const books: Book[] = uniqueBooks.map((b: any) => ({
            id: b.id,
            name: b.name,
            type: b.type as BookType,
            currency: 'CNY',
            createdAt: b.created_at,
            createdBy: b.created_by,
            members: membersByBook[b.id] || [],
          }));

          // 保存到本地 - 先清空该用户的所有账本缓存，再写入新数据
          const localBooks = await db.books.toArray();
          const userBookIds = books.map(b => b.id);
          
          // 删除本地不在云端列表中的账本（已被删除或退出的）
          for (const localBook of localBooks) {
            if (!userBookIds.includes(localBook.id)) {
              await db.books.delete(localBook.id);
            }
          }
          
          // 写入最新数据
          for (const book of books) {
            await db.books.put({ ...book, synced: true, lastModified: Date.now() });
          }

          set({ 
            books,
            currentBook: get().currentBook || books[0] || null,
          });

          // 为所有账本加载分类
          for (const book of books) {
            await get().fetchCategories(book.id);
          }
        } catch (error) {
          console.error('Fetch books error:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      // 创建账本
      createBook: async (name, type, userId) => {
        try {
          // 检查权限
          const check = get().canCreateBookType(userId, type);
          if (!check.canCreate) {
            toast.error(check.message);
            return null;
          }

          const book: Book = {
            id: generateUUID(),
            name: name || (type === 'PERSONAL' ? '个人账本' : type === 'COUPLE' ? '情侣账本' : '家庭账本'),
            type,
            currency: 'CNY',
            createdAt: new Date().toISOString(),
            createdBy: userId,
            members: [],
          };

          // 创建默认分类
          const defaultCategories = [
            ...BUILTIN_EXPENSE_CATEGORIES.map((cat, i) => ({
              id: generateUUID(),
              bookId: book.id,
              name: cat.name,
              type: 'EXPENSE' as const,
              icon: cat.icon,
              color: cat.color,
              sortOrder: i,
              isBuiltin: true,
            })),
            ...BUILTIN_INCOME_CATEGORIES.map((cat, i) => ({
              id: generateUUID(),
              bookId: book.id,
              name: cat.name,
              type: 'INCOME' as const,
              icon: cat.icon,
              color: cat.color,
              sortOrder: i,
              isBuiltin: true,
            })),
          ];

          // 保存到云端
          await supabase.from('books').insert({
            id: book.id,
            name: book.name,
            type,
            created_by: userId,
          });

          // 如果是情侣/家庭账本，创建者自动成为第一个成员
          if (type === 'COUPLE' || type === 'FAMILY') {
            await supabase.from('book_members').insert({
              book_id: book.id,
              user_id: userId,
              role: 'OWNER',
              joined_at: new Date().toISOString(),
            });
            // 更新本地成员
            book.members = [{
              userId,
              role: 'OWNER',
              joinedAt: new Date().toISOString(),
            }];
          }

          await supabase.from('categories').insert(
            defaultCategories.map(c => ({
              id: c.id,
              book_id: c.bookId,
              name: c.name,
              type: c.type,
              icon: c.icon,
              color: c.color,
              sort_order: c.sortOrder,
              is_builtin: c.isBuiltin,
            }))
          );

          // 保存到本地
          await db.books.put({ ...book, synced: true, lastModified: Date.now() });
          for (const cat of defaultCategories) {
            await db.categories.put({ ...cat, synced: true, lastModified: Date.now() });
          }

          set(state => ({
            books: [...state.books, book],
            currentBook: book,
            categories: defaultCategories,
          }));

          return book;
        } catch (error) {
          console.error('Create book error:', error);
          toast.error('创建账本失败');
          return null;
        }
      },

      setCurrentBook: (book) => {
        set({ currentBook: book });
        if (book) get().fetchCategories(book.id);
      },

      // 删除账本
      deleteBook: async (bookId, userId) => {
        const book = get().books.find(b => b.id === bookId);
        if (!book) return;

        // 检查是否是最后一个个人账本
        if (book.type === 'PERSONAL') {
          const personalBooks = get().books.filter(b => b.type === 'PERSONAL');
          if (personalBooks.length <= 1) {
            toast.error('必须保留至少一个个人账本');
            return;
          }
        }

        // 检查权限
        if (book.createdBy !== userId) {
          toast.error('只有创建者可以删除账本');
          return;
        }

        // 更新UI
        set(state => ({
          books: state.books.filter(b => b.id !== bookId),
          currentBook: state.currentBook?.id === bookId
            ? state.books.find(b => b.id !== bookId) || null
            : state.currentBook,
        }));

        // 删除本地
        await db.books.delete(bookId);
        await db.categories.where('bookId').equals(bookId).delete();
        await db.transactions.where('bookId').equals(bookId).delete();

        // 删除云端（级联删除会自动处理成员和分类）
        try {
          await supabase.from('books').delete().eq('id', bookId);
        } catch (error) {
          console.error('Delete book error:', error);
        }
      },

      // 退出账本
      exitBook: async (bookId, userId) => {
        const book = get().books.find(b => b.id === bookId);
        if (!book) return false;

        if (book.createdBy === userId) {
          toast.error('创建者不能退出，只能删除账本');
          return false;
        }

        // 更新UI
        set(state => ({
          books: state.books.filter(b => b.id !== bookId),
          currentBook: state.currentBook?.id === bookId
            ? state.books.find(b => b.id !== bookId) || null
            : state.currentBook,
        }));

        // 删除本地账本数据
        await db.books.delete(bookId);
        
        // 删除该用户在该账本的所有交易记录
        const userTransactions = await db.transactions
          .where('bookId')
          .equals(bookId)
          .and(t => t.userId === userId)
          .toArray();
        
        for (const tx of userTransactions) {
          await db.transactions.delete(tx.id);
        }

        // 删除云端成员关系
        try {
          await supabase
            .from('book_members')
            .delete()
            .eq('book_id', bookId)
            .eq('user_id', userId);
          
          // 删除云端该用户的交易记录
          await supabase
            .from('transactions')
            .delete()
            .eq('book_id', bookId)
            .eq('user_id', userId);
          
          return true;
        } catch (error) {
          console.error('Exit book error:', error);
          return false;
        }
      },

      // 生成邀请码
      generateInviteCode: async (bookId) => {
        const book = get().books.find(b => b.id === bookId);
        if (!book) {
          toast.error('账本不存在');
          return null;
        }

        if (book.type === 'PERSONAL') {
          toast.error('个人账本不能邀请');
          return null;
        }

        // 检查成员数（对于情侣/家庭账本，members 已包含创建者）
        const maxMembers = book.type === 'COUPLE' ? 2 : 5;
        if (book.members.length >= maxMembers) {
          toast.error('账本成员已满');
          return null;
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        try {
          await supabase.from('book_invites').insert({
            id: generateUUID(),
            book_id: bookId,
            code,
            created_by: book.createdBy,
            created_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            max_uses: 1,
            used_count: 0,
          });

          return code;
        } catch (error) {
          console.error('Generate invite error:', error);
          toast.error('生成邀请码失败');
          return null;
        }
      },

      // 加入账本
      joinBookByCode: async (code, userId) => {
        let inviteBookId: string | null = null;
        
        try {
          // 查询邀请码
          const { data: invite, error } = await supabase
            .from('book_invites')
            .select('*, books(type)')
            .eq('code', code.trim())
            .single();

          if (error || !invite) {
            toast.error('邀请码无效');
            return null;
          }

          inviteBookId = invite.book_id;
          const bookType = invite.books?.type as BookType;

          // 检查过期
          if (new Date(invite.expires_at) < new Date()) {
            toast.error('邀请码已过期');
            return null;
          }

          // 检查使用次数
          if (invite.used_count >= invite.max_uses) {
            toast.error('邀请码已被使用');
            return null;
          }

          // 检查是否已在该账本中
          const existingBook = get().books.find(b => b.id === invite.book_id);
          if (existingBook) {
            const isMember = existingBook.members.some(m => m.userId === userId);
            const isOwner = existingBook.createdBy === userId;
            if (isMember || isOwner) {
              toast.error('你已经在该账本中');
              return existingBook;
            }
          }

          // 检查是否已有同类型账本（情侣/家庭只能有一个）
          if (bookType === 'COUPLE' || bookType === 'FAMILY') {
            const hasSameType = get().books.some(b => 
              b.type === bookType && (
                b.createdBy === userId || 
                b.members.some(m => m.userId === userId)
              )
            );
            if (hasSameType) {
              toast.error(`您已有一个${bookType === 'COUPLE' ? '情侣' : '家庭'}账本，请先退出`);
              return null;
            }
          }

          // 添加成员
          await supabase.from('book_members').insert({
            book_id: invite.book_id,
            user_id: userId,
            role: 'MEMBER',
            joined_at: new Date().toISOString(),
          });

          // 更新邀请码
          await supabase
            .from('book_invites')
            .update({ used_count: invite.used_count + 1 })
            .eq('id', invite.id);

          // 重新加载账本
          await get().fetchBooks(userId);
          
          
          return get().books.find(b => b.id === invite.book_id) || null;
        } catch (error: any) {
          console.error('Join book error:', error);
          if (error.code === '23505' && inviteBookId) {
            toast.error('你已经在该账本中');
            await get().fetchBooks(userId);
            return get().books.find(b => b.id === inviteBookId) || null;
          }
          toast.error('加入失败');
          return null;
        }
      },

      // 加载分类
      fetchCategories: async (bookId) => {
        try {
          const { data } = await supabase
            .from('categories')
            .select('*')
            .eq('book_id', bookId)
            .order('sort_order');

          if (data) {
            const categories: Category[] = data.map((c: any) => ({
              id: c.id,
              bookId: c.book_id,
              name: c.name,
              type: c.type as 'INCOME' | 'EXPENSE',
              icon: c.icon,
              color: c.color,
              sortOrder: c.sort_order,
              isBuiltin: c.is_builtin,
            }));

            // 保存到本地
            for (const cat of categories) {
              await db.categories.put({ ...cat, synced: true, lastModified: Date.now() });
            }

            set({ categories });
          }
        } catch (error) {
          console.error('Fetch categories error:', error);
        }
      },

      getCategoriesByType: (type) => {
        return get().categories.filter(c => c.type === type);
      },

      isBookOwner: (bookId, userId) => {
        const book = get().books.find(b => b.id === bookId);
        return book?.createdBy === userId;
      },
    }),
    {
      name: 'book-store',
      partialize: (state) => ({
        currentBook: state.currentBook,
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
