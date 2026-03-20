#!/bin/bash
# 有鱼记账 - Docker 部署脚本（多种安装方式）

set -e

echo "🚀 开始部署有鱼记账（Docker版）..."

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 安装 Docker（多种方式尝试）
install_docker() {
    echo "📦 尝试安装 Docker..."
    
    # 方式1：使用国内镜像安装
    if command -v curl &> /dev/null; then
        echo "尝试方式1：国内镜像..."
        curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/static/stable/x86_64/docker-24.0.7.tgz -o docker.tgz 2>/dev/null && \
        tar -xzf docker.tgz && \
        sudo cp docker/* /usr/bin/ && \
        rm -rf docker docker.tgz && \
        echo "✅ Docker 安装成功（方式1）" && \
        return 0
    fi
    
    # 方式2：使用包管理器
    if command -v apt &> /dev/null; then
        echo "尝试方式2：apt 安装..."
        sudo apt update
        sudo apt install -y docker.io 2>/dev/null && \
        echo "✅ Docker 安装成功（方式2）" && \
        return 0
    fi
    
    # 方式3：CentOS/RHEL
    if command -v yum &> /dev/null; then
        echo "尝试方式3：yum 安装..."
        sudo yum install -y docker 2>/dev/null && \
        echo "✅ Docker 安装成功（方式3）" && \
        return 0
    fi
    
    return 1
}

# 检查 Docker
if ! command -v docker &> /dev/null; then
    install_docker || {
        echo "❌ Docker 安装失败，请手动安装："
        echo "   Ubuntu/Debian: sudo apt install docker.io"
        echo "   CentOS/RHEL: sudo yum install docker"
        echo "   或访问: https://docs.docker.com/engine/install/"
        exit 1
    }
fi

# 启动 Docker 服务
sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || true

# 测试 Docker
echo "🐳 测试 Docker..."
docker --version || {
    echo "❌ Docker 未正确安装"
    exit 1
}

# 构建项目
echo "🔨 构建项目..."
npm install --registry=https://registry.npmmirror.com
npm run build

# 创建 Dockerfile（使用国内镜像加速）
echo "📝 创建 Dockerfile..."
cat > Dockerfile << 'EOF'
FROM registry.cn-hangzhou.aliyuncs.com/library/nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# 创建 Nginx 配置
echo "⚙️ 创建 Nginx 配置..."
cat > nginx.conf << 'EOF'
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# 构建镜像（使用国内镜像源）
echo "🔨 构建 Docker 镜像..."
docker build -t youyu-bookkeeping:latest .

# 停止旧容器
echo "🛑 停止旧容器..."
docker stop youyu-app 2>/dev/null || true
docker rm youyu-app 2>/dev/null || true

# 启动新容器
echo "▶️ 启动应用..."
docker run -d \
    --name youyu-app \
    --restart unless-stopped \
    -p 80:80 \
    youyu-bookkeeping:latest

# 清理
echo "🧹 清理旧镜像..."
docker image prune -f

echo ""
echo "✅ 部署完成！"
echo "📱 访问地址：http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP')"
echo ""
echo "📝 常用命令："
echo "   docker logs -f youyu-app    # 查看日志"
echo "   docker stop youyu-app       # 停止"
echo "   docker restart youyu-app    # 重启"
echo "   docker rm -f youyu-app      # 删除"
