#!/bin/bash

# 电商销售分析平台生产环境部署脚本
# 此脚本用于生产环境的部署

echo "===== 开始生产环境部署流程 ====="

# 1. 构建前端代码
echo "1. 构建前端代码..."
cd frontend

# 确保使用生产环境变量
# 生产环境使用域名，本地测试使用localhost:7001
if [ "$1" == "--local" ]; then
  echo "使用本地测试环境变量..."
  echo "REACT_APP_API_URL=http://localhost:7001/api" > .env.production
else
  echo "使用生产环境变量..."
  echo "REACT_APP_API_URL=https://analyze.dsir.cc/api" > .env.production
fi

# 确保后端端口配置正确
cd ../backend
if [ ! -f .env ]; then
  echo "创建 backend/.env 文件..."
  echo "PORT=7001" > .env
else
  if ! grep -q "PORT=" .env; then
    echo "添加 PORT 配置到 backend/.env..."
    echo "PORT=7001" >> .env
  else
    echo "更新 backend/.env 中的 PORT 配置..."
    sed -i '' 's/PORT=.*/PORT=7001/' .env
  fi
fi
cd ../frontend

npm install
npm run build

# 2. 复制构建文件到后端
echo "2. 复制构建文件到后端public目录..."
rm -rf ../backend/public/*
cp -R build/* ../backend/public/

# 3. 更新后端依赖
echo "3. 更新后端依赖..."
cd ../backend
npm install

# 4. 重启生产服务
echo "4. 重启生产服务..."

# 如果使用PM2
if command -v pm2 &> /dev/null
then
    echo "使用PM2重启服务..."
    pm2 restart app.js || pm2 start app.js
else
    echo "PM2未安装，尝试使用systemd重启服务..."
    # 如果使用systemd
    if [ -f /etc/systemd/system/ecommerce-analyze.service ]
    then
        echo "使用systemd重启服务..."
        sudo systemctl restart ecommerce-analyze
    else
        echo "未找到systemd服务，直接启动应用..."
        echo "应用将在前台运行，按Ctrl+C可以停止"
        node app.js
    fi
fi

echo "===== 部署完成 ====="
echo "应用已部署到 https://analyze.dsir.cc"
echo "请验证部署是否成功"
