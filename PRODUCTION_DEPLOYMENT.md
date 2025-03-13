# 电商销售分析平台生产环境部署指南

本文档提供了将电商销售分析平台部署到生产环境的详细步骤。

## 前提条件

1. 已有可访问的服务器（如AWS EC2、阿里云ECS等）
2. 服务器已安装 Node.js (v14+) 和 npm
3. 已配置 AWS 凭证 (~/.aws/credentials)，具有 Bedrock API 访问权限
4. 已设置域名 (analyze.dsir.cc) 并配置了 DNS 解析
5. 已配置 HTTPS 证书（推荐使用 Let's Encrypt）
6. 已安装并配置 Nginx 作为反向代理

## 端口配置

系统使用以下端口配置：

- **后端服务器**: 端口 7001 (通过 `backend/.env` 中的 `PORT=7001` 设置)
- **前端开发服务器**: 端口 3000 (仅在本地开发时使用)
- **生产环境**: 通过 Nginx 反向代理，将 HTTPS 请求转发到后端服务器

部署脚本会自动确保后端使用正确的端口配置。

## 快速部署

我们提供了一个自动化脚本来简化生产环境部署过程：

```bash
# 使脚本可执行
chmod +x deploy-production.sh

# 运行部署脚本
# 生产环境部署
./deploy-production.sh

# 或者本地测试生产构建
./deploy-production.sh --local
```

这个脚本会自动执行以下步骤：
1. 构建前端代码（使用生产环境变量）
2. 将构建文件复制到后端的 public 目录
3. 更新后端依赖
4. 重启生产服务（支持PM2或systemd）

## 手动部署步骤

如果您想手动部署，请按照以下步骤操作：

### 1. 构建前端代码

```bash
# 进入前端目录
cd frontend

# 设置生产环境变量
echo "REACT_APP_API_URL=https://analyze.dsir.cc/api" > .env.production

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

### 4. 配置进程管理器

#### 使用PM2（推荐）

```bash
# 安装PM2（如果尚未安装）
npm install -g pm2

# 启动应用
pm2 start app.js --name "ecommerce-analyze"

# 设置开机自启
pm2 startup
pm2 save
```

#### 使用Systemd

创建服务文件：

```bash
sudo nano /etc/systemd/system/ecommerce-analyze.service
```

添加以下内容：

```
[Unit]
Description=Ecommerce Analysis Platform
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/ecommerce-analyze/backend
ExecStart=/usr/bin/node app.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl enable ecommerce-analyze
sudo systemctl start ecommerce-analyze
```

### 5. 配置Nginx反向代理

创建Nginx配置文件：

```bash
sudo nano /etc/nginx/sites-available/analyze.dsir.cc
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name analyze.dsir.cc;
    
    # 重定向HTTP到HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name analyze.dsir.cc;
    
    # SSL证书配置
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    # 安全设置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    
    # 代理设置
    location / {
        proxy_pass http://localhost:7001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 为长连接（如SSE）增加超时设置
    proxy_read_timeout 300;
    proxy_connect_timeout 300;
    proxy_send_timeout 300;
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/analyze.dsir.cc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 验证部署

1. 访问 https://analyze.dsir.cc
2. 登录系统并测试功能
3. 检查服务器日志是否有错误

## 监控与维护

### 日志监控

#### PM2日志

```bash
# 查看应用日志
pm2 logs ecommerce-analyze

# 查看错误日志
pm2 logs ecommerce-analyze --err
```

#### Systemd日志

```bash
sudo journalctl -u ecommerce-analyze
```

### 性能监控

```bash
# 使用PM2监控
pm2 monit

# 查看系统资源
htop
```

### 备份策略

定期备份以下内容：

1. 数据库数据
2. 应用程序代码
3. AWS凭证
4. Nginx和SSL配置

## 故障排除

### 应用无法启动

检查：
- Node.js版本是否兼容
- 依赖是否安装完整
- 环境变量是否正确设置
- 端口是否被占用

### 无法连接到Bedrock API

检查：
- AWS凭证是否正确
- 网络连接是否正常
- IAM权限是否配置正确

### HTTPS证书问题

检查：
- 证书是否过期
- 证书路径是否正确
- Nginx配置是否正确
