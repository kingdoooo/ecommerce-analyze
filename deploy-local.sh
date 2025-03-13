#!/bin/bash

# 电商销售分析平台本地部署脚本
# 此脚本用于本地开发环境的部署和测试

echo "===== 开始本地部署流程 ====="

# 1. 构建前端代码
echo "1. 构建前端代码..."
cd frontend

# 确保使用本地环境变量
echo "设置前端环境变量..."
echo "REACT_APP_API_URL=http://localhost:7001/api" > .env.production

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

# 4. 启动后端服务
echo "4. 启动后端服务..."
echo "确保 backend/.env 中设置了 PORT=7001"
echo "后端服务将在 http://localhost:7001 运行"
echo "前端应用将在 http://localhost:3000 运行"
echo ""
echo "请在另一个终端窗口运行以下命令启动前端开发服务器:"
echo "cd frontend && npm start"
echo ""
echo "或者直接访问 http://localhost:7001 使用后端服务器提供的前端文件"
echo ""
echo "按 Ctrl+C 可以停止后端服务"
echo "===== 部署完成 ====="

# 启动后端服务
npm run dev
