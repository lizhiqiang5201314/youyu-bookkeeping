import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

// 用户协议内容
const UserAgreementContent = () => (
  <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
    <div className="text-center pb-4 border-b border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-1">有鱼记账用户协议</h2>
      <p className="text-gray-400 text-xs">版本日期：2024年3月</p>
    </div>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">一、协议说明</h3>
      <p className="mb-1">欢迎使用有鱼记账！请您在使用本应用前仔细阅读本协议。使用本应用即表示您同意接受本协议的所有条款。</p>
      <p>本协议是您（用户）与有鱼记账之间关于使用本软件服务的法律协议。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">二、服务说明</h3>
      <p className="mb-1">有鱼记账是一款个人记账管理工具，提供以下服务：</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>日常收支记录与统计分析</li>
        <li>多账本管理（个人、情侣、家庭）</li>
        <li>数据云同步服务（可选）</li>
        <li>账单分析与可视化报表</li>
        <li>预算管理与提醒</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">三、账号注册与使用</h3>
      <p className="mb-1">1. 您需要提供真实有效的手机号码进行注册，一个手机号只能注册一个账户。</p>
      <p className="mb-1">2. 您有责任保管好账户信息，对账户下的一切行为负责。</p>
      <p className="mb-1">3. 如发现账号异常，请立即联系客服处理。</p>
      <p>4. 长期未使用的账号，我们保留暂停服务的权利。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">四、会员服务</h3>
      <p className="mb-1">我们提供不同等级的会员服务：</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li><strong>免费版：</strong>个人账本1个，基础记账功能</li>
        <li><strong>情侣会员：</strong>个人账本 + 情侣共享账本</li>
        <li><strong>家庭会员：</strong>个人账本 + 情侣账本 + 家庭共享账本</li>
      </ul>
      <p className="mt-1 text-xs text-gray-500">注：会员服务为虚拟商品，一经购买不支持退款。会员权益仅限于当前账户使用，不可转让。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">五、用户行为规范</h3>
      <p className="mb-1">您在使用本应用时，不得进行以下行为：</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>注册虚假信息或冒用他人身份</li>
        <li>利用本应用进行任何违法违规活动</li>
        <li>干扰或破坏本应用的正常运行</li>
        <li>未经授权访问他人账户或数据</li>
        <li>发布或传播违法、有害、骚扰性内容</li>
        <li>对本应用进行反向工程、破解或试图获取源代码</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">六、数据与隐私</h3>
      <p className="mb-1">1. 您的记账数据归您所有，我们按照《隐私政策》处理您的数据。</p>
      <p className="mb-1">2. 建议您定期导出数据备份，我们不承担因您未备份导致的数据丢失责任。</p>
      <p>3. 您可以选择开启或关闭云端同步功能。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">七、服务变更与中断</h3>
      <p className="mb-1">1. 我们可能根据业务发展调整或终止部分服务，会提前30天公告通知。</p>
      <p className="mb-1">2. 因系统维护、网络故障等原因可能导致服务暂时中断。</p>
      <p className="mb-1">3. 不可抗力（自然灾害、战争等）导致的服务中断，我们不承担责任。</p>
      <p>4. 如您违反本协议，我们有权暂停或终止您的账户。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">八、知识产权</h3>
      <p className="mb-1">1. 本应用的商标、图标、界面设计等知识产权归我们所有。</p>
      <p>2. 未经授权，您不得复制、修改、传播本应用的任何内容。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">九、免责声明</h3>
      <p className="mb-1">1. 本应用按「现状」提供，不作任何明示或暗示的担保。</p>
      <p className="mb-1">2. 我们不保证应用完全符合您的期望或需求。</p>
      <p>3. 因使用本应用产生的任何直接或间接损失，我们不承担责任（法律规定除外）。</p>
      <p>4. 您使用本应用即表示愿意承担相关风险。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">十、协议修改</h3>
      <p>我们有权根据需要修改本协议。修改后的协议将在应用内公布，继续使用即视为接受修改。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">十一、法律适用与争议解决</h3>
      <p className="mb-1">1. 本协议适用中华人民共和国法律。</p>
      <p className="mb-1">2. 因本协议产生的争议，双方应友好协商解决。</p>
      <p>3. 协商不成的，任何一方可向有管辖权的法院提起诉讼。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">十二、联系我们</h3>
      <p className="mb-1">如您对本协议有任何疑问，请联系我们：</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>客服邮箱：support@youyujizhang.com</li>
        <li>在线客服：应用内「设置-帮助与反馈」</li>
      </ul>
    </section>

    <p className="text-xs text-gray-400 mt-4 text-center">有鱼记账团队 保留所有权利</p>
  </div>
);

