import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  QuickAddWidget, 
  CheckInWidget, 
  TodaySummaryWidget, 
  BudgetWidget
} from '@/components/Widgets';
import type { WidgetType } from '@/components/Widgets';
import { 
  Plus, 
  Flame, 
  PieChart, 
  Wallet, 
  X,
  Info,
  Smartphone
} from 'lucide-react';

interface WidgetItem {
  id: WidgetType;
  name: string;
  description: string;
  icon: typeof Plus;
  widget: React.ReactNode;
  size: 'small' | 'medium';
}

interface WidgetManagerProps {
  open: boolean;
  onClose: () => void;
  onQuickAdd?: () => void;
}

export function WidgetManager({ open, onClose, onQuickAdd }: WidgetManagerProps) {
  const [installedWidgets, setInstalledWidgets] = useState<WidgetType[]>(['quick_add', 'check_in']);

  const availableWidgets: WidgetItem[] = [
    {
      id: 'quick_add',
      name: '快捷记账',
      description: '一键快速记账',
      icon: Plus,
      widget: <QuickAddWidget onQuickAdd={onQuickAdd} />,
      size: 'small',
    },
    {
      id: 'check_in',
      name: '每日打卡',
      description: '记录记账打卡',
      icon: Flame,
      widget: <CheckInWidget />,
      size: 'small',
    },
    {
      id: 'today_summary',
      name: '今日收支',
      description: '今日收入支出概览',
      icon: PieChart,
      widget: <TodaySummaryWidget />,
      size: 'medium',
    },
    {
      id: 'budget',
      name: '预算进度',
      description: '本月预算使用情况',
      icon: Wallet,
      widget: <BudgetWidget />,
      size: 'medium',
    },
  ];

  const toggleWidget = (widgetId: WidgetType) => {
    if (installedWidgets.includes(widgetId)) {
      setInstalledWidgets(prev => prev.filter(id => id !== widgetId));
      
    } else {
      if (installedWidgets.length >= 4) {
        toast.error('最多只能添加4个小组件');
        return;
      }
      setInstalledWidgets(prev => [...prev, widgetId]);
      
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>桌面小组件</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  添加小组件到手机桌面，快速记账和查看数据。
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  点击添加到桌面后，长按桌面空白处即可找到小组件。
                </p>
              </div>
            </div>
          </div>

          {/* 已添加的预览 */}
          {installedWidgets.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                已添加 ({installedWidgets.length}/4)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {installedWidgets.map(widgetId => {
                  const widget = availableWidgets.find(w => w.id === widgetId);
                  if (!widget) return null;
                  return (
                    <div key={widgetId} className="relative">
                      <Card className="border-2 border-teal-200 dark:border-teal-800">
                        <CardContent className="p-2">
                          <div className={cn(
                            widget.size === 'small' ? 'h-[100px]' : 'h-[100px]',
                            'flex items-center justify-center'
                          )}>
                            <div className="scale-75 origin-center">
                              {widget.widget}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <button
                        onClick={() => toggleWidget(widgetId)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 可选小组件 */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              可选小组件
            </h4>
            <div className="space-y-2">
              {availableWidgets
                .filter(w => !installedWidgets.includes(w.id))
                .map(widget => (
                  <Card key={widget.id} className="cursor-pointer hover:border-teal-200 dark:hover:border-teal-800 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <widget.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{widget.name}</p>
                            <p className="text-xs text-gray-500">{widget.description}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleWidget(widget.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          添加
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* iOS/Android 说明 */}
          <div className="border-t dark:border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              如何添加到桌面
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">iPhone/iPad</p>
                  <p className="text-xs text-gray-500">
                    1. 点击分享按钮 → 添加到主屏幕
                    2. 长按桌面 → 点击左上角"+"
                    3. 选择"记账本"小组件
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Android</p>
                  <p className="text-xs text-gray-500">
                    1. 长按桌面空白处
                    2. 选择"小组件"
                    3. 找到"有鱼记账"并拖动到桌面
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
