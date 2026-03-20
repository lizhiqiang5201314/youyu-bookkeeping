# 记账APP云端数据库配置指南

## ✅ 已完成工作

### 1. 安装依赖
- ✅ @supabase/supabase-js 已安装

### 2. 创建核心文件
- ✅ `src/services/supabase.ts` - Supabase客户端配置
- ✅ `src/stores/authStore.ts` - 云端认证（支持短信登录）
- ✅ `src/stores/bookStore.ts` - 云端账本管理
- ✅ `src/stores/transactionStore.ts` - 云端交易记录+实时同步
- ✅ `.env` - 环境变量配置
- ✅ `database/init.sql` - 数据库初始化脚本

---

## 🔧 你需要完成的步骤

### 步骤1：初始化数据库（2分钟）

1. 打开 Supabase Dashboard: https://supabase.com/dashboard
2. 进入你的项目：`rsytwtcavbbmbjchjhkk`
3. 点击左侧菜单 **SQL Editor**
4. 点击 **New query**
5. 复制 `database/init.sql` 文件的全部内容
6. 粘贴到 SQL Editor
7. 点击 **Run** 执行

执行成功后，数据库表就创建好了！

---

### 步骤2：配置实时同步（1分钟）

1. 在 Supabase Dashboard，点击左侧 **Database**
2. 点击 **Replication** 标签
3. 确认 **tables** 列表中包含：
   - `transactions`
   - `books`
   - `categories`
4. 如果没有，点击 **Add table** 添加

---

### 步骤3：配置手机号登录（可选，需要生产环境）

如果要用真实手机号登录：

1. 在 Dashboard 点击 **Authentication**
2. 点击 **Providers**
3. 找到 **Phone**  provider
4. 启用并配置 SMS 提供商（Twilio/Msg91等）

**开发阶段**：继续使用验证码 `123456` 登录

---

## 🚀 启动开发服务器

```bash
cd ~/Desktop/BookkeepingApp
npm run dev
```

---

## 📱 打包移动端

### Android
```bash
npx cap add android      # 首次添加
npx cap sync             # 同步代码
npx cap open android     # 打开Android Studio
```

### iOS（需要Mac）
```bash
npx cap add ios
npx cap sync
npx cap open ios
```

---

## 📋 云端功能清单

| 功能 | 状态 | 说明 |
|------|------|------|
| 用户登录 | ✅ | 支持Supabase Auth |
| 账本创建 | ✅ | 云端存储，多设备同步 |
| 分类管理 | ✅ | 自动创建默认分类 |
| 记账 | ✅ | 数据存云端 |
| 实时同步 | ✅ | 多人共享账本实时更新 |
| 交易查询 | ✅ | 支持日期范围筛选 |
| 统计图表 | ✅ | 收支趋势+分类统计 |

---

## 🔮 下一步可选功能

1. **共享账本** - 邀请成员、权限管理
2. **支付系统** - 接入微信支付/支付宝
3. **数据导入导出** - Excel/CSV
4. **预算管理** - 月度预算设置
5. **记账提醒** - 本地推送通知

---

## ❓ 常见问题

**Q: 数据安全吗？**
A: Supabase提供行级安全(RLS)，每个用户只能访问自己的数据。

**Q: 免费额度够用吗？**
A: Supabase免费版提供500MB数据库+1GB存储，个人/小团队足够用。

**Q: 如何备份数据？**
A: Supabase自动备份，也可以在Dashboard手动导出。

---

搞定！有问题随时喊我 💕