// 隐私政策内容
const PrivacyPolicyContent = () => (
  <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
    <div className="text-center pb-4 border-b border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-1">有鱼记账隐私政策</h2>
      <p className="text-gray-400 text-xs">版本日期：2024年3月</p>
    </div>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">引言</h3>
      <p>感谢您信任有鱼记账！我们非常重视您的隐私保护，会严格按照法律法规保护您的个人信息。本政策将帮助您了解我们如何收集、使用和保护您的信息。</p>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">一、我们收集哪些信息</h3>
      
      <p className="mb-1 font-medium text-gray-800">1. 您主动提供的信息</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li><strong>手机号码：</strong>用于账户注册、登录验证、找回密码</li>
        <li><strong>短信验证码：</strong>仅用于身份验证，不存储</li>
        <li><strong>记账数据：</strong>收支记录、账本信息、分类设置</li>
        <li><strong>用户昵称/头像：</strong>可选，用于个性化展示</li>
      </ul>

      <p className="mb-1 mt-2 font-medium text-gray-800">2. 自动收集的信息</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li><strong>设备信息：</strong>设备型号、操作系统版本、设备标识符</li>
        <li><strong>网络信息：</strong>IP地址、网络状态（用于服务稳定性）</li>
        <li><strong>使用数据：</strong>功能使用频率、崩溃日志（用于改进产品）</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">二、我们如何使用您的信息</h3>
      <p className="mb-1 text-xs text-teal-600 bg-teal-50 p-2 rounded"><strong>核心原则：</strong>您的数据仅用于提供和改进服务，我们不会出售您的个人信息。</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li><strong>提供核心服务：</strong>存储您的记账数据，实现多设备同步</li>
        <li><strong>账户安全：</strong>验证身份、防止欺诈、保护账户安全</li>
        <li><strong>产品优化：</strong>分析使用习惯，改进功能和用户体验</li>
        <li><strong>客户服务：</strong>回复咨询、处理反馈、解决技术问题</li>
        <li><strong>合规要求：</strong>遵守法律法规、响应政府合法要求</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">三、数据存储与安全</h3>
      
      <p className="mb-1 font-medium text-gray-800">1. 数据存储</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li><strong>本地优先：</strong>您的记账数据首先存储在本地设备</li>
        <li><strong>云端备份：</strong>登录后数据会同步到云端，便于多设备访问</li>
        <li><strong>服务器位置：</strong>中国大陆地区（符合数据本地化要求）</li>
      </ul>

      <p className="mb-1 mt-2 font-medium text-gray-800">2. 安全措施</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>✅ 传输加密：所有数据传输使用 HTTPS/TLS 加密</li>
        <li>✅ 存储加密：敏感数据在数据库中加密存储</li>
        <li>✅ 访问控制：严格的内部权限管理</li>
        <li>✅ 定期审计：定期进行安全检查和漏洞修复</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">四、您的权利</h3>
      <p className="mb-1">根据相关法律法规，您对个人信息享有以下权利：</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li><strong>查阅权：</strong>查看我们持有的关于您的信息</li>
        <li><strong>更正权：</strong>修改不准确或不完整的信息</li>
        <li><strong>删除权：</strong>要求删除您的个人信息（在「设置-账户安全」中可操作）</li>
        <li><strong>撤回同意：</strong>随时撤回授权（可能影响部分功能）</li>
        <li><strong>数据导出：</strong>导出您的记账数据（在「设置-数据管理」中）</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">五、信息共享与披露</h3>
      <p className="mb-1 text-xs text-red-500 bg-red-50 p-2 rounded"><strong>重要声明：我们不会出售您的个人信息！</strong></p>
      <p className="mb-1">仅在以下情况下，我们可能与第三方共享您的信息：</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li><strong>服务提供商：</strong>云服务提供商、短信服务商，仅用于提供服务</li>
        <li><strong>法律要求：</strong>根据法律法规、法院命令或政府要求</li>
        <li><strong>保护权益：</strong>为保护我们或他人的合法权益</li>
        <li><strong>业务转让：</strong>如发生合并、收购，会提前通知您</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">六、Cookie 与类似技术</h3>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>我们使用 Cookie 存储登录状态和偏好设置</li>
        <li>您可以在浏览器设置中管理 Cookie</li>
        <li>禁用 Cookie 可能影响部分功能</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">七、儿童隐私</h3>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>本应用不面向14岁以下儿童</li>
        <li>如发现收集了儿童信息，请联系我们删除</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">八、隐私政策更新</h3>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>我们可能根据需要更新本政策</li>
        <li>重大变更会通过应用内通知</li>
        <li>继续使用即视为接受更新后的政策</li>
      </ul>
    </section>

    <section>
      <h3 className="font-bold text-gray-900 mb-1">九、联系我们</h3>
      <p className="mb-1">如您对本隐私政策有任何疑问或行使您的权利，请联系我们：</p>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>📧 客服邮箱：support@youyujizhang.com</li>
        <li>📱 在线客服：应用内「设置-帮助与反馈」</li>
      </ul>
    </section>

    <p className="text-xs text-gray-400 mt-4 text-center">有鱼记账团队 保留所有权利</p>
  </div>
);

