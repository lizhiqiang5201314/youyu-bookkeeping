import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useBookStore } from '@/stores/bookStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataExport } from '@/components/DataExport';

import { useSettingsStore } from '@/stores/settingsStore';
import {
  Crown,
  BookOpen,
  Download,
  Plus,
  User,
  Heart,
  Users,
  Check,
  Loader2,
  Trash2,
  Flame,
  Award,
  CalendarCheck,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SubscriptionPlans } from '@/components/SubscriptionPlans';
import type { BookType } from '@/types';
import { formatDate as formatLocalDate } from '@/services/db';

export function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore();
  const { books, currentBook, setCurrentBook, createBook, canCreateBookType, generateInviteCode, joinBookByCode, isBookOwner, deleteBook, exitBook } = useBookStore();
  const { fetchSubscriptions, getActiveSubscription } = useSubscriptionStore();
  const { checkInStreak, totalCheckIns, longestStreak, lastCheckInDate, checkIn } = useSettingsStore();

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBooksOpen, setIsBooksOpen] = useState(false);
  const [isCreateBookOpen, setIsCreateBookOpen] = useState(false);
  const [isJoinBookOpen, setIsJoinBookOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [newBookName, setNewBookName] = useState('');
  const [selectedBookType, setSelectedBookType] = useState<BookType>('PERSONAL');
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [selectedBookForInvite, setSelectedBookForInvite] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // 用户进入个人页时刷新一次账本和会员数据
  useEffect(() => {
    if (!user) return;

    useBookStore.getState().fetchBooks(user.id);
    fetchSubscriptions(user.id);
  }, [user?.id, fetchSubscriptions]);

  // 打开“我的账本”弹窗时再刷新一次，确保看到最新成员/邀请码状态
  useEffect(() => {
    if (!user || !isBooksOpen) return;
    useBookStore.getState().fetchBooks(user.id);
  }, [user?.id, isBooksOpen]);

  const activeSubscription = user
    ? getActiveSubscription(user.id)
    : null;

  // 格式化会员到期日期
  const formatExpiryDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 计算剩余天数
  const getDaysRemaining = (dateStr: string) => {
    const endDate = new Date(dateStr);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleSaveProfile = () => {
    updateUser({ nickname });

    setIsEditProfileOpen(false);
  };

  const [isAvatarLoading, setIsAvatarLoading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 检查文件大小 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过 2MB');
      return;
    }

    setIsAvatarLoading(true);

    try {
      // 读取文件为 base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;

        // 更新用户头像（存储 base64）
        await updateUser({ avatar: base64 });

        setIsAvatarLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('上传失败');
      setIsAvatarLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();

    }
  };

  // 处理创建新账本
  const handleCreateBook = async () => {
    if (!user) return;

    const check = canCreateBookType(user.id, selectedBookType);
    if (!check.canCreate) {
      return;
    }

    setIsCreating(true);
    try {
      const book = await createBook(newBookName || '', selectedBookType, user.id);
      if (book) {

        setIsCreateBookOpen(false);
        setNewBookName('');
        setSelectedBookType('PERSONAL');
      } else {
        toast.error('创建失败，请检查会员权限');
      }
    } catch (error) {
      console.error('创建账本错误:', error);
      toast.error('创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  // 生成邀请码
  const handleGenerateInviteCode = async (bookId: string) => {
    setIsGeneratingCode(true);
    try {
      const code = await generateInviteCode(bookId);
      if (code) {
        setGeneratedCode(code);
        setSelectedBookForInvite(bookId);
      }
    } catch (error) {
      console.error('Generate error:', error);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // 加入账本
  const handleJoinBook = async () => {
    if (!user || !joinCode.trim()) return;
    if (joinCode.trim().length !== 6) {
      toast.error('请输入6位邀请码');
      return;
    }
    setIsJoining(true);
    try {
      console.log('Attempting to join with code:', joinCode.trim());
      const book = await joinBookByCode(joinCode.trim(), user.id);
      if (book) {

        setIsJoinBookOpen(false);
        setJoinCode('');
      } else {
        toast.error('邀请码无效、已过期或已被使用');
      }
    } catch (error) {
      console.error('Join error:', error);
      toast.error('加入失败，请重试');
    } finally {
      setIsJoining(false);
    }
  };

  // 删除账本（仅创建者可删除）
  const handleDeleteBook = async (bookId: string, bookName: string) => {
    if (!user) return;
    if (!confirm(`确定要删除「${bookName}」吗？删除后无法恢复！`)) return;

    try {
      await deleteBook(bookId, user.id);

    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 退出账本（成员可退出情侣/家庭账本）
  const handleExitBook = async (bookId: string, bookName: string) => {
    if (!user) return;
    if (!confirm(`确定要退出「${bookName}」吗？`)) return;

    try {
      const success = await exitBook(bookId, user.id);
      if (success) {

      } else {
        toast.error('退出失败，创建者只能删除不能退出');
      }
    } catch (error) {
      toast.error('退出失败');
    }
  };

  // 获取今天日期
  const getToday = () => {
    return formatLocalDate(new Date());
  };

  // 检查今天是否已打卡
  const isCheckedInToday = () => {
    return lastCheckInDate === getToday();
  };

  // 处理打卡
  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    // 模拟网络请求
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = checkIn();
    if (success) {

    } else {
      toast.info('今天已经打卡啦，明天再来吧！');
    }
    setIsCheckingIn(false);
    setIsCheckInOpen(false);
  };
  const getAvailableBookTypes = (): { type: BookType; label: string; icon: typeof User; disabled: boolean; message?: string }[] => {
    if (!user) return [];

    const types: BookType[] = ['PERSONAL', 'COUPLE', 'FAMILY'];
    return types.map(type => {
      const check = canCreateBookType(user.id, type);

      const labels: Record<BookType, string> = {
        PERSONAL: '个人账本',
        COUPLE: '情侣账本',
        FAMILY: '家庭账本'
      };
      const icons: Record<BookType, typeof User> = {
        PERSONAL: User,
        COUPLE: Heart,
        FAMILY: Users
      };
      return {
        type,
        label: labels[type],
        icon: icons[type],
        disabled: !check.canCreate,
        message: check.message
      };
    });
  };

  const menuItems = [
    {
      icon: Flame,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-100',
      label: '每日打卡',
      value: isCheckedInToday() ? `连续${checkInStreak}天` : '去打卡',
      highlight: !isCheckedInToday(),
      onClick: () => setIsCheckInOpen(true)
    },
    {
      icon: Crown,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      label: '会员中心',
      value: activeSubscription
        ? `${formatExpiryDate(activeSubscription.endDate)}到期`
        : '未开通',
      highlight: !activeSubscription,
      onClick: () => setIsSubscriptionOpen(true)
    },
    {
      icon: BookOpen,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-100',
      label: '我的账本',
      value: `${books.length}个`,
      onClick: () => setIsBooksOpen(true)
    },
    {
      icon: Download,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-100',
      label: '数据导出',
      onClick: () => setIsExportOpen(true)
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      {/* 顶部背景 */}
      <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 pt-12 pb-20">
        <div className="px-4">
          <h1 className="text-xl font-bold text-white mb-6">个人中心</h1>

          {/* 用户信息卡片 */}
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="avatar"
                      className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {user?.nickname?.[0] || user?.phone?.slice(-1) || 'U'}
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-50">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isAvatarLoading}
                    />
                    {isAvatarLoading ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </label>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    {user?.nickname || `用户${user?.phone?.slice(-4)}`}
                  </h2>
                  <p className="text-gray-500 text-sm">{user?.phone}</p>

                  {/* 会员标识 */}
                  {activeSubscription ? (
                    <div className="flex flex-col gap-1 mt-2">
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full">
                          <Crown className="w-3 h-3" />
                          <span>
                            {activeSubscription.type === 'COUPLE' ? '情侣会员' : '家庭会员'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        有效期至：{formatExpiryDate(activeSubscription.endDate)}
                        <span className="ml-2 text-orange-500">
                          (剩余{getDaysRemaining(activeSubscription.endDate)}天)
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs text-gray-400">普通用户</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="px-4 -mt-12">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className={cn(
                  'w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors',
                  index !== menuItems.length - 1 && 'border-b border-gray-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center',
                    item.bgColor || (item.highlight ? 'bg-orange-100' : 'bg-gray-100')
                  )}>
                    <item.icon className={cn(
                      'w-4 h-4',
                      item.iconColor || (item.highlight ? 'text-orange-500' : 'text-gray-500')
                    )} />
                  </div>
                  <span className={cn(
                    'font-medium',
                    item.highlight ? 'text-orange-600' : 'text-gray-700'
                  )}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.value && (
                    <span className="text-sm text-gray-400">{item.value}</span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* 退出登录 */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full mt-6 py-6 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-4 h-4 mr-2" />
          退出登录
        </Button>

        {/* 版本信息 */}
        <p className="text-center text-gray-400 text-xs mt-6">
          有鱼记账 v1.0.0
        </p>
      </div>

      {/* 编辑资料弹窗 */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑资料</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>昵称</Label>
              <Input
                placeholder="请输入昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveProfile} className="w-full bg-teal-500 hover:bg-teal-600">
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 会员中心弹窗 */}
      <Dialog open={isSubscriptionOpen} onOpenChange={setIsSubscriptionOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>会员中心</DialogTitle>
          </DialogHeader>
          <SubscriptionPlans
            onClose={() => setIsSubscriptionOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 数据导出弹窗 */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>数据导出</DialogTitle>
          </DialogHeader>
          <DataExport />
        </DialogContent>
      </Dialog>

      {/* 我的账本弹窗 */}
      <Dialog open={isBooksOpen} onOpenChange={setIsBooksOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>我的账本</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {books.map(book => (
              <div
                key={book.id}
                className={cn(
                  'w-full p-4 rounded-xl border-2 transition-all',
                  currentBook?.id === book.id
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-100'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => {
                      setCurrentBook(book);

                    }}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      book.type === 'PERSONAL' && 'bg-blue-100 text-blue-600',
                      book.type === 'COUPLE' && 'bg-pink-100 text-pink-600',
                      book.type === 'FAMILY' && 'bg-purple-100 text-purple-600'
                    )}>
                      {book.type === 'PERSONAL' && <User className="w-5 h-5" />}
                      {book.type === 'COUPLE' && <Heart className="w-5 h-5" />}
                      {book.type === 'FAMILY' && <Users className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{book.name}</p>
                      <p className="text-sm text-gray-500">
                        {book.type === 'PERSONAL' && '个人账本'}
                        {book.type === 'COUPLE' && '情侣账本'}
                        {book.type === 'FAMILY' && '家庭账本'}
                        · {book.type === 'PERSONAL' ? '1人' : `${book.members.length}人`}
                      </p>
                    </div>
                  </button>
                  {currentBook?.id === book.id && (
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center ml-2">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* 邀请码区域 - 只有创建者显示 */}
                {book.type !== 'PERSONAL' && isBookOwner(book.id, user?.id || '') ? (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {selectedBookForInvite === book.id && generatedCode ? (
                      <div className="bg-teal-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">邀请码（7天有效）</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-teal-600 tracking-widest">
                            {generatedCode}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(generatedCode);
                                toast.success('邀请码已复制');
                              } catch (error) {
                                toast.error('复制失败，请手动复制');
                              }
                            }}
                          >
                            复制
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-teal-600 border-teal-200"
                        onClick={() => handleGenerateInviteCode(book.id)}
                        disabled={isGeneratingCode}
                      >
                        {isGeneratingCode ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        生成邀请码
                      </Button>
                    )}
                  </div>
                ) : book.type !== 'PERSONAL' && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                      只有账本创建者可以生成邀请码
                    </p>
                  </div>
                )}

                {/* 操作按钮区域 */}
                <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                  {isBookOwner(book.id, user?.id || '') ? (
                    // 创建者显示删除按钮
                    (() => {
                      // 检查是否是最后一个个人账本
                      const isLastPersonalBook = book.type === 'PERSONAL' &&
                        books.filter(b => b.type === 'PERSONAL').length <= 1;

                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "flex-1",
                            isLastPersonalBook
                              ? "text-gray-400 border-gray-200 cursor-not-allowed"
                              : "text-red-500 border-red-200 hover:bg-red-50"
                          )}
                          onClick={() => !isLastPersonalBook && handleDeleteBook(book.id, book.name)}
                          disabled={isLastPersonalBook}
                          title={isLastPersonalBook ? "必须保留至少一个个人账本" : ""}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {isLastPersonalBook ? "不可删除" : "删除账本"}
                        </Button>
                      );
                    })()
                  ) : (
                    // 成员显示退出按钮（仅限情侣/家庭账本）
                    book.type !== 'PERSONAL' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-orange-500 border-orange-200 hover:bg-orange-50"
                        onClick={() => handleExitBook(book.id, book.name)}
                      >
                        <LogOut className="w-4 h-4 mr-1" />
                        退出账本
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="py-4 border-dashed border-teal-200 text-teal-600 hover:bg-teal-50"
                onClick={() => {
                  setIsBooksOpen(false);
                  setIsCreateBookOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                创建账本
              </Button>
              <Button
                variant="outline"
                className="py-4 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={() => {
                  setIsBooksOpen(false);
                  setIsJoinBookOpen(true);
                }}
              >
                <Users className="w-4 h-4 mr-2" />
                加入账本
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 创建账本弹窗 */}
      <Dialog open={isCreateBookOpen} onOpenChange={setIsCreateBookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建新账本</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 账本类型选择 */}
            <div className="space-y-2">
              <Label>账本类型</Label>
              <div className="grid grid-cols-3 gap-2">
                {getAvailableBookTypes().map(({ type, label, icon: Icon, disabled, message }) => (
                  <button
                    key={type}
                    onClick={() => !disabled && setSelectedBookType(type)}
                    disabled={disabled}
                    title={message}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                      selectedBookType === type
                        ? 'border-teal-500 bg-teal-50'
                        : disabled
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-teal-200'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      selectedBookType === type ? 'bg-teal-500' : 'bg-gray-100'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        selectedBookType === type ? 'text-white' : 'text-gray-500'
                      )} />
                    </div>
                    <span className={cn(
                      'text-xs font-medium',
                      selectedBookType === type ? 'text-teal-700' : 'text-gray-600'
                    )}>
                      {label}
                    </span>
                    {disabled && message?.includes('会员') && (
                      <Crown className="w-3 h-3 text-orange-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 账本名称 */}
            <div className="space-y-2">
              <Label>账本名称（可选）</Label>
              <Input
                placeholder={selectedBookType === 'PERSONAL' ? '个人账本' : selectedBookType === 'COUPLE' ? '情侣账本' : '家庭账本'}
                value={newBookName}
                onChange={(e) => setNewBookName(e.target.value)}
              />
            </div>

            {/* 提示信息 */}
            {selectedBookType !== 'PERSONAL' && (
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-xs text-orange-600">
                  <Crown className="w-3 h-3 inline mr-1" />
                  {selectedBookType === 'COUPLE' ? '情侣账本' : '家庭账本'}需要开通相应会员才能创建
                </p>
              </div>
            )}

            <Button
              onClick={handleCreateBook}
              className="w-full bg-teal-500 hover:bg-teal-600"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建账本'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>每日打卡</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">
            {/* 打卡状态 */}
            <div className="text-center">
              <div className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4',
                isCheckedInToday() ? 'bg-green-100' : 'bg-orange-100'
              )}>
                {isCheckedInToday() ? (
                  <CalendarCheck className="w-12 h-12 text-green-600" />
                ) : (
                  <Flame className="w-12 h-12 text-orange-500" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {isCheckedInToday() ? '今日已打卡' : '今日未打卡'}
              </h3>
              <p className="text-gray-500 mt-1">
                {isCheckedInToday()
                  ? '明天继续加油！'
                  : '坚持记账，养成理财好习惯'}
              </p>
            </div>

            {/* 统计数据 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{checkInStreak}</p>
                <p className="text-xs text-gray-500">连续打卡</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Award className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{longestStreak}</p>
                <p className="text-xs text-gray-500">最长记录</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CalendarCheck className="w-4 h-4 text-teal-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalCheckIns}</p>
                <p className="text-xs text-gray-500">累计打卡</p>
              </div>
            </div>

            {/* 打卡按钮 */}
            <Button
              onClick={handleCheckIn}
              disabled={isCheckingIn || isCheckedInToday()}
              className={cn(
                'w-full h-12 text-lg font-medium',
                isCheckedInToday()
                  ? 'bg-green-500 hover:bg-green-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
              )}
            >
              {isCheckingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isCheckedInToday() ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  已完成
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5 mr-2" />
                  立即打卡
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 加入账本弹窗 */}
      <Dialog open={isJoinBookOpen} onOpenChange={setIsJoinBookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>加入账本</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-500 text-sm">
                请输入对方分享的6位邀请码
              </p>
            </div>

            <div className="space-y-2">
              <Label>邀请码</Label>
              <Input
                placeholder="请输入6位邀请码"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>

            <Button
              onClick={handleJoinBook}
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={isJoining || joinCode.length !== 6}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  加入中...
                </>
              ) : (
                '确认加入'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
