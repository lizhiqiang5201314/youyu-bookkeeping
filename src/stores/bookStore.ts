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
import { useAuthStore } from './authStore';

interface BookState {
  books: Book[];
  currentBook: Book | null;
  categories: Category[];
  categoriesMap: Record<string, Category[]>; // 按账本ID存储分类
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
  subscribeToBookChanges: (bookId: string, userId: string) => (() => void);
  
  // Category
  fetchCategories: (bookId: string) => Promise<void>;
  getCategoriesByType: (type: 'INCOME' | 'EXPENSE') => Category[];
  getCategoriesByTypeForBook: (bookId: string, type: 'INCOME' | 'EXPENSE') => Category[];
  
  // 检查
  canCreateBookType: (userId: string, type: BookType) => { canCreate: boolean; message?: string };
  isBookOwner: (bookId: string, userId: string) => boolean;
  hasBookType: (userId: string, type: BookType) => boolean;
}

function getNextCurrentBook(currentBook: Book | null, books: Book[]): Book | null {
  if (!currentBook) {
    return books[0] || null;
  }

  return books.find(book => book.id === currentBook.id) || books[0] || null;
}

function getBookTypeLabel(type: BookType): string {
  if (type === 'PERSONAL') return '个人';
  if (type === 'COUPLE') return '情侣';
  return '家庭';
}

function removeBookFromState(
  state: Pick<BookState, 'books' | 'currentBook' | 'categories' | 'categoriesMap'>,
  bookId: string
) {
  const nextBooks = state.books.filter(book => book.id !== bookId);
  const nextCurrentBook = state.currentBook?.id === bookId
    ? nextBooks[0] || null
    : nextBooks.find(book => book.id === state.currentBook?.id) || state.currentBook;
  const { [bookId]: _removed, ...nextCategoriesMap } = state.categoriesMap;

  return {
    books: nextBooks,
    currentBook: nextCurrentBook,
    categoriesMap: nextCategoriesMap,
    categories: nextCurrentBook ? (nextCategoriesMap[nextCurrentBook.id] || []) : [],
  };
}

