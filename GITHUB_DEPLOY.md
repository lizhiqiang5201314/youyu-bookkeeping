# GitHub Actions 自动部署配置

## 🚀 配置步骤

### 1. 创建 GitHub 仓库

```bash
cd ~/Desktop/BookkeepingApp

# 初始化 git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 创建 GitHub 仓库（在 GitHub 网页上创建，名字叫 youyu-bookkeeping）
# 然后关联推送
git remote add origin https://github.com/你的用户名/youyu-bookkeeping.git
git branch -M main
git push -u origin main
```

---

### 2. 配置 GitHub Secrets

登录 GitHub → 打开你的仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

添加以下 Secrets：

| Secret Name | Value | 说明 |
|-------------|-------|------|
| `REMOTE_HOST` | `139.196.73.61` | 你的服务器IP |
| `REMOTE_USER` | `root` | 服务器用户名 |
| `SSH_PRIVATE_KEY` | GitHub Actions 部署私钥 | 用于免密 SSH 登录 |
| `REMOTE_PORT` | `22` | SSH 端口，可选 |
| `VITE_SUPABASE_URL` | 你的 Supabase 项目 URL | 前端构建时注入 |
| `VITE_SUPABASE_ANON_KEY` | 你的 Supabase Publishable/Anon Key | 前端构建时注入 |

**添加方法：**
1. 点击 **New repository secret**
2. Name 填 `REMOTE_HOST`，Value 填 `139.196.73.61`
3. 点击 **Add secret**
4. 重复添加其余需要的 Secrets

**注意：**
- GitHub Actions 在云端构建，不会读取你本地电脑上的 `.env`
- 如果缺少 `VITE_SUPABASE_URL` 或 `VITE_SUPABASE_ANON_KEY`，构建虽然可能成功，但页面打开会直接报 Supabase 配置缺失
- 这两个值可以从项目根目录的 `.env` 中复制

---

### 3. 触发自动部署

配置完成后，以后每次推送代码就会自动部署：

```bash
# 修改代码后
 git add .
 git commit -m "更新功能"
 git push origin main

# GitHub Actions 会自动：
# 1. 构建项目
# 2. 上传到服务器
# 3. 重启 Nginx
```

---

### 4. 查看部署状态

GitHub 仓库 → **Actions** 标签

可以看到每次部署的日志和状态：
- ✅ 绿色 = 部署成功
- ❌ 红色 = 部署失败（点击查看日志）

---

## 📋 手动触发部署

如果不想等推送，可以手动触发：

GitHub 仓库 → **Actions** → **Build and Deploy** → **Run workflow**

---

## 🔧 常见问题

### Q: 部署失败，提示权限错误
**解决：** 检查 `SSH_PRIVATE_KEY`、`REMOTE_USER` 和服务器 `authorized_keys` 是否匹配

### Q: 文件没更新
**解决：** 检查服务器的 `/var/www/youyu/` 目录权限
```bash
ssh root@139.196.73.61
chmod -R 755 /var/www/youyu/
```

### Q: 想修改部署的服务器
**解决：** 在 GitHub Secrets 里更新 `REMOTE_HOST`

---

## ✅ 验证自动部署

1. 修改 `src/pages/HomePage.tsx` 里的某个文字
2. 提交推送
3. 等待 2-3 分钟
4. 刷新 `http://139.196.73.61`
5. 看到修改生效 = 自动部署成功！
