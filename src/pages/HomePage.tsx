import { useEffect, useState } from 'react';
import { useBookStore } from '@/stores/bookStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { 
  ChevronRight,
  Receipt,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  User,
  Heart,
  Users,
  Crown
} from 'lucide-react';
import { formatAmount, getDateRange } from '@/utils/constants';
import type { Transaction, BookType, Category } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { parseDate } from '@/services/db';

interface HomePageProps {
  onNavigate?: (page: string) => void;
}

export function HomePage(_props: HomePageProps = {}) {
  const { user } = useAuthStore();
  const { currentBook, books, setCurrentBook, createBook, canCreateBookType, categories, subscribeToBookChanges } = useBookStore();
  const { getTransactionsByDateRange, getSummary, fetchTransactions, deleteTransaction, subscribeToTransactionChanges } = useTransactionStore();
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showCreateBook, setShowCreateBook] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [selectedBookType, setSelectedBookType] = useState<BookType>('PERSONAL');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const dateRange = getDateRange('month');
  const summary = currentBook ? getSummary(currentBook.id, dateRange) : { income: 0, expense: 0, balance: 0 };
  const allTransactions = currentBook 
    ? getTransactionsByDateRange(currentBook.id, dateRange)
    : [];
  const recentTransactions = allTransactions.slice(0, 10);

  useEffect(() => {
    if (!currentBook && books.length > 0) {
      setCurrentBook(books[0]);
    }
  }, [currentBook, books, setCurrentBook]);

  // 当账本变化时加载当前账本数据
  useEffect(() => {
    const loadData = async () => {
      if (currentBook) {
        // 加载交易
        await fetchTransactions(currentBook.id);
      }
    };
    loadData();
  }, [currentBook?.id, fetchTransactions]);

  // 情侣/家庭账本实时订阅成员变化
  useEffect(() => {
    if (currentBook && (currentBook.type === 'COUPLE' || currentBook.type === 'FAMILY') && user?.id) {
      // 启动实时订阅，传入 userId 而不是依赖 supabase.auth.getUser()
      return subscribeToBookChanges(currentBook.id, user.id);
    }
  }, [currentBook?.id, currentBook?.type, subscribeToBookChanges, user?.id]);

  // 实时订阅当前账本的交易变化
  useEffect(() => {
    if (currentBook?.id) {
      if (import.meta.env.DEV) {
        console.log('Start transaction realtime subscription:', currentBook.id);
      }
      return subscribeToTransactionChanges(currentBook.id);
    }
  }, [currentBook?.id, subscribeToTransactionChanges]);

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTransaction(null);
    // 刷新数据
    if (currentBook) {
      fetchTransactions(currentBook.id);
    }
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setDeletingTransaction(transaction);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransaction || !currentBook) return;
    
    setIsDeleting(true);
    try {
      await deleteTransaction(deletingTransaction.id, currentBook.id);
      
      setDeletingTransaction(null);
    } catch (error) {
      console.error('删除错误:', error);
      toast.error('删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // 按日期分组交易记录
  const groupTransactionsByDate = (transactions: Transaction[]) => {
    // 先按记账日期倒序，再按创建时间倒序，避免刷新后顺序抖动
    const sortedTransactions = [...transactions].sort((a, b) => 
      parseDate(b.recordDate).getTime() - parseDate(a.recordDate).getTime() ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const groups: { [key: string]: Transaction[] } = {};
    
    sortedTransactions.forEach(tx => {
      const date = tx.recordDate.split('T')[0]; // YYYY-MM-DD
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(tx);
    });
    
    // 转换为数组并按日期降序排序
    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => {
        const txs = groups[date];
        const income = txs
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + t.amount, 0);
        const expense = txs
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + t.amount, 0);
        
        return {
          date,
          transactions: txs,
          dayTotal: { income, expense }
        };
      });
  };

  // 格式化日期显示（如：19）
  const formatDay = (dateStr: string) => {
    return new Date(dateStr).getDate().toString();
  };

  // 格式化星期显示（如：周四）
  const formatWeekday = (dateStr: string) => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[new Date(dateStr).getDay()];
  };

  // 处理创建新账本
  const handleCreateBook = async () => {
    if (!user) return;
    
    const check = await canCreateBookType(user.id, selectedBookType);
    if (!check.canCreate) {
      return;
    }

    setIsCreating(true);
    try {
      const book = await createBook(newBookName || '', selectedBookType, user.id);
      if (book) {
        
        setShowCreateBook(false);
        setNewBookName('');
      } else {
        toast.error('创建失败，请检查会员权限');
      }
    } catch (error) {
      console.error('创建账本错误:', error);
      toast.error('创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  // 获取可用的账本类型
  const getAvailableBookTypes = (): { type: BookType; label: string; icon: typeof User; disabled: boolean; message?: string }[] => {
    if (!user) return [];
    
    const types: BookType[] = ['PERSONAL', 'COUPLE', 'FAMILY'];
    return types.map(type => {
      const check = canCreateBookType(user.id, type);
      
      const labels: Record<BookType, string> = {
        PERSONAL: '个人账本',
        COUPLE: '情侣账本',
        FAMILY: '家庭账本'
      };
      const icons: Record<BookType, typeof User> = {
        PERSONAL: User,
        COUPLE: Heart,
        FAMILY: Users
      };
      return {
        type,
        label: labels[type],
        icon: icons[type],
        disabled: !check.canCreate,
        message: check.message
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部渐变背景 */}
      <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 pb-8">
        {/* 头部 */}
        <div className="px-4 pt-12 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">
                  {user?.nickname?.[0] || user?.phone?.slice(-1) || 'U'}
                </span>
              </div>
              <div>
                <p className="text-white/80 text-sm">下午好</p>
                <p className="text-white font-medium">{user?.nickname || '用户'}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowBookSelector(!showBookSelector)}
              className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full"
            >
              <span className="text-white text-sm">{currentBook?.name || '选择账本'}</span>
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* 本月收支卡片 */}
        <div className="px-4">
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-gray-500 text-sm">本月结余</span>
                <Badge variant="secondary" className="bg-teal-50 text-teal-600">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date().getMonth() + 1}月
                </Badge>
              </div>
              
              <div className="text-3xl font-bold text-gray-900 mb-6">
                {formatAmount(summary.balance)}
              </div>
              
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <ArrowDownRight className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">本月收入</p>
                    <p className="text-green-600 font-semibold">{formatAmount(summary.income)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">本月支出</p>
                    <p className="text-red-600 font-semibold">{formatAmount(summary.expense)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 最近记账 */}
      <div className="px-4 mt-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">最近记账</h2>
          <Button variant="ghost" size="sm" className="text-teal-600" onClick={() => _props.onNavigate?.('statistics')}>
            查看全部
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {recentTransactions.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无交易记录</p>
              <p className="text-gray-400 text-sm mt-1">点击底部+号开始记账</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupTransactionsByDate(recentTransactions).map(({ date, transactions, dayTotal }) => (
              <div key={date} className="space-y-2">
                {/* 日期标题 */}
                <div className="flex items-center justify-between px-2 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{formatDay(date)}</span>
                    <span className="text-sm text-gray-500">{formatWeekday(date)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {dayTotal.income > 0 && (
                      <span className="text-green-600">收 {formatAmount(dayTotal.income)}</span>
                    )}
                    {dayTotal.expense > 0 && (
                      <span className="text-red-600">支 {formatAmount(dayTotal.expense)}</span>
                    )}
                  </div>
                </div>
                
                {/* 当天交易列表 */}
                <div className="space-y-2 pl-2">
                  {transactions.map((transaction) => (
                    <TransactionItem 
                      key={transaction.id} 
                      transaction={transaction}
                      categories={categories}
                      onEdit={() => handleEditTransaction(transaction)}
                      onDelete={() => handleDeleteClick(transaction)}
                      bookType={currentBook?.type}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      <EditTransactionModal
        transaction={editingTransaction}
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
      />

      {/* 账本选择器弹窗 */}
      {showBookSelector && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => setShowBookSelector(false)}
        >
          <div 
            className="bg-white rounded-t-3xl w-full max-h-[70vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-center">选择账本</h3>
            </div>
            <div className="p-4 space-y-3">
              {books.map(book => (
                <button
                  key={book.id}
                  onClick={() => {
                    setCurrentBook(book);
                    setShowBookSelector(false);
                  }}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all',
                    currentBook?.id === book.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-100 hover:border-gray-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{book.name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {book.type === 'PERSONAL' && '个人账本'}
                        {book.type === 'COUPLE' && '情侣账本'}
                        {book.type === 'FAMILY' && '家庭账本'}
                        · {book.members.length}人
                      </p>
                    </div>
                    {currentBook?.id === book.id && (
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
              <Button 
                variant="outline" 
                className="w-full py-6 border-dashed"
                onClick={() => {
                  setShowBookSelector(false);
                  setShowCreateBook(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                创建新账本
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deletingTransaction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">确认删除？</h3>
            <p className="text-gray-500 mb-6">删除后无法恢复</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeletingTransaction(null)}
                disabled={isDeleting}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '删除'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 创建账本弹窗 */}
      <Dialog open={showCreateBook} onOpenChange={setShowCreateBook}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建新账本</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 账本类型选择 */}
            <div className="space-y-2">
              <Label>账本类型</Label>
              <div className="grid grid-cols-3 gap-2">
                {getAvailableBookTypes().map(({ type, label, icon: Icon, disabled, message }) => (
                  <button
                    key={type}
                    onClick={() => !disabled && setSelectedBookType(type)}
                    disabled={disabled}
                    title={message}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                      selectedBookType === type
                        ? 'border-teal-500 bg-teal-50'
                        : disabled
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-teal-200'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      selectedBookType === type ? 'bg-teal-500' : 'bg-gray-100'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        selectedBookType === type ? 'text-white' : 'text-gray-500'
                      )} />
                    </div>
                    <span className={cn(
                      'text-xs font-medium',
                      selectedBookType === type ? 'text-teal-700' : 'text-gray-600'
                    )}>
                      {label}
                    </span>
                    {disabled && message?.includes('会员') && (
                      <Crown className="w-3 h-3 text-orange-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 账本名称 */}
            <div className="space-y-2">
              <Label>账本名称（可选）</Label>
              <Input
                placeholder={selectedBookType === 'PERSONAL' ? '个人账本' : selectedBookType === 'COUPLE' ? '情侣账本' : '家庭账本'}
                value={newBookName}
                onChange={(e) => setNewBookName(e.target.value)}
              />
            </div>

            {/* 提示信息 */}
            {selectedBookType !== 'PERSONAL' && (
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-xs text-orange-600">
                  <Crown className="w-3 h-3 inline mr-1" />
                  {selectedBookType === 'COUPLE' ? '情侣账本' : '家庭账本'}需要开通相应会员才能创建
                </p>
              </div>
            )}

            <Button 
              onClick={handleCreateBook} 
              className="w-full bg-teal-500 hover:bg-teal-600"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建账本'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 交易项组件
interface TransactionItemProps {
  transaction: Transaction;
  categories: Category[];
  onEdit: () => void;
  onDelete: () => void;
  bookType?: string;
  currentUserId?: string;
}

function TransactionItem({ transaction, categories, onEdit, onDelete, bookType, currentUserId }: TransactionItemProps) {
  const category = categories.find(c => c.id === transaction.categoryId);
  const isExpense = transaction.type === 'EXPENSE';
  
  // 判断是否可以编辑/删除（只能操作自己的记录）
  const canModify = transaction.userId === currentUserId;
  
  // 判断是否为情侣/家庭账本且不是自己记的
  const showRecorder = bookType === 'COUPLE' || bookType === 'FAMILY';
  const isMyRecord = transaction.userId === currentUserId;
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: category?.color + '20' || '#f3f4f6' }}
        >
          {category?.icon || '📦'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">{category?.name || '未知分类'}</p>
          <p className="text-xs text-gray-500 truncate">
            {transaction.description || ' '}
            {showRecorder && (
              <span className={cn(
                "ml-2 px-1.5 py-0.5 rounded text-[10px]",
                isMyRecord ? "bg-teal-100 text-teal-700" : "bg-pink-100 text-pink-700"
              )}>
                {isMyRecord ? '我' : 'TA'}
              </span>
            )}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 shrink-0 ml-2">
        <span className={cn(
          'font-mono font-semibold text-sm text-right min-w-[80px]',
          isExpense ? 'text-red-600' : 'text-green-600'
        )}>
          {isExpense ? '-' : '+'}{formatAmount(transaction.amount)}
        </span>
        
        {/* 操作按钮 - 只能编辑/删除自己的记录 */}
        {canModify && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
              title="编辑"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
