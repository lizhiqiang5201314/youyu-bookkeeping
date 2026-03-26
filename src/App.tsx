import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useBookStore } from '@/stores/bookStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { LoginPage } from '@/pages/LoginPage';
import { MainApp } from '@/pages/MainApp';
import { PaySuccessPage } from '@/pages/PaySuccessPage';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

function App() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { fetchBooks } = useBookStore();
  const [isReady, setIsReady] = useState(false);
  const initializedUserIdRef = useRef<string | null>(null);

  // 检查是否是支付返回页面
  const isPaySuccessPage = window.location.pathname === '/pay-success';

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      initializedUserIdRef.current = null;
      useBookStore.getState().resetState();
      useTransactionStore.getState().resetState();
      return;
    }

    if (initializedUserIdRef.current === user.id) {
      return;
    }

    initializedUserIdRef.current = user.id;
    let cancelled = false;

    // 登录后拉取账本状态到 store
    const loadData = async () => {
      await fetchBooks(user.id);

      if (cancelled) {
        return;
      }

      const { books } = useBookStore.getState();
      // 没有账本时创建默认账本
      if (books.length === 0) {
        await useBookStore.getState().createBook('个人账本', 'PERSONAL', user.id);
      }
    };
    void loadData();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, fetchBooks]);

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

  // 支付成功页面（不需要登录）
  if (isPaySuccessPage) {
    return (
      <>
        <PaySuccessPage />
        <Toaster position="top-center" />
      </>
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
