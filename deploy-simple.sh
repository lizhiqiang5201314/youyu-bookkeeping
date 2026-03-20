#!/bin/bash
# 有鱼记账 - 服务器一键部署脚本（无Docker版）

set -e

echo "🚀 开始部署有鱼记账..."

# 1. 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 2. 安装 Nginx（如果没有）
if ! command -v nginx &> /dev/null; then
    echo "📦 安装 Nginx..."
    # 尝试不同系统的安装方式
    if command -v apt &> /dev/null; then
        # Debian/Ubuntu
        sudo apt update
        sudo apt install -y nginx
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        sudo yum install -y nginx
    else
        echo "❌ 无法自动安装 Nginx，请手动安装"
        exit 1
    fi
fi

# 3. 构建项目
echo "🔨 构建项目..."
npm install --registry=https://registry.npmmirror.com
npm run build

# 4. 复制文件到 Nginx 目录
echo "📁 部署文件..."
sudo rm -rf /var/www/youyu
sudo mkdir -p /var/www/youyu
sudo cp -r dist/* /var/www/youyu/
sudo chown -R www-data:www-data /var/www/youyu

# 5. 创建 Nginx 配置
echo "⚙️ 配置 Nginx..."
sudo tee /etc/nginx/sites-available/youyu > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    root /var/www/youyu;
    index index.html;
    
    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# 6. 启用配置
sudo ln -sf /etc/nginx/sites-available/youyu /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# 7. 测试配置并重启
echo "🔄 重启 Nginx..."
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "✅ 部署完成！"
echo ""
echo "📱 访问地址："
echo "   http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP')"
echo ""
echo "📝 常用命令："
echo "   查看状态：sudo systemctl status nginx"
echo "   重启 Nginx：sudo systemctl restart nginx"
echo "   查看日志：sudo tail -f /var/log/nginx/access.log"
