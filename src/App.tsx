import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useBookStore } from '@/stores/bookStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { LoginPage } from '@/pages/LoginPage';
import { MainApp } from '@/pages/MainApp';
import { PaySuccessPage } from '@/pages/PaySuccessPage';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const { fetchBooks } = useBookStore();
  const initializedUserIdRef = useRef<string | null>(null);

  // 检查是否是支付返回页面
  const isPaySuccessPage = window.location.pathname === '/pay-success';

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
