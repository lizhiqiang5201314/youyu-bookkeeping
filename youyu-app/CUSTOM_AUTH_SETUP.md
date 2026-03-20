# 记账APP - 自定义用户系统配置指南

## ✅ 已完成工作

### 1. 移除 Supabase Auth 依赖
- ✅ 使用自定义 `app_users` 表存储用户信息
- ✅ 使用 bcrypt 加密密码
- ✅ 自己实现登录/注册逻辑
- ✅ 不再受 Supabase 邮件限制

### 2. 更新的文件
- ✅ `src/stores/authStore.ts` - 自定义登录系统
- ✅ `src/stores/bookStore.ts` - 适配新用户系统
- ✅ `src/stores/transactionStore.ts` - 适配新用户系统
- ✅ `src/App.tsx` - 更新登录逻辑
- ✅ `src/components/QuickAddModal.tsx` - 修复记账传参

---

## 🔧 现在需要做的（2分钟）

### 步骤1：执行新的数据库脚本

1. 打开 Supabase Dashboard: https://supabase.com/dashboard
2. 进入 SQL Editor
3. 新建查询，复制 `database/init_v2.sql` 的全部内容
4. 点击 **Run**

这会创建：
- `app_users` 表（自定义用户表）
- `books` 表（账本）
- `categories` 表（分类）
- `transactions` 表（交易记录）
- 默认分类数据

---

### 步骤2：刷新页面测试

执行完 SQL 后：

```bash
cd ~/Desktop/BookkeepingApp
npm run dev
```

---

## 🧪 测试步骤

1. 打开 http://localhost:5173
2. 点击 **"还没有账号？去注册"**
3. 输入手机号（11位）
4. 输入密码（至少6位）
5. 点击注册
6. 自动登录成功！

---

## 📋 特点

| 功能 | 说明 |
|------|------|
| 无邮件限制 | 不再触发 Supabase 邮件频率限制 |
| 自定义用户系统 | 数据完全掌控在自己手里 |
| 云端同步 | 数据仍然存 Supabase，多设备同步 |
| 密码加密 | 使用 bcrypt 加密存储 |

---

搞定！有任何问题随时喊我 💕