async function removeLocalBookData(bookId: string) {
  await db.books.delete(bookId);
  await db.categories.where('bookId').equals(bookId).delete();
  await db.transactions.where('bookId').equals(bookId).delete();
  await db.budgets.where('bookId').equals(bookId).delete();
}

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      books: [],
      currentBook: null,
      categories: [],
      categoriesMap: {},
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
          const bookTypeLabel = getBookTypeLabel(type);
          return { 
            canCreate: false, 
            message: isCreator 
              ? `您已创建了一个${bookTypeLabel}账本`
              : `您已加入了一个${bookTypeLabel}账本，请先退出`
          };
        }
        
        if (type === 'COUPLE') {
          const subStore = useSubscriptionStore.getState();
          if (!subStore.canCreateCoupleBook(userId)) {
            return { canCreate: false, message: '需要开通情侣会员' };
          }
        }
        
        if (type === 'FAMILY') {
          const subStore = useSubscriptionStore.getState();
          if (!subStore.canCreateFamilyBook(userId)) {
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
      subscribeToBookChanges: (bookId: string, userId: string) => {
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
            if (userId) {
              await get().fetchBooks(userId);
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
          const bookIds = uniqueBooks.map(b => b.id);

          // 加载成员信息 - 批量查询所有账本的成员
          const membersByBook: Record<string, BookMember[]> = {};
          
          if (bookIds.length > 0) {
            const { data: allMembers } = await supabase
              .from('book_members')
              .select('*')
              .in('book_id', bookIds);
            
            if (allMembers) {
              // 按账本ID分组
              for (const member of allMembers) {
                if (!membersByBook[member.book_id]) {
                  membersByBook[member.book_id] = [];
                }
                membersByBook[member.book_id].push({
                  userId: member.user_id,
                  role: member.role,
                  joinedAt: member.joined_at,
                });
              }
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

          // 保存到本地 - 使用 bulkPut 批量写入
          const localBooks = await db.books.toArray();
          const userBookIds = books.map(b => b.id);
          
          // 删除本地不在云端列表中的账本（已被删除或退出的）
          const booksToDelete = localBooks
            .filter(localBook => !userBookIds.includes(localBook.id))
            .map(b => b.id);
          
          if (booksToDelete.length > 0) {
            await db.books.bulkDelete(booksToDelete);
          }
          
          // 批量写入最新数据
          const booksToPut = books.map(book => ({ 
            ...book, 
            synced: true, 
            lastModified: Date.now() 
          }));
          await db.books.bulkPut(booksToPut);

          set({
            books,
            currentBook: getNextCurrentBook(get().currentBook, books),
          });

          // 为所有账本批量加载分类
          if (bookIds.length > 0) {
            const { data: allCategories } = await supabase
              .from('categories')
              .select('*')
              .in('book_id', bookIds)
              .order('sort_order');
            
            if (allCategories) {
              // 按账本ID分组
              const categoriesByBook: Record<string, Category[]> = {};
              for (const cat of allCategories) {
                if (!categoriesByBook[cat.book_id]) {
                  categoriesByBook[cat.book_id] = [];
                }
                categoriesByBook[cat.book_id].push({
                  id: cat.id,
                  bookId: cat.book_id,
                  name: cat.name,
                  type: cat.type as 'INCOME' | 'EXPENSE',
                  icon: cat.icon,
                  color: cat.color,
                  sortOrder: cat.sort_order,
                  isBuiltin: cat.is_builtin,
                });
              }
              
              // 批量保存到本地数据库
              const categoriesToPut: Category[] = [];
              for (const bookId of bookIds) {
                const cats = categoriesByBook[bookId] || [];
                for (const cat of cats) {
                  categoriesToPut.push({
                    ...cat,
                    synced: true,
                    lastModified: Date.now(),
                  } as Category);
                }
              }
              await db.categories.bulkPut(categoriesToPut);
              
              // 更新 store 中的分类数据
              const categoriesMap: Record<string, Category[]> = {};
              for (const bookId of bookIds) {
                categoriesMap[bookId] = categoriesByBook[bookId] || [];
              }
              set({ categoriesMap });
            }
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

          // 如果是情侣/家庭账本，确保创建者拥有 OWNER 成员关系
          if (type === 'COUPLE' || type === 'FAMILY') {
            const joinedAt = new Date().toISOString();

            const { error: memberError } = await supabase.from('book_members').upsert({
              book_id: book.id,
              user_id: userId,
              role: 'OWNER',
              joined_at: joinedAt,
            }, {
              onConflict: 'book_id,user_id',
              ignoreDuplicates: true,
            });

            if (memberError) {
              throw memberError;
            }

            // 更新本地成员
            book.members = [{
              userId,
              role: 'OWNER',
              joinedAt,
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
            categoriesMap: { ...state.categoriesMap, [book.id]: defaultCategories },
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

        // 删除云端（级联删除会自动处理成员和分类）
        try {
          const { error } = await supabase.from('books').delete().eq('id', bookId);
          if (error) {
            throw error;
          }

          await removeLocalBookData(bookId);

          set(state => removeBookFromState(state, bookId));
        } catch (error) {
          console.error('Delete book error:', error);
          toast.error('删除账本失败');
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

        try {
          const { error } = await supabase
            .from('book_members')
            .delete()
            .eq('book_id', bookId)
            .eq('user_id', userId);

          if (error) {
            throw error;
          }

          // 本地移除整本账本数据，但保留云端共享历史给剩余成员
          await removeLocalBookData(bookId);

          set(state => removeBookFromState(state, bookId));

          return true;
        } catch (error) {
          console.error('Exit book error:', error);
          toast.error('退出账本失败');
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

        const currentUserId = useAuthStore.getState().user?.id;
        if (!currentUserId || book.createdBy !== currentUserId) {
          toast.error('只有创建者可以生成邀请码');
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

          // 先抢占邀请码，避免同一个邀请码被并发重复使用
          const { data: claimedInvite, error: claimError } = await supabase
            .from('book_invites')
            .update({ used_count: invite.used_count + 1 })
            .eq('id', invite.id)
            .eq('used_count', invite.used_count)
            .select('id')
            .single();

          if (claimError || !claimedInvite) {
            toast.error('邀请码已被使用');
            return null;
          }

          // 添加成员
          const { error: joinError } = await supabase.from('book_members').insert({
            book_id: invite.book_id,
            user_id: userId,
            role: 'MEMBER',
            joined_at: new Date().toISOString(),
          });

          if (joinError) {
            await supabase
              .from('book_invites')
              .update({ used_count: invite.used_count })
              .eq('id', invite.id)
              .eq('used_count', invite.used_count + 1);

            throw joinError;
          }

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
          if (typeof error?.message === 'string') {
            if (error.message.includes('shared_book_member_limit_reached')) {
              toast.error('账本成员已满');
              return null;
            }
            if (error.message.includes('shared_book_same_type_exists')) {
              toast.error('您已有一个同类型账本，请先退出');
              return null;
            }
          }
          toast.error('加入失败');
          return null;
        }
      },

      // 加载分类 - 等待云端数据确保分类就绪
      fetchCategories: async (bookId) => {
        if (!bookId) return;
        set({ isLoading: true });
        
        try {
          // 🎯 优先从云端加载（确保数据最新）
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('book_id', bookId)
            .order('sort_order');

          if (error) {
            console.error('Fetch categories error:', error);
            // 出错时回退到本地
            const localCats = await db.categories.where('bookId').equals(bookId).toArray();
            if (localCats.length > 0) {
              const categories: Category[] = localCats.map(c => ({
                id: c.id,
                bookId: c.bookId,
                name: c.name,
                type: c.type as 'INCOME' | 'EXPENSE',
                icon: c.icon,
                color: c.color,
                sortOrder: c.sortOrder,
                isBuiltin: c.isBuiltin,
              }));
              
              set(state => ({
                categoriesMap: { ...state.categoriesMap, [bookId]: categories },
                categories: state.currentBook?.id === bookId ? categories : state.categories,
              }));
            }
            return;
          }

          if (data && data.length > 0) {
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

            set(state => ({
              categoriesMap: { ...state.categoriesMap, [bookId]: categories },
              categories: state.currentBook?.id === bookId ? categories : state.categories,
            }));
            
            console.log(`✅ 已加载 ${categories.length} 个分类`);
          } else {
            // 云端没有数据，使用默认分类
            console.log('⚠️ 云端无分类，使用默认分类');
            const defaultCategories = [
              ...BUILTIN_EXPENSE_CATEGORIES.map((cat, i) => ({
                id: generateUUID(),
                bookId,
                name: cat.name,
                type: 'EXPENSE' as const,
                icon: cat.icon,
                color: cat.color,
                sortOrder: i,
                isBuiltin: true,
              })),
              ...BUILTIN_INCOME_CATEGORIES.map((cat, i) => ({
                id: generateUUID(),
                bookId,
                name: cat.name,
                type: 'INCOME' as const,
                icon: cat.icon,
                color: cat.color,
                sortOrder: i,
                isBuiltin: true,
              })),
            ];
            
            // 保存到云端
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
            for (const cat of defaultCategories) {
              await db.categories.put({ ...cat, synced: true, lastModified: Date.now() });
            }
            
            set(state => ({
              categoriesMap: { ...state.categoriesMap, [bookId]: defaultCategories },
              categories: state.currentBook?.id === bookId ? defaultCategories : state.categories,
            }));
            
            console.log(`✅ 已创建 ${defaultCategories.length} 个默认分类`);
          }
        } catch (error) {
          console.error('Fetch categories error:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      getCategoriesByType: (type) => {
        const { currentBook, categoriesMap } = get();
        if (!currentBook) return [];
        const cats = categoriesMap[currentBook.id] || [];
        return cats.filter(c => c.type === type);
      },

      getCategoriesByTypeForBook: (bookId, type) => {
        const { categoriesMap } = get();
        const cats = categoriesMap[bookId] || [];
        return cats.filter(c => c.type === type);
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
