import { useState, useMemo } from 'react';
import { parseDate } from '@/services/db';
import { cn } from '@/lib/utils';

// 日期格式化工具
export const formatDateDisplay = (dateStr: string) => {
  const date = parseDate(dateStr);
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

// 滚轮式日期选择器组件
interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  onCancel: () => void;
}

export function TransactionDatePicker({ value, onChange, onCancel }: DatePickerProps) {
  const date = parseDate(value);
  const [selectedYear, setSelectedYear] = useState(date.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(date.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(date.getDate());
  
  // 生成年份列表（前后10年）
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => 
    Array.from({ length: 21 }, (_, i) => currentYear - 10 + i),
    [currentYear]
  );
  
  // 生成月份列表
  const months = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => i + 1),
    []
  );
  
  // 生成日期列表（根据年月动态）
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = useMemo(() => 
    Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );
  
  const handleConfirm = () => {
    // 手动格式化日期，避免时区问题
    const year = selectedYear;
    const month = String(selectedMonth).padStart(2, '0');
    const day = String(selectedDay).padStart(2, '0');
    
    const formattedDate = `${year}-${month}-${day}`;
    onChange(formattedDate);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-4 animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <button onClick={onCancel} className="text-gray-500 px-2">
            取消
          </button>
          <span className="font-medium">选择日期</span>
          <button onClick={handleConfirm} className="text-teal-500 font-medium px-2">
            确定
          </button>
        </div>
        
        <div className="flex gap-2 h-48">
          {/* 年份 */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {years.map(year => (
              <div
                key={year}
                onClick={() => setSelectedYear(year)}
                className={cn(
                  "py-3 text-center cursor-pointer transition-colors",
                  selectedYear === year 
                    ? "text-teal-500 font-bold text-lg" 
                    : "text-gray-500"
                )}
              >
                {year}年
              </div>
            ))}
          </div>
          
          {/* 月份 */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {months.map(month => (
              <div
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={cn(
                  "py-3 text-center cursor-pointer transition-colors",
                  selectedMonth === month 
                    ? "text-teal-500 font-bold text-lg" 
                    : "text-gray-500"
                )}
              >
                {month}月
              </div>
            ))}
          </div>
          
          {/* 日期 */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {days.map(day => (
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "py-3 text-center cursor-pointer transition-colors",
                  selectedDay === day 
                    ? "text-teal-500 font-bold text-lg" 
                    : "text-gray-500"
                )}
              >
                {day}日
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
