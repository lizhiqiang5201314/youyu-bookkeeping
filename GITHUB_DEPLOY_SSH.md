# GitHub Actions 自动部署配置（SSH 密钥版）

## 🚀 配置步骤

### 1. 生成 SSH 密钥对

在你的 Mac 上运行：

```bash
# 生成密钥（用于 GitHub Actions 部署）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""

# 查看生成的密钥
cat ~/.ssh/github_deploy.pub     # 这是公钥，要放到服务器
cat ~/.ssh/github_deploy         # 这是私钥，要放到 GitHub Secrets
```

**注意：** 不要设置密码，直接回车

---

### 2. 公钥添加到服务器

```bash
# 复制公钥到服务器
ssh-copy-id -i ~/.ssh/github_deploy.pub root@139.196.73.61

# 或者手动添加
cat ~/.ssh/github_deploy.pub
# 复制内容，然后在服务器上执行：
# echo "粘贴公钥内容" >> ~/.ssh/authorized_keys
```

---

### 3. 私钥添加到 GitHub Secrets

1. 复制私钥内容：
```bash
cat ~/.ssh/github_deploy
```

2. 登录 GitHub → 打开你的仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

3. 添加以下 Secrets：

| Secret Name | Value | 说明 |
|-------------|-------|------|
| `REMOTE_HOST` | `139.196.73.61` | 服务器IP |
| `REMOTE_USER` | `root` | 服务器用户名 |
| `REMOTE_PORT` | `22` | 服务器 SSH 端口，可选 |
| `SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----`... | 刚才复制的私钥全部内容 |
| `VITE_SUPABASE_URL` | 你的 Supabase 项目 URL | 前端构建时注入 |
| `VITE_SUPABASE_ANON_KEY` | 你的 Supabase Publishable/Anon Key | 前端构建时注入 |

**添加 SSH_PRIVATE_KEY 时注意：**
- 要包含 `-----BEGIN` 和 `-----END` 那一行
- 保持格式完整（有换行）

**Supabase 相关注意：**
- GitHub Actions 在云端构建，不会读取你电脑里的 `.env`
- `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 必须在仓库 Secrets 里配置
- 这两个值可以直接从你本地项目的 `.env` 里复制

---

### 4. 创建 GitHub 仓库并推送代码

```bash
cd ~/Desktop/BookkeepingApp

# 初始化 git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 在 GitHub 创建仓库（名字叫 youyu-bookkeeping）
# 然后推送
git remote add origin https://github.com/你的用户名/youyu-bookkeeping.git
git branch -M main
git push -u origin main
```

---

### 5. 触发自动部署

以后每次推送代码就会自动部署：

```bash
# 修改代码后
git add .
git commit -m "更新功能"
git push origin main

# GitHub Actions 会自动：
# 1. 构建项目
# 2. 通过 SSH 上传到服务器
# 3. 重启 Nginx
```

---

## 📋 验证配置

### 测试 SSH 连接

在本地测试免密登录是否成功：

```bash
ssh -i ~/.ssh/github_deploy root@139.196.73.61
```

如果不需要输入密码直接登录，说明配置成功！

### 查看部署状态

GitHub 仓库 → **Actions** 标签

可以看到每次部署的日志：
- ✅ 绿色 = 部署成功
- ❌ 红色 = 部署失败（点击查看日志）

---

## 🔧 常见问题

### Q: Permission denied (publickey)
**解决：** 
1. 检查公钥是否正确添加到服务器的 `~/.ssh/authorized_keys`
2. 检查 GitHub Secrets 里的私钥是否完整

### Q: Could not resolve hostname
**解决：** 检查 `REMOTE_HOST` 是否正确

### Q: 文件没更新
**解决：** 
```bash
# 登录服务器检查
cd /var/www/youyu
ls -la
```

---

## ✅ 配置完成后的使用

以后只需要：

```bash
git push origin main
```

GitHub Actions 会自动部署到服务器！🚀
