# 微信支付接入配置指南

## 已完成的内容 ✅

### 1. 后端 (Supabase Edge Functions)
- `create-pay-order` - 创建支付订单
- `wechat-pay-h5` - 调起微信支付H5
- `pay-callback` - 微信支付回调处理
- `check-order` - 查询订单状态

### 2. 数据库
- `pay_orders` 表 - 存储支付订单

### 3. 前端
- `SubscriptionPlans.tsx` - 会员支付组件（已接入真实接口）
- `PaySuccessPage.tsx` - 支付成功页面

---

## 需要配置的环境变量

在 Supabase Dashboard → Settings → API → Project URL 和 Project API keys 中获取：

### 前端 .env 文件
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Edge Functions 环境变量
在 Supabase Dashboard → Edge Functions → 每个函数的环境变量中设置：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 微信支付配置
WECHAT_MCH_ID=你的微信支付商户号
WECHAT_APP_ID=你的微信小程序/公众号APPID
WECHAT_API_KEY=你的微信支付API密钥
WECHAT_NOTIFY_URL=https://your-project.functions.supabase.co/pay-callback
```

---

## 微信支付商户平台配置

### 1. 开通H5支付
登录微信支付商户平台 → 产品中心 → H5支付 → 申请开通

### 2. 配置支付回调URL
- 登录微信支付商户平台
- 产品中心 → 开发配置 → 支付配置
- 添加支付回调URL：`https://your-project.functions.supabase.co/pay-callback`
- ⚠️ 必须是备案域名

### 3. 配置H5支付域名
- 产品中心 → H5支付 → 支付配置
- 添加H5支付域名：`your-project.functions.supabase.co`
- 添加应用主页：`https://your-app-domain.com`

### 4. 获取API证书（V3）
- 账户中心 → API安全 → API证书
- 下载证书并妥善保存

---

## 部署步骤

### 1. 创建数据库表
在 Supabase SQL Editor 中执行：
```sql
\i supabase/migrations/create_pay_orders.sql
```

### 2. 部署 Edge Functions
```bash
# 登录 Supabase
supabase login

# 链接项目
supabase link --project-ref your-project-ref

# 部署函数
supabase functions deploy create-pay-order
supabase functions deploy wechat-pay-h5
supabase functions deploy pay-callback
supabase functions deploy check-order
```

### 3. 设置环境变量
```bash
# 设置微信支付相关环境变量
supabase secrets set WECHAT_MCH_ID=your-mch-id
supabase secrets set WECHAT_APP_ID=your-app-id
supabase secrets set WECHAT_API_KEY=your-api-key
supabase secrets set WECHAT_NOTIFY_URL=https://your-project.functions.supabase.co/pay-callback
```

---

## 测试支付

### 1. 真机测试
H5支付必须在真机或微信内置浏览器中测试，浏览器模拟器无法调起微信支付。

### 2. 测试金额
微信支付最低金额为 0.01 元（1分），建议测试时使用小额（如 0.01 或 0.1 元）。

### 3. 查看日志
在 Supabase Dashboard → Edge Functions → Logs 中查看函数执行日志。

---

## 常见问题

### Q: 提示 "支付配置未完善"
A: 检查 Supabase Edge Functions 的环境变量是否正确设置，特别是 WECHAT_MCH_ID、WECHAT_APP_ID、WECHAT_API_KEY。

### Q: 调起支付失败
A: 1. 确认商户平台已开通H5支付
   2. 确认回调URL和H5域名已在商户平台配置
   3. 检查 API 密钥是否正确

### Q: 支付成功后会员未开通
A: 1. 检查 pay-callback 函数是否正确部署
   2. 查看函数日志确认回调是否收到
   3. 确认回调URL可在公网访问

---

## 价格配置

会员价格在 `src/utils/constants.ts` 中配置：

```typescript
export const SUBSCRIPTION_PLANS = {
  COUPLE: {
    monthly: { price: 9.9, durationDays: 30 },
    yearly: { price: 49.9, durationDays: 365 },
    maxMembers: 2,
  },
  FAMILY: {
    monthly: { price: 29.9, durationDays: 30 },
    yearly: { price: 199.9, durationDays: 365 },
    maxMembers: 5,
  },
};
```

---

## 安全注意事项

1. **不要将 API 密钥提交到 Git**
2. **使用 Supabase Secrets 管理敏感信息**
3. **定期轮换 API 密钥**
4. **验证支付回调签名**（当前版本已预留，建议后续增强）
