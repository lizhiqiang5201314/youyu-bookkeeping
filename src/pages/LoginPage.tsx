import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

// 用户协议内容
const UserAgreementContent = () => (
  <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
    <div className="text-center pb-4 border-b border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-1">有鱼记账用户协议</h2>
      <p className="text-gray-400 text-xs">更新日期：2024年3月</p>
    </div>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">一、协议范围</h3>
      <p>欢迎使用有鱼记账！本协议是您（用户）与有鱼记账之间关于使用本软件服务的协议。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">二、账号注册与使用</h3>
      <p className="mb-1">1. 您承诺以真实身份信息注册，并保证信息真实、准确、完整。</p>
      <p className="mb-1">2. 您应妥善保管账号及密码，对账号下的所有行为承担法律责任。</p>
      <p>3. 如发现账号异常，请立即联系我们。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">三、服务内容</h3>
      <p className="mb-1">我们为您提供：</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>个人记账功能</li>
        <li>账单统计分析</li>
        <li>多账本管理</li>
        <li>数据云端同步</li>
        <li>会员增值服务</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">四、用户行为规范</h3>
      <p className="mb-1">您在使用本服务时须遵守法律法规，不得：</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>发布、传播违法信息</li>
        <li>侵犯他人知识产权</li>
        <li>干扰、破坏服务正常运行</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">五、联系我们</h3>
      <p>如有问题，请联系：support@youyujizhang.com</p>
    </section>
  </div>
);

// 隐私政策内容
const PrivacyPolicyContent = () => (
  <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
    <div className="text-center pb-4 border-b border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-1">有鱼记账隐私政策</h2>
      <p className="text-gray-400 text-xs">更新日期：2024年3月</p>
    </div>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">引言</h3>
      <p>有鱼记账非常重视您的隐私保护。本政策说明我们如何收集、使用和保护您的信息。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">一、我们收集的信息</h3>
      <ul className="list-disc pl-5 space-y-0.5">
        <li><strong>账号信息：</strong>手机号、昵称、头像</li>
        <li><strong>记账数据：</strong>收支记录、分类信息</li>
        <li><strong>设备信息：</strong>设备型号、系统版本</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">二、信息使用</h3>
      <p className="mb-1">我们使用您的信息用于：</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>提供记账服务</li>
        <li>数据同步和备份</li>
        <li>服务优化</li>
        <li>账户安全保障</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">三、信息安全</h3>
      <p className="mb-1">我们采取多种措施保护您的信息：</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>数据加密传输（SSL/TLS）</li>
        <li>敏感信息加密存储</li>
        <li>访问控制和身份验证</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">四、联系我们</h3>
      <p>📧 邮箱：support@youyujizhang.com</p>
    </section>
  </div>
);

