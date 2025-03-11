# 电商销售分析平台部署指南

本文档提供了将电商销售分析平台部署到AWS的详细步骤。

## 1. AWS资源准备

### 1.1 创建RDS MySQL实例

#### 使用AWS控制台

1. 登录AWS控制台，导航到RDS服务
2. 点击"创建数据库"
3. 选择"标准创建"和"MySQL"引擎
4. 版本选择"MySQL 8.0"
5. 在"模板"中选择"开发/测试"
6. 设置实例标识符为"ecommerce-analytics"
7. 设置主用户名为"admin"
8. 设置密码
9. 选择实例类型"db.t3.small"
10. 配置存储为20GB
11. 在"连接"部分，选择适当的VPC和安全组
12. 展开"其他配置"，设置初始数据库名为"ecommerce"
13. 点击"创建数据库"

#### 使用AWS CLI

```bash
aws rds create-db-instance \
    --db-instance-identifier ecommerce-analytics \
    --db-instance-class db.t3.small \
    --engine mysql \
    --master-username admin \
    --master-user-password <your-password> \
    --allocated-storage 20 \
    --db-name ecommerce \
    --vpc-security-group-ids <security-group-id> \
    --availability-zone <availability-zone> \
    --region <your-region>
```

### 1.2 创建DynamoDB表

#### 使用AWS控制台

1. 登录AWS控制台，导航到DynamoDB服务
2. 点击"创建表"
3. 表名设置为"SalesAnalysisResults"
4. 分区键设置为"reportId"(类型为字符串)
5. 保持默认设置，选择"按需"容量模式
6. 点击"创建表"

#### 使用AWS CLI

```bash
aws dynamodb create-table \
    --table-name SalesAnalysisResults \
    --attribute-definitions AttributeName=reportId,AttributeType=S \
    --key-schema AttributeName=reportId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region <your-region>
```

### 1.3 配置IAM角色

#### 使用AWS控制台

1. 登录AWS控制台，导航到IAM服务
2. 点击"角色"，然后点击"创建角色"
3. 选择"AWS服务"作为可信实体类型，选择"EC2"
4. 添加以下权限策略:
   - AmazonRDSFullAccess
   - AmazonDynamoDBFullAccess
   - AmazonBedrockFullAccess
5. 角色名称设置为"ECommerceAnalyticsRole"
6. 点击"创建角色"

#### 使用AWS CLI

```bash
# 创建信任策略文档
cat > trust-policy.json << EOL
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOL

# 创建角色
aws iam create-role \
    --role-name ECommerceAnalyticsRole \
    --assume-role-policy-document file://trust-policy.json

# 附加策略
aws iam attach-role-policy \
    --role-name ECommerceAnalyticsRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess

aws iam attach-role-policy \
    --role-name ECommerceAnalyticsRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

aws iam attach-role-policy \
    --role-name ECommerceAnalyticsRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

# 创建实例配置文件
aws iam create-instance-profile \
    --instance-profile-name ECommerceAnalyticsProfile

# 将角色添加到实例配置文件
aws iam add-role-to-instance-profile \
    --instance-profile-name ECommerceAnalyticsProfile \
    --role-name ECommerceAnalyticsRole
```

## 2. 数据库初始化

### 2.1 创建数据库Schema

1. 确保RDS实例已启动并可访问
2. 使用MySQL客户端连接到RDS实例:

```bash
mysql -h <your-rds-endpoint> -u admin -p < db_schema.sql
```

### 2.2 生成模拟数据

1. 确保已安装Python 3.8+
2. 安装所需依赖:

```bash
pip install pymysql faker
```

3. 运行数据生成脚本:

```bash
python generate_mock_data.py \
    --host <your-rds-endpoint> \
    --user admin \
    --password <your-password> \
    --database ecommerce
```

## 3. 部署EC2应用

### 3.1 启动EC2实例

#### 使用AWS控制台

1. 登录AWS控制台，导航到EC2服务
2. 点击"启动实例"
3. 输入实例名称"ecommerce-analytics-server"
4. 选择Amazon Linux 2023 AMI
5. 选择实例类型"t3.medium"
6. 选择之前创建的密钥对
7. 在网络设置中，选择适当的VPC和安全组
8. 展开"高级详细信息"，在IAM实例配置文件中选择"ECommerceAnalyticsProfile"
9. 点击"启动实例"

