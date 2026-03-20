#!/bin/bash
# 服务器 SSH 修复脚本

echo "🔧 修复 SSH 权限..."

# 1. 确保目录权限正确
mkdir -p ~/.ssh
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys 2>/dev/null || true

# 2. 确保公钥存在
echo "检查 authorized_keys:"
cat ~/.ssh/authorized_keys

# 3. 修复 SSH 配置
echo ""
echo "检查 SSH 配置:"
grep "PermitRootLogin\|PasswordAuthentication\|PubkeyAuthentication" /etc/ssh/sshd_config

# 4. 重启 SSH
echo ""
echo "重启 SSH 服务..."
sudo systemctl restart sshd

echo ""
echo "✅ 修复完成"
echo ""
echo "测试免密登录:"
echo "   ssh -i ~/.ssh/github_deploy root@139.196.73.61"
