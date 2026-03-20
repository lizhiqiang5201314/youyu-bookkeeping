import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Wallet, Smartphone, Lock, ArrowRight, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const { login, register, isLoading, error } = useAuthStore();

  const handleLogin = async () => {
    if (!phone || phone.length !== 11) {
      toast.error('请输入正确的11位手机号');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('密码至少6位');
      return;
    }

    const success = await login(phone, password);
    if (success) {
      
    } else {
      toast.error(error || '登录失败，请检查账号密码');
    }
  };

  const handleRegister = async () => {
    if (!phone || phone.length !== 11) {
      toast.error('请输入正确的11位手机号');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('密码至少6位');
      return;
    }

    const success = await register(phone, password);
    if (success) {
      
    } else {
      toast.error(error || '注册失败');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Wallet className="w-10 h-10 text-teal-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">有鱼记账</h1>
          <p className="text-white/80">轻松管理您的财务</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {isRegister ? '注册账号' : '欢迎登录'}
            </CardTitle>
            <CardDescription className="text-center">
              {isRegister ? '创建新账号开始记账' : '请输入手机号和密码'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 手机号输入 */}
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入11位手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="pl-10"
                  maxLength={11}
                />
              </div>
            </div>

            {/* 密码输入 */}
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码（至少6位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 登录/注册按钮 */}
            <Button
              onClick={isRegister ? handleRegister : handleLogin}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? '注册' : '登录'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>

            {/* 切换登录/注册 */}
            <Button
              variant="ghost"
              onClick={() => setIsRegister(!isRegister)}
              className="w-full text-gray-500"
            >
              {isRegister ? (
                <>已有账号？去登录</>
              ) : (
                <>
                  <UserPlus className="mr-2 w-4 h-4" />
                  还没有账号？去注册
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 底部信息 */}
        <p className="text-center text-white/60 text-sm mt-8">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
