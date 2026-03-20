import { useState } from 'react';
import { useAssetStore } from '@/stores/assetStore';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  CreditCard,
  DollarSign,
  Landmark,
  Smartphone,
  Package
} from 'lucide-react';
import { formatAmount, ASSET_TYPE_CONFIG } from '@/utils/constants';
import type { AssetType } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ASSET_TYPE_ICONS: Record<AssetType, React.ElementType> = {
  CASH: DollarSign,
  DEBIT_CARD: CreditCard,
  CREDIT_CARD: CreditCard,
  ALIPAY: Smartphone,
  WECHAT: Smartphone,
  INVESTMENT: TrendingUp,
  LOAN: Landmark,
  OTHER: Package,
};

export function AssetsPage() {
  const { user } = useAuthStore();
  const { addAsset, getTotalAssets, getTotalLiabilities, getNetWorth, getAssetsByUser } = useAssetStore();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'asset' | 'liability'>('all');
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    type: 'CASH' as AssetType,
    balance: '',
    note: '',
  });

  const userAssets = user ? getAssetsByUser(user.id) : [];
  
  const filteredAssets = userAssets.filter(asset => {
    const isLiability = ASSET_TYPE_CONFIG[asset.type].isLiability;
    if (activeTab === 'asset') return !isLiability;
    if (activeTab === 'liability') return isLiability;
    return true;
  });

  const totalAssets = user ? getTotalAssets(user.id) : 0;
  const totalLiabilities = user ? getTotalLiabilities(user.id) : 0;
  const netWorth = user ? getNetWorth(user.id) : 0;

  const handleAddAsset = () => {
    if (!formData.name || !formData.balance) {
      toast.error('请填写完整信息');
      return;
    }

    const balance = parseFloat(formData.balance) * 100;
    if (isNaN(balance)) {
      toast.error('请输入正确的金额');
      return;
    }

    addAsset({
      userId: user!.id,
      name: formData.name,
      type: formData.type,
      balance,
      initialAmount: balance,
      currency: 'CNY',
      note: formData.note,
      isIncluded: true,
    });

    toast.success('添加成功');
    setIsAddDialogOpen(false);
    setFormData({ name: '', type: 'CASH', balance: '', note: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部 */}
      <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 pt-12 pb-6">
        <div className="px-4">
          <h1 className="text-xl font-bold text-white mb-4">资产管理</h1>
          
          {/* 净资产卡片 */}
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-500 text-sm mb-1">净资产</p>
                <p className={cn(
                  'text-3xl font-bold',
                  netWorth >= 0 ? 'text-teal-600' : 'text-red-600'
                )}>
                  {formatAmount(netWorth)}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center p-3 bg-green-50 rounded-xl">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-600">资产</span>
                  </div>
                  <p className="font-semibold text-green-700">{formatAmount(totalAssets)}</p>
                </div>
                
                <div className="flex-1 text-center p-3 bg-red-50 rounded-xl">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-red-600">负债</span>
                  </div>
                  <p className="font-semibold text-red-700">{formatAmount(totalLiabilities)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 筛选标签 */}
      <div className="px-4 mt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="asset">资产</TabsTrigger>
            <TabsTrigger value="liability">负债</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 资产列表 */}
      <div className="px-4 mt-4 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">账户列表</h2>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="bg-teal-500 hover:bg-teal-600">
              <Plus className="w-4 h-4 mr-1" />
              添加
            </Button>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>添加账户</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>账户名称</Label>
                  <Input
                    placeholder="例如：工资卡"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>账户类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as AssetType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASSET_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span>{config.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>余额</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>备注（选填）</Label>
                  <Input
                    placeholder="添加备注..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  />
                </div>
                
                <Button onClick={handleAddAsset} className="w-full bg-teal-500 hover:bg-teal-600">
                  确认添加
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {filteredAssets.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无账户</p>
              <p className="text-gray-400 text-sm mt-1">点击右上角添加账户</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAssets.map((asset) => {
              const config = ASSET_TYPE_CONFIG[asset.type];
              const Icon = ASSET_TYPE_ICONS[asset.type];
              
              return (
                <Card key={asset.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: config.color + '20' }}
                        >
                          <Icon className="w-5 h-5" style={{ color: config.color }} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{asset.name}</p>
                          <p className="text-xs text-gray-500">{config.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          'font-semibold',
                          config.isLiability ? 'text-red-600' : 'text-gray-900'
                        )}>
                          {formatAmount(asset.balance)}
                        </p>
                        {asset.note && (
                          <p className="text-xs text-gray-400">{asset.note}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
