#!/bin/bash
# 有鱼记账 - 服务器一键部署脚本
# 使用方法：把项目上传到服务器后运行此脚本

set -e

echo "🚀 开始部署有鱼记账..."

# 1. 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 2. 安装 Docker（如果没有）
if ! command -v docker &> /dev/null; then
    echo "📦 安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "✅ Docker 安装完成，请重新登录后再次运行脚本"
    exit 0
fi

# 3. 构建项目
echo "🔨 构建项目..."
npm install
npm run build

# 4. 创建 Dockerfile
echo "📝 创建 Dockerfile..."
cat > Dockerfile << 'EOF'
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# 5. 创建 Nginx 配置
echo "⚙️ 创建 Nginx 配置..."
cat > nginx.conf << 'EOF'
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
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

# 6. 构建 Docker 镜像
echo "🐳 构建 Docker 镜像..."
docker build -t youyu-bookkeeping:latest .

# 7. 停止旧容器（如果存在）
echo "🛑 停止旧容器..."
docker stop youyu-app 2>/dev/null || true
docker rm youyu-app 2>/dev/null || true

# 8. 启动新容器
echo "▶️ 启动应用..."
docker run -d \
    --name youyu-app \
    --restart unless-stopped \
    -p 80:80 \
    youyu-bookkeeping:latest

# 9. 清理旧镜像
echo "🧹 清理旧镜像..."
docker image prune -f

echo ""
echo "✅ 部署完成！"
echo ""
echo "📱 访问地址："
echo "   http://$(curl -s ifconfig.me)"
echo ""
echo "📝 常用命令："
echo "   查看日志：docker logs -f youyu-app"
echo "   停止应用：docker stop youyu-app"
echo "   重启应用：docker restart youyu-app"
echo "   删除应用：docker rm -f youyu-app"
