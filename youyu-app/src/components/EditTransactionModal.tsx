import { useState, useEffect, useMemo } from 'react';
import { useBookStore } from '@/stores/bookStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Transaction, TransactionType } from '@/types';
import { Calendar, Loader2, ChevronLeft } from 'lucide-react';

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
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
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
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button onClick={onCancel} className="text-gray-500 text-base">取消</button>
          <span className="text-base font-medium">选择日期</span>
          <button onClick={handleConfirm} className="text-teal-500 text-base font-medium">确定</button>
        </div>
        
        <div className="flex h-52 relative">
          <div className="flex-1 overflow-y-auto" style={{ scrollSnapType: 'y mandatory' }}>
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
          
          <div className="flex-1 overflow-y-auto" style={{ scrollSnapType: 'y mandatory' }}>
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
          
          <div className="flex-1 overflow-y-auto" style={{ scrollSnapType: 'y mandatory' }}>
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

interface EditTransactionModalProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

export function EditTransactionModal({ transaction, open, onClose }: EditTransactionModalProps) {
  const { currentBook, getCategoriesByType } = useBookStore();
  const { updateTransaction } = useTransactionStore();
  
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const categories = getCategoriesByType(type);

  // 初始化表单数据
  useEffect(() => {
    if (transaction && open) {
      setType(transaction.type);
      const amt = (transaction.amount / 100).toFixed(2);
      setAmount(amt);
      setOriginalAmount(amt);
      setSelectedCategoryId(transaction.categoryId);
      setNote(transaction.description || '');
      setRecordDate(new Date(transaction.recordDate).toISOString().split('T')[0]);
    }
  }, [transaction, open]);

  // 类型切换时更新默认分类
  useEffect(() => {
    const cats = getCategoriesByType(type);
    const currentCat = cats.find(c => c.id === selectedCategoryId);
    if (!currentCat && cats.length > 0) {
      setSelectedCategoryId(cats[0].id);
    }
  }, [type]);

  // 数字输入处理
  const handleNumberPress = (num: string) => {
    setAmount(prev => {
      // 如果当前值是原始值，直接替换（第一次输入）
      if (prev === originalAmount) {
        if (num === '.') return '0.';
        return num;
      }
      
      // 后续输入追加逻辑
      if (num === '.') {
        if (prev.includes('.')) return prev;
        return prev + num;
      }
      
      // 检查小数位限制
      if (prev.includes('.') && prev.split('.')[1]?.length >= 2) {
        return prev;
      }
      
      // 长度限制
      if (prev.length >= 10) {
        return prev;
      }
      
      // 如果当前是"0"，替换；否则追加
      if (prev === '0') {
        return num;
      }
      
      return prev + num;
    });
  };

  const handleDelete = () => {
    setAmount(prev => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleUpdate = async () => {
    if (!transaction || !currentBook) {
      toast.error('数据异常');
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

    setIsSubmitting(true);
    
    try {
      const numAmount = Math.round(parseFloat(amount) * 100);
      
      await updateTransaction(transaction.id, {
        categoryId: selectedCategoryId,
        amount: numAmount,
        type,
        description: note || undefined,
        recordDate: new Date(recordDate).toISOString(),
      });

      
      onClose();
    } catch (error) {
      console.error('修改错误:', error);
      toast.error('修改失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button 
            onClick={onClose}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">返回</span>
          </button>
          <span className="font-medium">编辑账单</span>
          <div className="w-8" /> {/* 占位保持居中 */}
        </div>

        <div className="p-4">
          {/* 金额输入区 */}
          <div className="text-center py-6">
            <div className="flex items-center justify-center gap-1 mb-2">
              <span className="text-2xl text-gray-400">¥</span>
              <span className={cn(
                'text-5xl font-bold',
                type === 'EXPENSE' ? 'text-red-500' : 'text-green-500'
              )}>
                {amount || '0.00'}
              </span>
            </div>
            
            {/* 收入/支出切换 */}
            <div className="inline-flex bg-gray-100 rounded-full p-1 mt-2">
              <button
                onClick={() => setType('EXPENSE')}
                className={cn(
                  'px-6 py-1.5 rounded-full text-sm font-medium transition-all',
                  type === 'EXPENSE'
                    ? 'bg-white text-red-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                支出
              </button>
              <button
                onClick={() => setType('INCOME')}
                className={cn(
                  'px-6 py-1.5 rounded-full text-sm font-medium transition-all',
                  type === 'INCOME'
                    ? 'bg-white text-green-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                收入
              </button>
            </div>
          </div>

          {/* 分类选择 */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">选择分类</p>
            <div className="grid grid-cols-5 gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl transition-all',
                    selectedCategoryId === category.id
                      ? 'bg-teal-50 ring-2 ring-teal-500'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {category.icon}
                  </div>
                  <span className="text-[10px] text-gray-600 truncate w-full text-center leading-tight">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 日期和备注 */}
          <div className="space-y-3 mb-4">
            <DateSelector value={recordDate} onChange={setRecordDate} />
            <Input
              placeholder="添加备注..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-gray-50 border-0 rounded-xl h-11"
            />
          </div>

          {/* 数字键盘 */}
          <div className="grid grid-cols-4 gap-2">
            {/* 第一行 */}
            {['1', '2', '3'].map((key) => (
              <button
                key={key}
                onClick={() => handleNumberPress(key)}
                className="h-12 rounded-xl text-lg font-medium bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
              >
                {key}
              </button>
            ))}
            <button
              onClick={handleDelete}
              className="h-12 rounded-xl text-lg font-medium bg-red-50 text-red-500 transition-all active:scale-95"
            >
              ⌫
            </button>
            
            {/* 第二行 */}
            {['4', '5', '6'].map((key) => (
              <button
                key={key}
                onClick={() => handleNumberPress(key)}
                className="h-12 rounded-xl text-lg font-medium bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => handleNumberPress('.')}
              className="h-12 rounded-xl text-lg font-medium bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
            >
              .
            </button>
            
            {/* 第三行 */}
            {['7', '8', '9'].map((key) => (
              <button
                key={key}
                onClick={() => handleNumberPress(key)}
                className="h-12 rounded-xl text-lg font-medium bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => handleNumberPress('0')}
              className="h-12 rounded-xl text-lg font-medium bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
            >
              0
            </button>
            
            {/* 第四行 - 保存按钮 */}
            <button
              onClick={handleUpdate}
              disabled={!amount || !selectedCategoryId || isSubmitting}
              className={cn(
                'h-12 rounded-xl text-base font-medium transition-all col-span-4',
                type === 'EXPENSE'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white',
                (!amount || !selectedCategoryId) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                '保存修改'
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