export function LoginPage() {
  const [loginMode, setLoginMode] = useState<'sms' | 'password'>('sms');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { setUser, login } = useAuthStore();

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

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

    const startCountdown = (seconds = 60) => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      setCountdown(seconds);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const clearCountdown = () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCountdown(0);
    };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      toast.error('系统配置错误');
      return;
    }

    setIsSending(true);
    startCountdown(60);
    toast.success('验证码已发送，请注意查收');

    void (async () => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/sms-auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send', phone: phone.trim() }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const waitSeconds = Number(data?.waitSeconds || 0);
          if (waitSeconds > 0) {
            startCountdown(waitSeconds);
          } else {
            clearCountdown();
          }
          toast.error(data?.error || '验证码发送失败，请稍后重试');
          return;
        }

        if (data?.code) {
          toast.success(`开发模式：验证码 ${data.code}`, { duration: 6000 });
        }
      } catch (error: any) {
        clearCountdown();
        toast.error(error?.message || '验证码发送失败，请稍后重试');
      } finally {
        setIsSending(false);
      }
    })();
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

      await Promise.all([
        useSubscriptionStore.getState().fetchSubscriptions(data.userId),
        useAuthStore.getState().preloadUserData(data.userId),
      ]);

      setUser({
        id: data.userId,
        phone: data.phone,
        nickname: `用户${data.phone.slice(-4)}`,
        hasPassword: Boolean(data.hasPassword),
        createdAt: new Date().toISOString(),
      });
      
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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handlePasswordLogin = async () => {
    if (!isValidPhone(phone)) {
      toast.error('请输入正确的手机号');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('请输入至少6位密码');
      return;
    }

    if (!agreed) {
      toast.error('请阅读并同意用户协议和隐私政策');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    try {
      const success = await login(phone.trim(), password);
      if (!success) {
        toast.error(useAuthStore.getState().error || '登录失败');
        return;
      }

      toast.success('✨ 登录成功！');
    } finally {
      setIsLoading(false);
    }
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
          <div className="inline-flex bg-gray-100 rounded-full p-1 mb-4">
            <button
              onClick={() => setLoginMode('sms')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                loginMode === 'sms' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              验证码登录
            </button>
            <button
              onClick={() => setLoginMode('password')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                loginMode === 'password' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              密码登录
            </button>
          </div>

          <p className="text-gray-500 text-sm mb-6">
            {loginMode === 'sms'
              ? '默认使用手机号验证码登录，首次登录会自动注册并绑定手机号'
              : '已设置密码的账号可直接登录，未设置密码请先验证码登录后前往我的页面设置'}
          </p>

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

            {loginMode === 'sms' ? (
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
                  {countdown > 0 ? `${countdown}s` : isSending ? '发送中...' : '获取验证码'}
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <input
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                  className="w-full bg-transparent text-base outline-none placeholder:text-gray-400"
                />
              </div>
            )}
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
            onClick={loginMode === 'sms' ? handleLogin : handlePasswordLogin}
            disabled={
              isLoading ||
              !isValidPhone(phone) ||
              !agreed ||
              (loginMode === 'sms' ? code.length !== 6 : password.length < 6)
            }
            className={`w-full mt-8 py-4 rounded-full text-lg font-medium transition-all ${
              isLoading ||
              !isValidPhone(phone) ||
              !agreed ||
              (loginMode === 'sms' ? code.length !== 6 : password.length < 6)
                ? 'bg-gray-200 text-gray-400'
                : 'bg-gradient-to-r from-teal-400 to-cyan-500 text-white active:scale-98 shadow-lg'
            }`}
          >
            {isLoading ? '登录中...' : loginMode === 'sms' ? '验证码登录 / 注册' : '密码登录'}
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
