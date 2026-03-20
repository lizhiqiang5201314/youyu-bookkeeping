#!/bin/bash
# 修复 GitHub SSH 连接

echo "🔧 修复 GitHub SSH 连接..."

# 1. 启动 ssh-agent
eval "$(ssh-agent -s)"

# 2. 添加私钥（如果你用的是默认文件名 id_ed25519）
ssh-add ~/.ssh/id_ed25519

# 如果你用的是自定义文件名（比如 id_ed25519_github），用下面这个：
# ssh-add ~/.ssh/id_ed25519_github

# 3. 测试连接
echo ""
echo "🧪 测试连接..."
ssh -T git@github.com

echo ""
echo "✅ 完成！如果看到 'Hi xxx' 就说明成功了"
