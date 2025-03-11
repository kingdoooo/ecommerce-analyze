const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const mysql = require('mysql2/promise');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const config = require('./config');

const app = express();

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// 初始化AWS客户端
const bedrock = new BedrockRuntimeClient({ region: config.AWS_REGION });
const dynamoDB = new DynamoDBClient({ region: config.AWS_REGION });

// 数据库连接池
const pool = mysql.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/data', require('./routes/data'));

// SPA 前端路由处理 - 所有非API路由都返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 启动服务器
const PORT = process.env.PORT || 7001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
