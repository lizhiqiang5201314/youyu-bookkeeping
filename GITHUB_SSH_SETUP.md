# GitHub SSH 密钥配置

## 🔑 配置 GitHub SSH（用于推送代码）

### 1. 生成 SSH 密钥

```bash
# 生成 GitHub 用的 SSH 密钥
ssh-keygen -t ed25519 -C "你的邮箱@example.com" -f ~/.ssh/id_ed25519_github

# 一路回车，不要设置密码
```

### 2. 添加公钥到 GitHub

```bash
# 复制公钥内容
cat ~/.ssh/id_ed25519_github.pub
```

**然后到 GitHub 网站操作：**
1. 登录 https://github.com
2. 点击右上角头像 → **Settings**
3. 左侧菜单 → **SSH and GPG keys**
4. 点击 **New SSH key**
5. Title: 填 "MacBook"（随便取个名字）
6. Key: 粘贴刚才复制的公钥内容
7. 点击 **Add SSH key**

### 3. 配置 Git 使用 SSH

```bash
# 配置 Git 使用 SSH 地址
git remote set-url origin git@github.com:你的用户名/youyu-bookkeeping.git

# 或者克隆时就使用 SSH
git clone git@github.com:你的用户名/youyu-bookkeeping.git
```

### 4. 测试连接

```bash
ssh -T git@github.com
```

看到 `Hi 用户名! You've successfully authenticated` 就说明成功了！

---

## 🚀 现在可以推送代码了

```bash
cd ~/Desktop/BookkeepingApp

# 初始化
git init

# 添加文件
git add .

# 提交
git commit -m "Initial commit"

# 关联远程仓库（使用 SSH 地址）
git remote add origin git@github.com:你的用户名/youyu-bookkeeping.git

# 推送
git push -u origin main
```

---

## 📋 快速命令汇总

```bash
# 1. 生成密钥
ssh-keygen -t ed25519 -C "你的邮箱" -f ~/.ssh/id_ed25519_github

# 2. 复制公钥到 GitHub
cat ~/.ssh/id_ed25519_github.pub

# 3. 添加到 GitHub 网站（Settings → SSH keys → New SSH key）

# 4. 测试
ssh -T git@github.com

# 5. 使用 SSH 推送
git remote set-url origin git@github.com:用户名/仓库名.git
git push origin main
```

---

## ⚠️ 常见问题

### Q: Permission denied (publickey)
**解决：** 
```bash
# 添加私钥到 ssh-agent
ssh-add ~/.ssh/id_ed25519_github

# 或者配置 config 文件
cat >> ~/.ssh/config <> EOF
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
EOF
```

### Q: 已经有一个 id_ed25519 了
**解决：** 可以用新的文件名，比如 `id_ed25519_github`
