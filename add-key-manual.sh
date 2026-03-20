#!/bin/bash
# 手动添加公钥到服务器

echo "📋 公钥内容（复制这个）："
cat ~/.ssh/github_deploy.pub
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 在服务器上执行以下命令："
echo ""
echo "1. SSH 登录服务器："
echo "   ssh root@139.196.73.61"
echo ""
echo "2. 创建 authorized_keys 文件："
echo '   mkdir -p ~/.ssh'
echo '   chmod 700 ~/.ssh'
echo '   touch ~/.ssh/authorized_keys'
echo '   chmod 600 ~/.ssh/authorized_keys'
echo ""
echo "3. 编辑文件，添加上面的公钥："
echo '   echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILAxnmISfQ2keT0nNN4KYmqx1F8rIw5b+pdK7n9igZpO github-actions-deploy" >> ~/.ssh/authorized_keys'
echo ""
echo "4. 或者直接粘贴："
echo "   vim ~/.ssh/authorized_keys"
echo "   # 粘贴公钥，保存退出"
echo ""
echo "5. 测试免密登录："
echo "   ssh -i ~/.ssh/github_deploy root@139.196.73.61"
