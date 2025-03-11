# 电商销售分析平台 (E-commerce Sales Analytics Platform)

基于EC2和Amazon Bedrock的电商销售数据分析平台，提供AI驱动的销售趋势分析和原因解读。

![平台截图](https://via.placeholder.com/800x400?text=E-commerce+Analytics+Platform)

## 项目概述

该平台通过分析电商销售数据，帮助运营人员快速识别销售趋势、了解增长或下降原因，并提供数据驱动的决策建议。系统使用Amazon Bedrock进行AI分析，支持流式输出，包括思考过程展示。

### 核心功能

- **销售数据多维度查询与可视化**：支持按类别、渠道、时间等维度分析销售数据
- **AI驱动的销售趋势分析**：使用Amazon Bedrock生成专业的销售趋势分析
- **销售增长/下降原因分析**：AI自动识别影响销售的关键因素并提供解释
- **多维度数据比较**：支持同比/环比等多种比较方式
- **流式输出与思考过程**：实时展示AI分析思考过程，提供透明的分析逻辑

## 系统架构

![系统架构图](https://via.placeholder.com/800x400?text=System+Architecture)

- **前端**: React.js + Redux + Chart.js
- **后端**: Node.js + Express.js (部署在EC2)
- **数据库**: Amazon RDS MySQL, Amazon DynamoDB
- **AI服务**: Amazon Bedrock (Claude模型)
- **服务器**: Amazon EC2 + Auto Scaling

## 快速开始

### 前提条件

- AWS账户，并配置好访问凭证
- Node.js 18+
- Python 3.8+
- MySQL客户端
- Git

### 本地开发环境设置

1. 克隆仓库

```bash
git clone https://github.com/your-username/eCommerceAnalyze.git
cd eCommerceAnalyze
```

2. 安装后端依赖

```bash
cd backend
npm install
```

3. 安装前端依赖

```bash
cd ../frontend
npm install
```

4. 配置环境变量

创建 `.env` 文件在 `backend` 目录下:

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ecommerce
AWS_REGION=us-west-2
JWT_SECRET=your_jwt_secret
```

5. 初始化数据库

```bash
# 创建数据库和表结构
mysql -u root -p < db_schema.sql

# 生成模拟数据
python generate_mock_data.py --host localhost --user root --password your_password --database ecommerce
```

6. 启动开发服务器

```bash
# 启动后端服务
cd backend
npm run dev

# 启动前端服务 (新终端)
cd frontend
npm start
```

7. 访问应用

打开浏览器访问 `http://localhost:3000`

## 部署到AWS

详细的AWS部署步骤请参考 [部署文档](DEPLOYMENT.md)。

### 快速部署概览

1. 创建RDS MySQL实例
2. 创建DynamoDB表用于存储分析结果
3. 配置IAM角色和权限
4. 部署后端到EC2实例
5. 构建并部署前端

## 项目结构

```
/
├── README.md                 # 项目说明文档
├── DEPLOYMENT.md             # 部署文档
├── db_schema.sql             # 数据库Schema
├── generate_mock_data.py     # 生成模拟数据的Python脚本
├── backend/                  # 后端代码
│   ├── app.js               # 主应用入口
│   ├── package.json         # 依赖配置
│   ├── config.js            # 配置文件
│   ├── routes/              # API路由
│   ├── services/            # 业务服务
│   └── middleware/          # 中间件
└── frontend/                 # 前端代码
    ├── package.json         # 依赖配置
    ├── public/              # 静态资源
    └── src/                 # React源代码
        ├── components/      # 组件
        ├── pages/           # 页面
        ├── redux/           # Redux状态管理
        ├── services/        # API服务
        └── utils/           # 工具函数
```

## 使用说明

1. 登录系统（默认用户：admin/password）
2. 在仪表盘页面查看销售概览
3. 在分析页面设置查询条件并开始分析
4. 查看分析结果和AI洞察
5. 在历史页面查看和管理历史分析报告

## 技术栈

### 前端
- React.js
- Redux Toolkit
- Material-UI
- Chart.js
- Formik & Yup
- Axios

### 后端
- Node.js
- Express.js
- JWT认证
- AWS SDK

### 数据库
- MySQL (RDS)
- DynamoDB

### AI服务
- Amazon Bedrock (Claude模型)

## 贡献指南

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件

## 联系方式

项目维护者 - [@kingdoooo](https://github.com/kingdoooo)

项目链接: [https://github.com/kingdoooo/ecommerce-analyze](https://github.com/kingdoooo/ecommerce-analyze)