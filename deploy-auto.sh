#!/bin/bash
# 一键自动部署脚本（免密版）
# 使用方法: ./deploy-auto.sh

set -e

echo "🚀 开始部署有鱼记账..."

# 构建
echo "🔨 构建项目..."
npm run build

# 压缩
echo "📦 压缩文件..."
tar -czf dist.tar.gz dist/

# 上传部署（自动使用密码）
echo "📤 部署到服务器..."
sshpass -p "Li468186089" scp dist.tar.gz root@139.196.73.61:/tmp/
sshpass -p "Li468186089" ssh -o StrictHostKeyChecking=no root@139.196.73.61 "
  cd /tmp
  rm -rf /var/www/youyu/*
  tar -xzf dist.tar.gz
  cp -r dist/* /var/www/youyu/
  rm -rf dist dist.tar.gz
  sudo systemctl restart nginx
  echo '✅ 部署完成'
"

rm -f dist.tar.gz
echo "🎉 部署成功! http://139.196.73.61"
