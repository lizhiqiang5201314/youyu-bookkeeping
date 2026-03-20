#!/bin/bash
# 排查连接问题

echo "🔍 排查连接问题..."
echo ""

# 1. 检查 Nginx 是否运行
echo "1️⃣ 检查 Nginx 状态："
sudo systemctl status nginx | grep Active

# 2. 检查端口监听
echo ""
echo "2️⃣ 检查 80 端口："
sudo netstat -tlnp | grep 80 || sudo ss -tlnp | grep 80

# 3. 检查防火墙
echo ""
echo "3️⃣ 检查防火墙："
sudo firewall-cmd --list-ports 2>/dev/null || echo "firewalld 未安装"
sudo iptables -L -n | grep 80

# 4. 检查文件是否存在
echo ""
echo "4️⃣ 检查网站文件："
ls -la /var/www/youyu/

# 5. 检查 Nginx 配置
echo ""
echo "5️⃣ 检查 Nginx 配置："
sudo nginx -t

# 6. 开放防火墙端口
echo ""
echo "6️⃣ 开放 80 端口..."
sudo firewall-cmd --permanent --add-port=80/tcp 2>/dev/null
sudo firewall-cmd --reload 2>/dev/null
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null

echo ""
echo "✅ 排查完成！"
echo ""
echo "如果 Nginx 没运行，执行："
echo "   sudo systemctl start nginx"
echo ""
echo "如果端口没开放，执行："
echo "   sudo firewall-cmd --permanent --add-port=80/tcp"
echo "   sudo firewall-cmd --reload"
