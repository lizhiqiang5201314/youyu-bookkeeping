import { useState, useMemo } from 'react';
import { useBookStore } from '@/stores/bookStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatDate, getDateRange } from '@/utils/constants';
import type { Category } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate as formatLocalDate } from '@/services/db';

export function DataExport() {
  const { currentBook, categories } = useBookStore();
  const { getTransactionsByDateRange } = useTransactionStore();
  const [isExporting, setIsExporting] = useState(false);

  // 获取统计数据
  const stats = useMemo(() => {
    if (!currentBook) return null;
    const dateRange = getDateRange('year');
    const transactions = getTransactionsByDateRange(currentBook.id, dateRange);
    
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      count: transactions.length,
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [currentBook, getTransactionsByDateRange]);

  const exportToExcel = async () => {
    if (!currentBook) {
      toast.error('请先选择账本');
      return;
    }

    setIsExporting(true);
    
    try {
      const dateRange = getDateRange('year');
      const transactions = getTransactionsByDateRange(currentBook.id, dateRange);
      
      if (transactions.length === 0) {
        toast.error('没有数据可导出');
        setIsExporting(false);
        return;
      }

      // CSV 表头
      const headers = ['日期', '类型', '分类', '金额', '备注'];
      
      // CSV 数据行
      const rows = transactions.map(t => {
        const category = categories.find((c: Category) => c.id === t.categoryId);
        return [
          formatDate(t.recordDate),
          t.type === 'EXPENSE' ? '支出' : '收入',
          category?.name || '未知分类',
          (t.amount / 100).toFixed(2),
          t.description || ''
        ];
      });

      // 汇总行
      const totalIncome = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      
      rows.push([]);
      rows.push(['', '', '总收入', (totalIncome / 100).toFixed(2), '']);
      rows.push(['', '', '总支出', (totalExpense / 100).toFixed(2), '']);
      rows.push(['', '', '结余', ((totalIncome - totalExpense) / 100).toFixed(2), '']);

      // 生成 CSV 内容
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // 添加 BOM 以支持中文
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // 下载文件
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `记账数据_${currentBook?.name}_${formatLocalDate(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('导出成功');

    } catch (error) {
      console.error('Export error:', error);
      toast.error('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const formatAmount = (amount: number) => {
    return `¥${(amount / 100).toFixed(2)}`;
  };

  if (!currentBook) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500">请先选择账本</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">收入</span>
            </div>
            <p className="text-lg font-bold text-green-700">
              {stats ? formatAmount(stats.income) : '¥0.00'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-600">支出</span>
            </div>
            <p className="text-lg font-bold text-red-700">
              {stats ? formatAmount(stats.expense) : '¥0.00'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600">结余</span>
            </div>
            <p className={cn(
              "text-lg font-bold",
              stats && stats.balance >= 0 ? "text-blue-700" : "text-red-700"
            )}>
              {stats ? formatAmount(stats.balance) : '¥0.00'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 导出信息 */}
      <Card className="border border-gray-100">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Excel 导出</h3>
              <p className="text-xs text-gray-500">
                {stats ? `${stats.count} 条记录 · 本年内数据` : '加载中...'}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>导出范围：本年度数据</span>
            </div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-gray-400" />
              <span>文件格式：CSV (兼容 Excel、WPS)</span>
            </div>
          </div>

          <Button
            onClick={exportToExcel}
            disabled={isExporting || !stats || stats.count === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {stats && stats.count > 0 ? '导出 Excel' : '暂无数据'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">使用说明</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• 导出文件为 CSV 格式，可用 Excel、WPS 等软件打开</li>
          <li>• 包含本年度所有记账记录</li>
          <li>• 文件已添加 UTF-8 BOM，支持中文显示</li>
        </ul>
      </div>
    </div>
  );
}