#### 使用AWS CLI

```bash
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.medium \
    --key-name <your-key-pair> \
    --security-group-ids <your-security-group> \
    --subnet-id <your-subnet-id> \
    --iam-instance-profile Name=ECommerceAnalyticsProfile \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ecommerce-analytics-server}]' \
    --region <your-region>
```

### 3.2 配置EC2实例

1. 通过SSH连接到EC2实例:

```bash
ssh -i <your-key.pem> ec2-user@<your-ec2-public-ip>
```

2. 更新系统并安装依赖:

```bash
# 更新系统
sudo yum update -y

# 安装Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安装Git
sudo yum install -y git

# 安装其他依赖
sudo yum install -y gcc-c++ make
```

3. 克隆代码仓库:

```bash
git clone https://github.com/kingdoooo/ecommerce-analyze.git
cd eCommerceAnalyze
```

4. 安装后端依赖:

```bash
cd backend
npm install
```

5. 创建环境配置文件:

```bash
cat > .env << EOL
PORT=3000
DB_HOST=<your-rds-endpoint>
DB_USER=admin
DB_PASSWORD=<your-password>
DB_NAME=ecommerce
AWS_REGION=<your-region>
JWT_SECRET=<your-jwt-secret>
EOL
```

6. 安装PM2进程管理器:

```bash
npm install pm2 -g
```

7. 构建前端:

```bash
cd ../frontend
npm install
npm run build
```

8. 配置后端服务静态文件:

```bash
# 创建静态文件目录
mkdir -p ../backend/public

# 复制前端构建文件到后端静态目录
cp -r build/* ../backend/public/
```

9. 启动应用:

```bash
cd ../backend
pm2 start app.js --name "ecommerce-analytics"
pm2 startup
pm2 save
```

### 3.3 配置Nginx (可选但推荐)

1. 安装Nginx:

```bash
sudo amazon-linux-extras install nginx1 -y
# 或者
sudo yum install -y nginx
```

2. 创建Nginx配置文件:

```bash
sudo cat > /etc/nginx/conf.d/ecommerce-analytics.conf << EOL
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL
```

3. 启动Nginx:

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3.4 配置HTTPS (推荐)

1. 安装Certbot:

```bash
sudo yum install -y certbot python3-certbot-nginx
```

2. 获取SSL证书 (需要有域名指向EC2实例):

```bash
sudo certbot --nginx -d yourdomain.com
```

3. 设置自动续期:

```bash
sudo certbot renew --dry-run
```

## 4. 设置自动扩展 (可选)

### 4.1 创建启动模板

1. 登录AWS控制台，导航到EC2服务
2. 在左侧导航栏中，选择"启动模板"
3. 点击"创建启动模板"
4. 输入模板名称"ecommerce-analytics-template"
5. 选择与之前相同的AMI、实例类型、密钥对和安全组
6. 在"高级详细信息"中，选择IAM实例配置文件"ECommerceAnalyticsProfile"
7. 在"用户数据"中，添加以下脚本:

```bash
#!/bin/bash
yum update -y
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git gcc-c++ make

# 克隆代码仓库
git clone https://github.com/kingdoooo/ecommerce-analyze.git /home/ec2-user/eCommerceAnalyze
cd /home/ec2-user/eCommerceAnalyze

# 设置环境变量
cat > /home/ec2-user/eCommerceAnalyze/backend/.env << EOL
PORT=3000
DB_HOST=<your-rds-endpoint>
DB_USER=admin
DB_PASSWORD=<your-password>
DB_NAME=ecommerce
AWS_REGION=<your-region>
JWT_SECRET=<your-jwt-secret>
EOL

# 安装依赖并启动应用
cd /home/ec2-user/eCommerceAnalyze/backend
npm install
npm install pm2 -g
pm2 start app.js --name "ecommerce-analytics"
pm2 startup
pm2 save

# 安装并配置Nginx
yum install -y nginx
cat > /etc/nginx/conf.d/ecommerce-analytics.conf << EOL
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

systemctl enable nginx
systemctl start nginx
```

8. 点击"创建启动模板"

### 4.2 创建自动扩展组

