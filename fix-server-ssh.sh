#!/bin/bash
# 一键修复 SSH 部署问题
# 在服务器上运行这个脚本

echo "=========================================="
echo "🔧 SSH 部署问题诊断与修复"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查 authorized_keys
echo "📋 步骤1: 检查 authorized_keys 文件"
echo "------------------------------------------"
if [ -f ~/.ssh/authorized_keys ]; then
    echo -e "${GREEN}✓ authorized_keys 存在${NC}"
    echo "内容:"
    cat ~/.ssh/authorized_keys
    echo ""
    
    # 检查权限
    PERM=$(stat -c %a ~/.ssh/authorized_keys 2>/dev/null || stat -f %Lp ~/.ssh/authorized_keys)
    if [ "$PERM" = "600" ]; then
        echo -e "${GREEN}✓ 权限正确 (600)${NC}"
    else
        echo -e "${YELLOW}⚠ 权限错误: $PERM, 修复中...${NC}"
        chmod 600 ~/.ssh/authorized_keys
        echo -e "${GREEN}✓ 已修复为 600${NC}"
    fi
else
    echo -e "${RED}✗ authorized_keys 不存在${NC}"
    mkdir -p ~/.ssh
    touch ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
    echo -e "${GREEN}✓ 已创建 authorized_keys${NC}"
fi

# 2. 检查 .ssh 目录权限
echo ""
echo "📋 步骤2: 检查 .ssh 目录权限"
echo "------------------------------------------"
SSH_PERM=$(stat -c %a ~/.ssh 2>/dev/null || stat -f %Lp ~/.ssh)
if [ "$SSH_PERM" = "700" ]; then
    echo -e "${GREEN}✓ .ssh 权限正确 (700)${NC}"
else
    echo -e "${YELLOW}⚠ .ssh 权限错误: $SSH_PERM, 修复中...${NC}"
    chmod 700 ~/.ssh
    echo -e "${GREEN}✓ 已修复为 700${NC}"
fi

# 3. 添加 GitHub Actions 公钥
echo ""
echo "📋 步骤3: 确保 GitHub Actions 公钥存在"
echo "------------------------------------------"
PUB_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILAxnmISfQ2keT0nNN4KYmqx1F8rIw5b+pdK7n9igZpO github-actions-deploy"

if grep -q "github-actions-deploy" ~/.ssh/authorized_keys 2>/dev/null; then
    echo -e "${GREEN}✓ GitHub Actions 公钥已存在${NC}"
else
    echo -e "${YELLOW}⚠ 公钥不存在，添加中...${NC}"
    echo "$PUB_KEY" >> ~/.ssh/authorized_keys
    echo -e "${GREEN}✓ 公钥已添加${NC}"
fi

# 4. 检查 SSH 配置
echo ""
echo "📋 步骤4: 检查 SSH 服务配置"
echo "------------------------------------------"
SSH_CONFIG="/etc/ssh/sshd_config"

# 备份配置
cp $SSH_CONFIG ${SSH_CONFIG}.backup.$(date +%Y%m%d)

# 修改配置
echo "修改 SSH 配置..."
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin yes/' $SSH_CONFIG
sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' $SSH_CONFIG
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication yes/' $SSH_CONFIG
sed -i 's/^#*ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' $SSH_CONFIG

# 确保配置存在
grep -q "PermitRootLogin" $SSH_CONFIG || echo "PermitRootLogin yes" >> $SSH_CONFIG
grep -q "PubkeyAuthentication" $SSH_CONFIG || echo "PubkeyAuthentication yes" >> $SSH_CONFIG
grep -q "PasswordAuthentication" $SSH_CONFIG || echo "PasswordAuthentication yes" >> $SSH_CONFIG

echo -e "${GREEN}✓ SSH 配置已更新${NC}"

# 5. 重启 SSH 服务
echo ""
echo "📋 步骤5: 重启 SSH 服务"
echo "------------------------------------------"
if command -v systemctl &> /dev/null; then
    systemctl restart sshd
    echo -e "${GREEN}✓ SSH 服务已重启 (systemctl)${NC}"
else
    service ssh restart
    echo -e "${GREEN}✓ SSH 服务已重启 (service)${NC}"
fi

# 6. 验证配置
echo ""
echo "📋 步骤6: 验证配置"
echo "------------------------------------------"
echo "当前 authorized_keys 内容:"
cat ~/.ssh/authorized_keys
echo ""
echo "文件权限:"
ls -la ~/.ssh/
echo ""
echo "SSH 配置关键项:"
grep -E "PermitRootLogin|PubkeyAuthentication|PasswordAuthentication" $SSH_CONFIG | grep -v "^#"

# 7. 测试连接提示
echo ""
echo "=========================================="
echo -e "${GREEN}✅ 修复完成！${NC}"
echo "=========================================="
echo ""
echo "🧪 本地测试命令:"
echo "   ssh -i ~/.ssh/github_deploy root@139.196.73.61"
echo ""
echo "💡 GitHub Secrets 配置:"
echo "   REMOTE_HOST: 139.196.73.61"
echo "   REMOTE_USER: root"
echo "   SSH_PRIVATE_KEY: 复制 ~/.ssh/github_deploy 的内容"
echo ""
echo "⚠️  注意: 如果本地测试失败，检查防火墙:"
echo "   firewall-cmd --list-all"
echo "   firewall-cmd --add-port=22/tcp --permanent"
echo "   firewall-cmd --reload"
echo ""
