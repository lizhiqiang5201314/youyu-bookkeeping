#!/bin/bash
# 服务器 SSH 修复脚本
# 在服务器上运行：bash fix-ssh.sh

echo "🔧 修复 SSH 配置..."

# 1. 确保目录和文件存在
mkdir -p ~/.ssh
touch ~/.ssh/authorized_keys

# 2. 添加 GitHub Actions 公钥（如果不存在）
PUB_KEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN8P+7/A6fPqmBgEoyt+Hazb9fHPUP2hD4B2JJSlvrKE github-actions-deploy'

if ! grep -q "$PUB_KEY" ~/.ssh/authorized_keys; then
    echo "$PUB_KEY" >> ~/.ssh/authorized_keys
    echo "✅ 公钥已添加"
else
    echo "✅ 公钥已存在"
fi

# 3. 修复权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chown -R root:root ~/.ssh
echo "✅ 权限已修复"

# 4. 修复 SSH 配置
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
echo "✅ SSH 配置已更新"

# 5. 重启 SSH
systemctl restart sshd || service ssh restart
echo "✅ SSH 服务已重启"

# 6. 验证
echo ""
echo "📋 当前配置："
echo "authorized_keys:"
cat ~/.ssh/authorized_keys
echo ""
ls -la ~/.ssh/
echo ""
grep -E "PermitRootLogin|PubkeyAuthentication" /etc/ssh/sshd_config | grep -v "^#"

echo ""
echo "🎉 修复完成！"
