import { db } from '@/services/db';
import { supabase } from '@/services/supabase';

/**
 * 数据清理工具 - 清理本地脏数据
 */

/**
 * 清理指定账本以外的所有本地数据
 */
export async function cleanOtherBookData(currentBookId: string): Promise<void> {
  console.log(`🧹 清理非当前账本(${currentBookId})的本地数据...`);
  
  try {
    // 1. 清理交易数据
    const allTransactions = await db.transactions.toArray();
    const otherBookTxs = allTransactions.filter(t => t.bookId !== currentBookId);
    
    for (const tx of otherBookTxs) {
      await db.transactions.delete(tx.id);
    }
    console.log(`  ✅ 清理了 ${otherBookTxs.length} 条其他账本的交易`);
    
    // 2. 清理分类数据（保留当前账本的）
    const allCategories = await db.categories.toArray();
    const otherBookCats = allCategories.filter(c => c.bookId !== currentBookId);
    
    for (const cat of otherBookCats) {
      await db.categories.delete(cat.id);
    }
    console.log(`  ✅ 清理了 ${otherBookCats.length} 条其他账本的分类`);
    
    // 3. 清理预算数据
    const allBudgets = await db.budgets.toArray();
    const otherBookBudgets = allBudgets.filter(b => b.bookId !== currentBookId);
    
    for (const budget of otherBookBudgets) {
      await db.budgets.delete(budget.id);
    }
    console.log(`  ✅ 清理了 ${otherBookBudgets.length} 条其他账本的预算`);
    
    console.log('🎉 数据清理完成');
  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  }
}

/**
 * 完全重置本地数据库
 */
export async function resetLocalDatabase(): Promise<void> {
  console.log('🗑️ 正在重置本地数据库...');
  
  try {
    await db.transactions.clear();
    await db.categories.clear();
    await db.budgets.clear();
    await db.books.clear();
    await db.bookInvites.clear();
    
    console.log('✅ 本地数据库已清空');
    console.log('提示：刷新页面将从云端重新加载数据');
  } catch (error) {
    console.error('❌ 重置失败:', error);
    throw error;
  }
}

/**
 * 同步并清理 - 先同步云端数据，再清理本地多余的
 */
export async function syncAndClean(userId: string): Promise<void> {
  console.log('🔄 开始同步并清理...');
  
  try {
    // 1. 获取用户的所有账本
    const { data: books } = await supabase
      .from('books')
      .select('id')
      .or(`created_by.eq.${userId},book_members.user_id.eq.${userId}`);
    
    if (!books) {
      console.log('没有账本，清空所有本地数据');
      await resetLocalDatabase();
      return;
    }
    
    const validBookIds = new Set(books.map(b => b.id));
    
    // 2. 清理不在云端列表中的账本数据
    const allTransactions = await db.transactions.toArray();
    const orphanTxs = allTransactions.filter(t => !validBookIds.has(t.bookId));
    
    for (const tx of orphanTxs) {
      await db.transactions.delete(tx.id);
    }
    console.log(`  ✅ 清理了 ${orphanTxs.length} 条孤儿交易`);
    
    // 3. 重新加载所有有效账本的数据
    for (const bookId of validBookIds) {
      // 从云端加载交易
      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('book_id', bookId);
      
      if (txs) {
        await db.transactions.bulkPut(
          txs.map((t: any) => ({
            id: t.id,
            bookId: t.book_id,
            userId: t.user_id,
            categoryId: t.category_id,
            amount: t.amount,
            type: t.type,
            description: t.description,
            recordDate: t.record_date,
            images: t.images || [],
            createdAt: t.created_at,
            synced: true,
            lastModified: Date.now(),
          }))
        );
        console.log(`  ✅ 账本 ${bookId}: 同步了 ${txs.length} 条交易`);
      }
      
      // 从云端加载分类
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('book_id', bookId);
      
      if (cats) {
        await db.categories.bulkPut(
          cats.map((c: any) => ({
            id: c.id,
            bookId: c.book_id,
            name: c.name,
            type: c.type,
            icon: c.icon,
            color: c.color,
            sortOrder: c.sort_order,
            isBuiltin: c.is_builtin,
            synced: true,
            lastModified: Date.now(),
          }))
        );
        console.log(`  ✅ 账本 ${bookId}: 同步了 ${cats.length} 个分类`);
      }
    }
    
    console.log('🎉 同步并清理完成');
  } catch (error) {
    console.error('❌ 同步失败:', error);
    throw error;
  }
}