1. 导航到EC2服务中的"Auto Scaling组"
2. 点击"创建Auto Scaling组"
3. 输入组名"ecommerce-analytics-asg"
4. 选择之前创建的启动模板
5. 选择适当的VPC和子网
6. 配置高级选项，选择负载均衡器(如果有)
7. 设置组大小:
   - 所需容量: 1
   - 最小容量: 1
   - 最大容量: 3
8. 配置扩展策略:
   - 选择"目标跟踪扩展策略"
   - 指标类型: "平均CPU利用率"
   - 目标值: 70%
9. 添加通知(可选)
10. 添加标签(可选)
11. 点击"创建Auto Scaling组"

## 5. 设置负载均衡器 (可选)

### 5.1 创建目标组

1. 导航到EC2服务中的"目标组"
2. 点击"创建目标组"
3. 选择"实例"作为目标类型
4. 输入名称"ecommerce-analytics-tg"
5. 协议选择"HTTP"，端口"80"
6. 选择适当的VPC
7. 配置健康检查:
   - 协议: HTTP
   - 路径: /api/health
   - 高级设置保持默认
8. 点击"下一步"
9. 暂时不注册目标
10. 点击"创建目标组"

### 5.2 创建负载均衡器

1. 导航到EC2服务中的"负载均衡器"
2. 点击"创建负载均衡器"
3. 选择"Application Load Balancer"
4. 输入名称"ecommerce-analytics-alb"
5. 选择"面向互联网"
6. 选择适当的VPC和至少两个可用区的子网
7. 选择安全组
8. 配置监听器:
   - 协议: HTTP
   - 端口: 80
   - 默认操作: 转发到之前创建的目标组
9. 点击"创建负载均衡器"

### 5.3 更新Auto Scaling组

1. 导航到"Auto Scaling组"
2. 选择之前创建的组
3. 点击"编辑"
4. 在"负载均衡"部分，选择之前创建的目标组
5. 点击"更新"

## 6. 访问应用

完成部署后，可以通过以下方式访问应用:

- 如果使用负载均衡器: `http://<your-load-balancer-dns>`
- 如果直接访问EC2: `http://<your-ec2-public-ip>`

默认登录凭据:
- 用户名: admin
- 密码: password

## 7. 监控和维护

### 7.1 设置CloudWatch告警

1. 导航到CloudWatch服务
2. 点击"创建告警"
3. 选择指标(如EC2 CPU利用率、RDS连接数等)
4. 设置阈值和通知选项
5. 点击"创建告警"

### 7.2 日志管理

配置CloudWatch Logs代理收集应用日志:

```bash
# 安装CloudWatch Logs代理
sudo yum install -y awslogs

# 配置日志
sudo vi /etc/awslogs/awslogs.conf

# 添加配置
[/home/ec2-user/eCommerceAnalyze/backend/logs/app.log]
file = /home/ec2-user/eCommerceAnalyze/backend/logs/app.log
log_group_name = /ecommerce-analytics/app-logs
log_stream_name = {instance_id}
datetime_format = %Y-%m-%d %H:%M:%S

# 启动服务
sudo systemctl enable awslogsd
sudo systemctl start awslogsd
```

### 7.3 数据库备份

确保RDS实例配置了自动备份:

1. 导航到RDS服务
2. 选择数据库实例
3. 点击"修改"
4. 在"备份"部分，设置备份保留期(建议7天)
5. 点击"继续"并应用更改

## 8. 故障排除

### 8.1 应用无法连接到数据库

1. 检查RDS安全组是否允许来自EC2安全组的流量
2. 验证数据库凭据是否正确
3. 确认RDS实例状态为"可用"

### 8.2 Bedrock API调用失败

1. 确认IAM角色权限是否正确
2. 检查所选区域是否支持Bedrock服务
3. 验证模型ID是否正确

### 8.3 EC2实例CPU使用率过高

1. 考虑扩展实例类型
2. 检查应用是否有内存泄漏
3. 优化数据库查询

## 9. 安全最佳实践

1. 定期更新系统和依赖包
2. 使用AWS Secrets Manager存储敏感凭据
3. 实施网络ACL和安全组限制
4. 启用RDS加密
5. 配置AWS WAF防护Web应用
6. 实施IAM最小权限原则