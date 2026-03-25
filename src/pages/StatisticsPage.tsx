import { useState, useMemo } from 'react';
import { useBookStore } from '@/stores/bookStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatAmount, getDateRange, TIME_RANGES } from '@/utils/constants';
import { Calendar, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';
import { parseDate } from '@/services/db';

export function StatisticsPage() {
  const { currentBook, categories } = useBookStore();
  const { getSummary, getCategoryStats, getTrendData, getTransactionsByDateRange } = useTransactionStore();
  
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'trend' | 'category'>('trend');
  
  const dateRange = useMemo(() => getDateRange(timeRange, currentDate), [timeRange, currentDate]);
  
  const summary = useMemo(() => {
    if (!currentBook) return { income: 0, expense: 0, balance: 0 };
    return getSummary(currentBook.id, dateRange);
  }, [currentBook, dateRange, getSummary]);
  
  const expenseStats = useMemo(() => {
    if (!currentBook) return [];
    return getCategoryStats(currentBook.id, dateRange, 'EXPENSE', categories);
  }, [currentBook, dateRange, getCategoryStats, categories]);
  
  const incomeStats = useMemo(() => {
    if (!currentBook) return [];
    return getCategoryStats(currentBook.id, dateRange, 'INCOME', categories);
  }, [currentBook, dateRange, getCategoryStats, categories]);
  
  const trendData = useMemo(() => {
    if (!currentBook) return { labels: [], income: [], expense: [] };
    return getTrendData(currentBook.id, timeRange, currentDate);
  }, [currentBook, timeRange, currentDate, getTrendData]);

  // 获取交易明细
  const transactions = useMemo(() => {
    if (!currentBook) return [];
    return getTransactionsByDateRange(currentBook.id, dateRange);
  }, [currentBook, dateRange, getTransactionsByDateRange]);

  // 按日期分组交易
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    
    // 按记账日期倒序，再按创建时间倒序，和首页保持一致
    const sortedTransactions = [...transactions].sort((a, b) => 
      parseDate(b.recordDate).getTime() - parseDate(a.recordDate).getTime() ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    sortedTransactions.forEach(tx => {
      const date = tx.recordDate.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(tx);
    });
    
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
  }, [transactions]);

  const handlePrevPeriod = () => {
    const newDate = new Date(currentDate);
    switch (timeRange) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(currentDate);
    switch (timeRange) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const getPeriodLabel = () => {
    switch (timeRange) {
      case 'day':
        return currentDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${weekStart.getMonth() + 1}/${weekStart.getDate()}-${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
      case 'month':
        return currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
      case 'year':
        return `${currentDate.getFullYear()}年`;
      default:
        return '';
    }
  };

  const chartData = trendData.labels.map((label, index) => ({
    name: label,
    income: trendData.income[index] / 100,
    expense: trendData.expense[index] / 100,
  }));

  const pieData = expenseStats
    .filter(stat => stat.amount > 0)
    .map(stat => ({ 
      name: stat.name, 
      value: stat.amount / 100, 
      color: stat.color 
    }));

  if (!currentBook) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">请先选择或创建一个账本</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部 */}
      <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 pt-12 pb-6">
        <div className="px-4">
          <h1 className="text-xl font-bold text-white mb-4">收支统计</h1>
          
          {/* 时间选择器 */}
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={handlePrevPeriod}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <Calendar className="w-4 h-4 text-white" />
              <span className="text-white font-medium">{getPeriodLabel()}</span>
            </div>
            <button 
              onClick={handleNextPeriod}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 时间范围切换 */}
          <div className="flex gap-2">
            {TIME_RANGES.map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value as any)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                  timeRange === range.value
                    ? 'bg-white text-teal-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 收支概览 */}
      <div className="px-4 -mt-3">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">收入</p>
                <p className="text-green-600 font-semibold">{formatAmount(summary.income)}</p>
              </div>
              <div className="text-center border-x border-gray-100">
                <p className="text-gray-500 text-xs mb-1">支出</p>
                <p className="text-red-600 font-semibold">{formatAmount(summary.expense)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">结余</p>
                <p className={cn(
                  'font-semibold',
                  summary.balance >= 0 ? 'text-teal-600' : 'text-red-600'
                )}>
                  {formatAmount(summary.balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表切换 */}
      <div className="px-4 mt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trend">收支趋势</TabsTrigger>
            <TabsTrigger value="category">分类占比</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 图表区域 */}
      <div className="px-4 mt-4">
        {activeTab === 'trend' ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">收支趋势</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#e0e0e0' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#e0e0e0' }}
                      tickFormatter={(value) => `¥${value}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      name="收入" 
                      stroke="#27AE60" 
                      strokeWidth={2}
                      dot={{ fill: '#27AE60', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expense" 
                      name="支出" 
                      stroke="#E74C3C" 
                      strokeWidth={2}
                      dot={{ fill: '#E74C3C', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                支出分类占比
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, _name: string, props: any) => {
                        const percent = props && props.payload ? ` (${(props.percent * 100).toFixed(1)}%)` : '';
                        return [`¥${value.toFixed(2)}${percent}`, '金额'];
                      }}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 分类详情 */}
      <div className="px-4 mt-4 pb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {activeTab === 'trend' ? '支出' : '收入'}分类明细
        </h3>
        <div className="space-y-2">
          {(activeTab === 'trend' ? expenseStats : incomeStats).map((stat) => (
            <Card key={stat.categoryId} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: stat.color + '20' }}
                    >
                      {stat.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{stat.name}</p>
                      <p className="text-xs text-gray-500">{stat.count}笔</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatAmount(stat.amount)}</p>
                    <p className="text-xs text-gray-500">{stat.percentage}%</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${stat.percentage}%`,
                      backgroundColor: stat.color 
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 记账明细 */}
      <div className="px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">记账明细</h3>
          <span className="text-xs text-gray-500">{transactions.length}笔</span>
        </div>
        
        {groupedTransactions.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无交易记录</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupedTransactions.map(({ date, transactions: dayTransactions, dayTotal }) => (
              <div key={date} className="space-y-2">
                {/* 日期标题 */}
                <div className="flex items-center justify-between px-2 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {new Date(date).getDate()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(date).getDay()]}
                    </span>
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
                <div className="space-y-2">
                  {dayTransactions.map((transaction) => {
                    const category = categories.find(c => c.id === transaction.categoryId);
                    return (
                      <Card key={transaction.id} className="border-0 shadow-sm">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-base"
                                style={{ backgroundColor: (category?.color || '#999') + '20' }}
                              >
                                {category?.icon || '💰'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{category?.name || '未知分类'}</p>
                                {transaction.description && (
                                  <p className="text-xs text-gray-500">{transaction.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                'font-semibold',
                                transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                              )}>
                                {transaction.type === 'INCOME' ? '+' : '-'}{formatAmount(transaction.amount)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
