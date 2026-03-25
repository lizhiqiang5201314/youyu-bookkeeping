import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SUBSCRIPTION_PLANS } from '@/utils/constants';
import { Crown, Users, Heart, Home, Sparkles, Zap, Loader2 } from 'lucide-react';

interface SubscriptionPlansProps {
  onClose: () => void;
}

// 微信支付配置（需要替换为真实的商户信息）
const WECHAT_PAY_CONFIG = {
  // 商户号
  mchId: '',
  // 应用ID
  appId: '',
  // API密钥（用于签名）
  apiKey: '',
  // 支付回调地址（必须是备案域名）
  notifyUrl: 'https://your-domain.com/api/pay/callback',
};

const isWechatPayConfigured = Boolean(
  WECHAT_PAY_CONFIG.mchId &&
  WECHAT_PAY_CONFIG.appId &&
  WECHAT_PAY_CONFIG.apiKey &&
  WECHAT_PAY_CONFIG.notifyUrl &&
  !WECHAT_PAY_CONFIG.notifyUrl.includes('your-domain.com')
);

export function SubscriptionPlans({ onClose }: SubscriptionPlansProps) {
  const { user } = useAuthStore();
  const { createSubscription, isSubscriptionActive } = useSubscriptionStore();
  
  const [selectedType, setSelectedType] = useState<'COUPLE' | 'FAMILY'>('COUPLE');
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [isProcessing, setIsProcessing] = useState(false);

  const planConfig = SUBSCRIPTION_PLANS[selectedType];
  const priceConfig = selectedPlan === 'MONTHLY' ? planConfig.monthly : planConfig.yearly;
  
  // 检查用户是否已有该类型会员
  const hasActiveSub = user ? isSubscriptionActive(user.id, selectedType) : false;

  // 创建支付订单
  const createPayOrder = async () => {
    if (!user) {
      toast.error('请先登录');
      return null;
    }
    
    try {
      // 1. 调用后端创建订单
      // TODO: 替换为真实的后端API
      const response = await fetch('/api/create-pay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: selectedType,
          plan: selectedPlan,
          amount: priceConfig.price * 100, // 转换为分
          description: `有鱼记账${selectedType === 'COUPLE' ? '情侣' : '家庭'}会员`,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data;
      } else {
        toast.error(data.message || '创建订单失败');
        return null;
      }
    } catch (error) {
      console.error('Create order error:', error);
      toast.error('创建订单失败，请重试');
      return null;
    }
  };

  // 调用微信支付H5
  const callWechatPay = async (payData: any) => {
    try {
      // 微信支付H5需要后端生成支付链接
      // 返回格式: { mweb_url: 'https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb...' }
      
      const response = await fetch('/api/wechat-pay-h5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: payData.orderId,
          amount: payData.amount,
          description: payData.description,
          // 用户支付成功后返回的页面
          redirectUrl: `${window.location.origin}/pay-success?orderId=${payData.orderId}`,
        }),
      });
      
      const data = await response.json();
      
      if (data.mweb_url) {
        // 跳转到微信支付页面
        window.location.href = data.mweb_url;
      } else {
        toast.error('调起支付失败');
      }
    } catch (error) {
      console.error('Wechat pay error:', error);
      toast.error('支付调起失败');
    }
  };

  // 检查订单状态（支付成功后调用）
  const checkOrderStatus = async (orderId: string) => {
    try {
      const response = await fetch(`/api/check-order?orderId=${orderId}`);
      const data = await response.json();
      
      if (data.status === 'PAID') {
        // 支付成功，创建会员
        if (user) {
          await createSubscription(user.id, selectedType, selectedPlan);
          
          onClose();
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Check order error:', error);
      return false;
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    
    if (hasActiveSub) {
      toast.error(`您已开通${selectedType === 'COUPLE' ? '情侣' : '家庭'}会员`);
      return;
    }

    if (!isWechatPayConfigured) {
      toast.error('支付功能尚未配置完成，请先完善微信支付参数和后端接口');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. 创建订单
      const payData = await createPayOrder();
      if (!payData) {
        return;
      }

      // 2. 调起微信支付H5
      await callWechatPay(payData);
    } finally {
      setIsProcessing(false);
    }
    
    // 注意：H5支付会跳转页面，以下代码可能不会执行
    // 支付结果通过回调或返回页面处理
  };

  // 如果在支付返回页面，检查订单状态
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdFromUrl = urlParams.get('orderId');
    if (orderIdFromUrl) {
      checkOrderStatus(orderIdFromUrl);
    }
  }, []);

  const features = [
    { icon: selectedType === 'COUPLE' ? Heart : Users, text: `支持${planConfig.maxMembers}人共享记账` },
    { icon: Home, text: `创建${selectedType === 'COUPLE' ? '情侣' : '家庭'}账本` },
    { icon: Crown, text: '专属会员标识' },
    { icon: Sparkles, text: '高级报表分析' },
    { icon: Zap, text: '数据云端同步' },
  ];

  return (
    <div className="space-y-6">
      {/* 类型选择 */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setSelectedType('COUPLE')}
          className={cn(
            'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
            selectedType === 'COUPLE'
              ? 'bg-white text-pink-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Heart className="w-4 h-4 inline mr-1" />
          情侣会员
        </button>
        <button
          onClick={() => setSelectedType('FAMILY')}
          className={cn(
            'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
            selectedType === 'FAMILY'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Users className="w-4 h-4 inline mr-1" />
          家庭会员
        </button>
      </div>

      {/* 时长选择 */}
      <Tabs value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as 'MONTHLY' | 'YEARLY')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="MONTHLY">月付</TabsTrigger>
          <TabsTrigger value="YEARLY">年付</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 价格卡片 */}
      <Card className={cn(
        'border-2',
        selectedType === 'COUPLE' ? 'border-pink-200' : 'border-purple-200'
      )}>
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-gray-900">
                ¥{priceConfig.price}
              </span>
              <span className="text-gray-500">
                /{selectedPlan === 'MONTHLY' ? '月' : '年'}
              </span>
            </div>
            {selectedPlan === 'YEARLY' && (
              <Badge variant="secondary" className="mt-2">
                省¥{Math.round(planConfig.monthly.price * 12 - planConfig.yearly.price)}
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-sm text-gray-600">
                <feature.icon className={cn(
                  'w-5 h-5',
                  selectedType === 'COUPLE' ? 'text-pink-500' : 'text-purple-500'
                )} />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 支付按钮 */}
      <Button
        onClick={handleSubscribe}
        disabled={isProcessing || hasActiveSub}
        className={cn(
          'w-full h-12 text-lg font-medium',
          selectedType === 'COUPLE'
            ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
            : 'bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600'
        )}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            正在调起支付...
          </>
        ) : hasActiveSub ? (
          '您已是会员'
        ) : (
          <>立即支付 ¥{priceConfig.price}</>
        )}
      </Button>

      {/* 配置提示 */}
      {!isWechatPayConfigured && (
        <div className="p-3 bg-yellow-50 rounded-lg text-xs text-yellow-700">
          <p className="font-medium mb-1">⚠️ 支付配置待完善</p>
          <p>请在 SubscriptionPlans.tsx 中填入微信支付商户信息：</p>
          <ul className="mt-1 list-disc list-inside">
            <li>商户号 (mchId)</li>
            <li>应用ID (appId)</li>
            <li>API密钥 (apiKey)</li>
            <li>回调地址 (notifyUrl)</li>
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        支付即表示同意《会员服务协议》
      </p>
    </div>
  );
}
