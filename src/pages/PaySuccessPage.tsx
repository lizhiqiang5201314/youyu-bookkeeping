// 支付成功页面
// 路径: src/pages/PaySuccessPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const CHECK_ORDER_URL = `${SUPABASE_URL}/functions/v1/check-order`;

export function PaySuccessPage() {
  const { user } = useAuthStore();
  const { fetchSubscriptions } = useSubscriptionStore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在确认支付结果...');

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (!orderId) {
      setStatus('error');
      setMessage('支付功能暂未启用或缺少订单信息');
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;
    let disposed = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const syncSuccessState = async () => {
      if (disposed) return;
      setStatus('success');
      setMessage('支付成功！会员已开通');

      if (user) {
        await fetchSubscriptions(user.id);
      }

      toast.success('支付成功！');
    };

    const check = async (): Promise<boolean> => {
      const response = await fetch(`${CHECK_ORDER_URL}?orderId=${encodeURIComponent(orderId)}`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });

      const data = await response.json().catch(() => null);
      return Boolean(data?.success && data?.order?.status === 'PAID');
    };

    const startPolling = async () => {
      try {
        if (await check()) {
          await syncSuccessState();
          return;
        }

        intervalId = setInterval(async () => {
          attempts++;

          try {
            if (await check()) {
              if (intervalId) clearInterval(intervalId);
              await syncSuccessState();
              return;
            }
          } catch (error) {
            console.error('Check order error:', error);
          }

          if (attempts >= maxAttempts) {
            if (intervalId) clearInterval(intervalId);
            if (disposed) return;
            setStatus('error');
            setMessage('支付状态确认超时，请稍后刷新页面或联系客服');
          }
        }, 2000);
      } catch (error) {
        console.error('Check order error:', error);
        if (disposed) return;
        setStatus('error');
        setMessage('查询订单状态失败，请稍后重试');
      }
    };

    void startPolling();

    return () => {
      disposed = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [orderId, user?.id, fetchSubscriptions]);

  const handleBackToProfile = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="w-20 h-20 mx-auto mb-6">
                <Loader2 className="w-full h-full text-teal-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{message}</h2>
              <p className="text-gray-500">请稍候，正在同步支付结果...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-20 h-20 mx-auto mb-6">
                <CheckCircle className="w-full h-full text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{message}</h2>
              <p className="text-gray-500 mb-6">您现在可以使用会员专属功能了！</p>
              <Button 
                onClick={handleBackToProfile}
                className="w-full bg-teal-500 hover:bg-teal-600"
              >
                返回个人中心
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-20 h-20 mx-auto mb-6">
                <XCircle className="w-full h-full text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">支付确认失败</h2>
              <p className="text-gray-500 mb-6">{message}</p>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  重新查询
                </Button>
                <Button 
                  onClick={handleBackToProfile}
                  className="flex-1 bg-teal-500 hover:bg-teal-600"
                >
                  返回
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
