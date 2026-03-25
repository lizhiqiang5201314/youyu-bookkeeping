import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useBookStore } from '@/stores/bookStore';
import { LoginPage } from '@/pages/LoginPage';
import { MainApp } from '@/pages/MainApp';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

function App() {
  const { isAuthenticated, isLoading, user, isDataPreloaded } = useAuthStore();
  const { fetchBooks } = useBookStore();
  const [isReady, setIsReady] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    // 登录后加载云端数据（只在 isDataPreloaded 为 false 时执行）
    const loadData = async () => {
      if (isAuthenticated && user && !hasInitialized.current && !isDataPreloaded) {
        hasInitialized.current = true;
        await fetchBooks(user.id);

        const { books } = useBookStore.getState();
        // 没有账本时创建默认账本
        if (books.length === 0) {
          await useBookStore.getState().createBook('个人账本', 'PERSONAL', user.id);
        }
      }
    };
    loadData();
  }, [isAuthenticated, user, isDataPreloaded]); // 添加 isDataPreloaded 依赖

  if (!isReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-cyan-600">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? <MainApp /> : <LoginPage />}
      <Toaster position="top-center" />
    </>
  );
}

export default App;