export function LoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const { setUser } = useAuthStore();

  // 验证手机号
  const isValidPhone = (phone: string): boolean => {
    return /^1[3-9]\d{9}$/.test(phone);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!isValidPhone(phone)) {
      toast.error('请输入正确的11位手机号');
      return;
    }

    if (isSending || countdown > 0) return;

    setIsSending(true);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!supabaseUrl) {
        throw new Error('系统配置错误');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/sms-auth`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send', phone: phone.trim() }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || '发送失败');
      }

      if (data?.code) {
        toast.success(`开发模式：验证码 ${data.code}`, { duration: 6000 });
      } else {
        toast.success('验证码已发送');
      }

      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || '发送失败');
    } finally {
      setIsSending(false);
    }
  };

  // 登录
  const handleLogin = async () => {
    if (!isValidPhone(phone)) {
      toast.error('请输入正确的手机号');
      return;
    }

    if (code.length !== 6) {
      toast.error('请输入6位验证码');
      return;
    }

    if (!agreed) {
      toast.error('请阅读并同意用户协议和隐私政策');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/sms-auth`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify',
            phone: phone.trim(),
            code: code.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || '验证失败');
      }

      setUser({
        id: data.userId,
        phone: data.phone,
        nickname: `用户${data.phone.slice(-4)}`,
        createdAt: new Date().toISOString(),
      });

      await useAuthStore.getState().preloadUserData(data.userId);
      
      toast.success(data.isNewUser ? '🎉 欢迎加入有鱼记账！' : '✨ 登录成功！');
    } catch (error: any) {
      toast.error(error.message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 手机号输入
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(value);
  };

  // 验证码输入
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  // 协议弹窗组件
  const AgreementModal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 rounded-t-2xl">
          <button onClick={onClose} className="p-1">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            className="w-full py-3 bg-teal-400 text-white rounded-full font-medium"
          >
            我已阅读并同意
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-white flex flex-col">
        {/* 顶部 Logo */}
        <div className="px-6 pt-20 pb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
              {/* 鱼形 Logo */}
              <svg viewBox="0 0 48 48" className="w-9 h-9 text-white" fill="currentColor">
                <ellipse cx="28" cy="24" rx="14" ry="10" />
                <polygon points="14,24 6,16 6,32" />
                <circle cx="34" cy="22" r="2" fill="#1e3a5f" />
                <path d="M38 26 Q42 28 40 32" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">有鱼记账</h1>
              <p className="text-sm text-teal-500">记账就要有余</p>
            </div>
          </div>
        </div>

        {/* 登录表单 */}
        <div className="flex-1 px-6">
          <p className="text-gray-500 text-sm mb-6">使用手机号验证码登录</p>

          <div className="space-y-4">
            {/* 手机号输入 */}
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="请输入手机号"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={11}
                disabled={isLoading}
                className="w-full bg-transparent text-base outline-none placeholder:text-gray-400"
              />
            </div>

            {/* 验证码输入 */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                placeholder="请输入验证码"
                value={code}
                onChange={handleCodeChange}
                maxLength={6}
                disabled={isLoading}
                className="flex-1 bg-transparent text-base outline-none placeholder:text-gray-400"
              />
              <button
                onClick={handleSendCode}
                disabled={countdown > 0 || isSending || !isValidPhone(phone) || isLoading}
                className={`text-sm font-medium whitespace-nowrap transition-colors ${
                  countdown > 0 || isSending || !isValidPhone(phone)
                    ? 'text-gray-400'
                    : 'text-teal-500'
                }`}
              >
                {isSending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
          </div>

          {/* 用户协议 */}
          <div className="flex items-start gap-3 mt-6">
            <Checkbox
              id="agreement"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              className="mt-0.5 border-gray-300 data-[state=checked]:bg-teal-400 data-[state=checked]:border-teal-400"
            />
            <label htmlFor="agreement" className="text-sm text-gray-500 leading-relaxed">
              已阅读并同意
              <button 
                onClick={() => setShowAgreement(true)}
                className="text-teal-500 underline"
              >
                《用户协议》
              </button>
              和
              <button 
                onClick={() => setShowPrivacy(true)}
                className="text-teal-500 underline"
              >
                《隐私政策》
              </button>
            </label>
          </div>

          {/* 登录按钮 */}
          <button
            onClick={handleLogin}
            disabled={isLoading || !isValidPhone(phone) || code.length !== 6 || !agreed}
            className={`w-full mt-8 py-4 rounded-full text-lg font-medium transition-all ${
              isLoading || !isValidPhone(phone) || code.length !== 6 || !agreed
                ? 'bg-gray-200 text-gray-400'
                : 'bg-gradient-to-r from-teal-400 to-cyan-500 text-white active:scale-98 shadow-lg'
            }`}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </div>

        {/* 产品卖点 */}
        <div className="px-6 pb-8 mt-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px w-12 bg-gray-200"></div>
            <span className="text-xs text-gray-400">产品特色</span>
            <div className="h-px w-12 bg-gray-200"></div>
          </div>
          <div className="flex justify-around">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <span className="text-xs text-gray-600">简单记账</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <span className="text-xs text-gray-600">云端同步</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-600">多人账本</span>
            </div>
          </div>
        </div>
      </div>

      {/* 用户协议弹窗 */}
      {showAgreement && (
        <AgreementModal title="用户协议" onClose={() => setShowAgreement(false)}>
          <UserAgreementContent />
        </AgreementModal>
      )}

      {/* 隐私政策弹窗 */}
      {showPrivacy && (
        <AgreementModal title="隐私政策" onClose={() => setShowPrivacy(false)}>
          <PrivacyPolicyContent />
        </AgreementModal>
      )}
    </>
  );
}
