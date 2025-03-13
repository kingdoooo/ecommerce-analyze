# 电商销售分析平台本地部署指南

本文档提供了在本地环境中部署和测试电商销售分析平台的详细步骤。

## 前提条件

1. 已安装 Node.js (v14+) 和 npm
2. 已配置 AWS 凭证 (~/.aws/credentials)，具有 Bedrock API 访问权限
3. 本地 MySQL 数据库已设置并导入了必要的数据

## 快速部署

我们提供了一个自动化脚本来简化部署过程：

```bash
# 使脚本可执行
chmod +x deploy-local.sh

# 运行部署脚本
./deploy-local.sh
```

这个脚本会自动执行以下步骤：
1. 构建前端代码
2. 将构建文件复制到后端的 public 目录
3. 更新后端依赖
4. 启动后端服务

## 手动部署步骤

如果您想手动部署，请按照以下步骤操作：

### 1. 构建前端代码

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 构建前端
npm run build
```

### 2. 复制构建文件到后端

```bash
# 清空后端的public目录
rm -rf ../backend/public/*

# 复制构建文件
cp -R build/* ../backend/public/
```

### 3. 更新后端依赖

```bash
# 进入后端目录
cd ../backend

# 安装依赖
npm install
```

### 4. 启动服务

**方法1: 同时运行前端和后端（开发模式）**

终端1:
```bash
# 在backend目录下
npm run dev
```

终端2:
```bash
# 在frontend目录下
npm start
```

**方法2: 仅运行后端（使用后端提供的静态文件）**

```bash
# 在backend目录下
npm run dev
# 或
node app.js
```

然后访问 http://localhost:7001

## 访问应用

- 前端开发服务器: http://localhost:3000
- 后端API服务器: http://localhost:7001
- 使用后端静态文件: http://localhost:7001

**注意**: 后端服务器端口配置在 `backend/.env` 文件中通过 `PORT=7001` 设置。前端开发服务器默认使用端口 3000。这样可以避免端口冲突。

## 测试流程

1. 访问应用网站
2. 使用测试账号登录
3. 测试以下功能:
   - 创建新的分析任务
   - 查看流式分析响应
   - 验证页面滚动功能
   - 测试固定在右下角的"开始分析"按钮

## 常见问题

### CORS 错误

如果遇到CORS错误，请确保:
- 前端的 API 请求地址正确指向后端
- 后端的 CORS 配置允许前端域名

### AWS 凭证问题

如果 Bedrock API 调用失败，请检查:
- ~/.aws/credentials 文件是否存在并配置正确
- 凭证是否有调用 Bedrock API 的权限

### 数据库连接问题

如果数据库连接失败，请检查:
- MySQL 服务是否运行
- backend/config.js 中的数据库配置是否正确
