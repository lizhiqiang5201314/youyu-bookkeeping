#!/bin/bash
# CentOS/RHEL 系统部署脚本

echo "🚀 有鱼记账 - CentOS 部署"

# 安装 Nginx
sudo yum install -y nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 创建网站目录
sudo mkdir -p /var/www/youyu
sudo rm -rf /var/www/youyu/*

# 提示手动上传
echo ""
echo "📤 请在本地运行："
echo "   scp -r dist root@你的服务器IP:/var/www/youyu/"
echo ""
echo "上传完成后，按回车继续..."
read

# 移动文件（如果上传到 /root/dist）
if [ -d "/root/dist" ]; then
    sudo cp -r /root/dist/* /var/www/youyu/
fi

if [ -d "/var/www/youyu/dist" ]; then
    sudo mv /var/www/youyu/dist/* /var/www/youyu/
    sudo rm -rf /var/www/youyu/dist
fi

# 配置 Nginx
sudo tee /etc/nginx/conf.d/youyu.conf > /dev/null << 'EOF'
server {
    listen 80 default_server;
    server_name _;
    
    root /var/www/youyu;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# 检查配置并重启
sudo nginx -t
sudo systemctl restart nginx

echo ""
echo "✅ 部署完成！"
echo "📱 访问地址：http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP')"
