import { Suspense, lazy, useState } from 'react';
const HomePage = lazy(() => import('./HomePage').then(module => ({ default: module.HomePage })));
const StatisticsPage = lazy(() => import('./StatisticsPage').then(module => ({ default: module.StatisticsPage })));
const AssetsPage = lazy(() => import('./AssetsPage').then(module => ({ default: module.AssetsPage })));
const ProfilePage = lazy(() => import('./ProfilePage').then(module => ({ default: module.ProfilePage })));
const BudgetPage = lazy(() => import('./BudgetPage').then(module => ({ default: module.BudgetPage })));
const QuickAddModal = lazy(() => import('@/components/QuickAddModal').then(module => ({ default: module.QuickAddModal })));
import { Button } from '@/components/ui/button';
import { useBookStore } from '@/stores/bookStore';
import { 
  Home, 
  PieChart, 
  Receipt, 
  User, 
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function MainApp() {
  const [currentPage, setCurrentPage] = useState<'home' | 'statistics' | 'budget' | 'assets' | 'profile'>('home');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddKey, setQuickAddKey] = useState(0);
  const { currentBook } = useBookStore();

  const handleOpenQuickAdd = () => {
    setQuickAddKey(prev => prev + 1); // 强制重新渲染
    setIsQuickAddOpen(true);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={(page) => setCurrentPage(page as any)} />;
      case 'statistics':
        return <StatisticsPage />;
      case 'budget':
        return <BudgetPage />;
      case 'assets':
        return <AssetsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage onNavigate={(page) => setCurrentPage(page as any)} />;
    }
  };

  const navItems = [
    { key: 'home', label: '首页', icon: Home },
    { key: 'statistics', label: '统计', icon: PieChart },
    { key: 'add', label: '记账', icon: Plus, isSpecial: true },
    { key: 'budget', label: '预算', icon: Receipt },
    { key: 'profile', label: '我的', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 主内容区 */}
      <main className="flex-1 overflow-auto pb-20">
        <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-gray-400">加载中...</div>}>
          {renderPage()}
        </Suspense>
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 safe-area-bottom z-50">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            if (item.isSpecial) {
              return (
                <Button
                  key={item.key}
                  onClick={handleOpenQuickAdd}
                  className="w-14 h-14 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-teal-500/30 -mt-6"
                >
                  <Plus className="w-6 h-6" />
                </Button>
              );
            }

            const isActive = currentPage === item.key;
            
            return (
              <button
                key={item.key}
                onClick={() => setCurrentPage(item.key as any)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all',
                  isActive 
                    ? 'text-teal-500 bg-teal-50' 
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 快捷记账弹窗 */}
      <Suspense fallback={null}>
        <QuickAddModal
          key={`${currentBook?.id || 'no-book'}-${quickAddKey}`}
          open={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
        />
      </Suspense>
    </div>
  );
}
