import { useState, useEffect, useMemo, useRef } from 'react';
import { useBookStore } from '@/stores/bookStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TransactionType } from '@/types';
import { Calendar, X, StickyNote, Loader2 } from 'lucide-react';

// 日期格式化工具
const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if (isToday) return { label: '今天', weekday, full: `${month}月${day}日` };
  if (isYesterday) return { label: '昨天', weekday, full: `${month}月${day}日` };
  return { label: `${month}月${day}日`, weekday, full: `${month}月${day}日` };
};

// 滚轮式日期选择器
function DatePicker({ value, onChange, onCancel }: { value: string; onChange: (date: string) => void; onCancel: () => void }) {
  const date = new Date(value);
  const [selectedYear, setSelectedYear] = useState(date.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(date.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(date.getDate());
  
  // 生成年份列表（前后10年）
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  
  // 生成月份列表
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // 生成日期列表（根据年月动态）
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // 用于滚动的 ref
  const yearContainerRef = useRef<HTMLDivElement>(null);
  const monthContainerRef = useRef<HTMLDivElement>(null);
  const dayContainerRef = useRef<HTMLDivElement>(null);
  
  // 组件挂载后自动滚动到选中项
  useEffect(() => {
    const itemHeight = 44; // h-11 = 44px
    const containerHeight = 208; // h-52 = 208px
    const offset = (containerHeight - itemHeight) / 2;
    
    // 滚动年份到选中项
    const yearIndex = years.indexOf(selectedYear);
    if (yearContainerRef.current && yearIndex !== -1) {
      yearContainerRef.current.scrollTop = yearIndex * itemHeight - offset;
    }
    
    // 滚动月份到选中项
    const monthIndex = months.indexOf(selectedMonth);
    if (monthContainerRef.current && monthIndex !== -1) {
      monthContainerRef.current.scrollTop = monthIndex * itemHeight - offset;
    }
    
    // 滚动日期到选中项
    const dayIndex = days.indexOf(selectedDay);
    if (dayContainerRef.current && dayIndex !== -1) {
      dayContainerRef.current.scrollTop = dayIndex * itemHeight - offset;
    }
  }, []);
  
  // 处理日期变化
  const handleConfirm = () => {
    // 手动格式化日期，避免时区问题
    const year = selectedYear;
    const month = String(selectedMonth).padStart(2, '0');
    const day = String(selectedDay).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl">
        {/* 顶部按钮 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button onClick={onCancel} className="text-gray-500 text-base">取消</button>
          <span className="text-base font-medium">选择日期</span>
          <button onClick={handleConfirm} className="text-teal-500 text-base font-medium">确定</button>
        </div>
        
        {/* 三列滚轮 */}
        <div className="flex h-52 relative">
          {/* 年 */}
          <div ref={yearContainerRef} className="flex-1 overflow-y-auto scrollbar-hide" style={{ scrollSnapType: 'y mandatory' }}>
            {years.map((year) => (
              <div
                key={year}
                onClick={() => setSelectedYear(year)}
                className={cn(
                  'h-11 flex items-center justify-center text-base transition-colors',
                  selectedYear === year ? 'text-gray-900 font-medium' : 'text-gray-400'
                )}
                style={{ scrollSnapAlign: 'center' }}
              >
                {year}年
              </div>
            ))}
          </div>
          
          {/* 月 */}
          <div ref={monthContainerRef} className="flex-1 overflow-y-auto scrollbar-hide" style={{ scrollSnapType: 'y mandatory' }}>
            {months.map((month) => (
              <div
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={cn(
                  'h-11 flex items-center justify-center text-base transition-colors',
                  selectedMonth === month ? 'text-gray-900 font-medium' : 'text-gray-400'
                )}
                style={{ scrollSnapAlign: 'center' }}
              >
                {String(month).padStart(2, '0')}月
              </div>
            ))}
          </div>
          
          {/* 日 */}
          <div ref={dayContainerRef} className="flex-1 overflow-y-auto scrollbar-hide" style={{ scrollSnapType: 'y mandatory' }}>
            {days.map((day) => (
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'h-11 flex items-center justify-center text-base transition-colors',
                  selectedDay === day ? 'text-gray-900 font-medium' : 'text-gray-400'
                )}
                style={{ scrollSnapAlign: 'center' }}
              >
                {String(day).padStart(2, '0')}日
              </div>
            ))}
          </div>
          
          {/* 选中指示器 */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-11 bg-gray-100/50 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

// 日期选择器组件
function DateSelector({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [showPicker, setShowPicker] = useState(false);
  
  const display = useMemo(() => formatDateDisplay(value), [value]);
  
  return (
    <>
      <button 
        onClick={() => setShowPicker(true)}
        className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl flex-1"
      >
        <Calendar className="w-4 h-4 text-teal-500" />
        <span className="text-sm font-medium text-gray-700">
          {display.label}
        </span>
        <span className="text-xs text-gray-400">
          {display.weekday}
        </span>
      </button>
      
      {showPicker && (
        <DatePicker 
          value={value} 
          onChange={(date) => {
            onChange(date);
            setShowPicker(false);
          }}
          onCancel={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickAddModal({ open, onClose }: QuickAddModalProps) {
  const { user } = useAuthStore();
  const { currentBook, getCategoriesByType, fetchCategories } = useBookStore();
  const { addTransaction } = useTransactionStore();
  
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [note, setNote] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const categories = getCategoriesByType(type);
  
  useEffect(() => {
    if (open) {
      setAmount('');
      setNote('');
      setRecordDate(new Date().toISOString().split('T')[0]);
      setShowNoteInput(false);
      // 确保分类已加载
      if (currentBook) {
        fetchCategories(currentBook.id);
      }
      // 设置默认分类（根据当前类型）
      const cats = getCategoriesByType(type);
      if (cats.length > 0) {
        setSelectedCategoryId(cats[0].id);
      }
    }
  }, [open, type, currentBook, fetchCategories]);
  
  // 类型切换时自动选择默认分类
  useEffect(() => {
    const cats = getCategoriesByType(type);
    if (cats.length > 0) {
      setSelectedCategoryId(cats[0].id);
    }
  }, [type]);

  const handleNumberPress = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    if (amount.includes('.') && amount.split('.')[1]?.length >= 2) return;
    if (amount === '0' && num !== '.') {
      setAmount(num);
      return;
    }
    if (amount.length >= 10) return;
    setAmount(prev => prev + num);
  };

  const handleDelete = () => {
    setAmount(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!currentBook) {
      toast.error('请先选择账本');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('请输入金额');
      return;
    }
    if (!selectedCategoryId) {
      toast.error('请选择分类');
      return;
    }
    if (!user) {
      toast.error('请先登录');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('DEBUG - 开始记账:', {
        userId: user?.id,
        currentBookId: currentBook?.id,
        selectedCategoryId,
        amount,
        type
      });
      
      const numAmount = Math.round(parseFloat(amount) * 100);
      
      if (!user?.id || !currentBook?.id || !selectedCategoryId) {
        console.error('缺少必要参数:', { user, currentBook, selectedCategoryId });
        toast.error('数据不完整，请刷新页面重试');
        setIsSubmitting(false);
        return;
      }
      
      // 直接使用 YYYY-MM-DD 格式，避免时区问题
      const result = await addTransaction({
        bookId: currentBook.id,
        userId: user.id,
        categoryId: selectedCategoryId,
        amount: numAmount,
        type,
        description: note || undefined,
        recordDate: recordDate, // 直接使用选择的日期字符串
        images: [],
      }, user.id);
      
      console.log('DEBUG - 记账结果:', result);

      if (result) {
        // 记账成功，自动打卡
        const { checkIn } = useSettingsStore.getState();
        const checkInSuccess = checkIn();
        if (checkInSuccess) {
          
        }
        onClose();
      } else {
        toast.error('记账失败，请重试');
      }
    } catch (error: any) {
      console.error('记账错误详情:', error);
      console.error('错误堆栈:', error?.stack);
      console.error('错误消息:', error?.message);
      
      // 显示具体错误
      if (error?.message?.includes('indexeddb') || error?.message?.includes('database')) {
        toast.error('浏览器存储错误，请刷新页面重试');
      } else if (error?.message?.includes('network')) {
        toast.error('网络错误，请检查网络连接');
      } else {
        toast.error('记账失败: ' + (error?.message || '未知错误'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // categories 已经是按 type 过滤后的结果，直接使用即可
  console.log('DEBUG - currentBook:', currentBook?.id, currentBook?.name);
  console.log('DEBUG - type:', type);
  console.log('DEBUG - categories count:', categories.length);
  console.log('DEBUG - categories:', categories.map(c => ({ id: c.id, name: c.name, type: c.type })));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 w-[360px] max-w-[95vw] overflow-hidden">
        <DialogHeader className="p-3 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">记一笔</DialogTitle>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-3">
          {/* 类型切换按钮 */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setType('EXPENSE')}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                type === 'EXPENSE'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              支出
            </button>
            <button
              onClick={() => setType('INCOME')}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                type === 'INCOME'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              收入
            </button>
          </div>

          {/* 金额显示 */}
          <div className="bg-gray-100 rounded-xl p-4 text-center mb-3">
            <span className="text-gray-400 text-lg mr-1">¥</span>
            <span 
              className={cn(
                'text-3xl font-bold',
                type === 'EXPENSE' ? 'text-red-500' : 'text-green-500'
              )}
            >
              {amount || '0.00'}
            </span>
          </div>

          {/* 分类选择 */}
          <div className="mb-3"
          >
            <p className="text-xs text-gray-500 mb-2">选择分类</p>
            {categories.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                暂无{categories.length === 0 && type === 'EXPENSE' ? '支出' : '收入'}分类
              </div>
            ) : (
            <div className="grid grid-cols-6 gap-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-1 rounded-lg transition-all',
                    selectedCategoryId === category.id
                      ? 'bg-teal-50 ring-1 ring-teal-500'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {category.icon}
                  </div>
                  <span className="text-[10px] text-gray-600 truncate w-full text-center"
                  >
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
            )}
          </div>

          {/* 日期和备注 */}
          <div className="flex gap-2 mb-3">
            <DateSelector value={recordDate} onChange={setRecordDate} />
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className={cn(
                'flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors shrink-0',
                note ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-500'
              )}
            >
              <StickyNote className="w-4 h-4" />
              备注
            </button>
          </div>

          {/* 备注输入 */}
          {showNoteInput && (
            <div className="mb-3"
            >
              <input
                placeholder="添加备注..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-gray-100 border-0 rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
          )}

          {/* 数字键盘 - 固定3列布局 */}
          <div className="grid grid-cols-3 gap-2 mb-3"
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => (
              <button
                key={key}
                onClick={() => key === '⌫' ? handleDelete() : handleNumberPress(key)}
                className={cn(
                  'h-12 rounded-lg text-lg font-medium transition-all active:scale-95',
                  key === '⌫'
                    ? 'bg-red-100 text-red-500'
                    : 'bg-gray-100 hover:bg-gray-200'
                )}
              >
                {key}
              </button>
            ))}
          </div>

          {/* 确认按钮 */}
          <Button
            onClick={handleSubmit}
            disabled={!amount || !selectedCategoryId || isSubmitting}
            className={cn(
              'w-full h-11 text-base font-medium rounded-xl',
              type === 'EXPENSE'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              `确认${type === 'EXPENSE' ? '支出' : '收入'}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
