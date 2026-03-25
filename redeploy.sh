#!/bin/bash
echo "重新部署 sms-auth..."

# 下载 CLI
curl -fsSL https://github.com/supabase/cli/releases/download/v1.145.4/supabase_darwin_arm64.tar.gz -o /tmp/sb.tar.gz
tar -xzf /tmp/sb.tar.gz -C /tmp

# 登录（浏览器会打开）
/tmp/supabase login

# 部署
cd ~/Desktop/BookkeepingApp
/tmp/supabase functions deploy sms-auth

echo "✅ 部署完成！"
