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
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // 允许从您的域名以及必要的服务进行连接
        connectSrc: ["'self'", "https://analyze.dsir.cc", "wss://analyze.dsir.cc", "http://localhost:3000", "https://*.amazonaws.com"],
        // 允许从这些源加载脚本
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        // 允许从这些源加载样式
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        // 允许从这些源加载字体
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        // 允许从这些源加载图片
        imgSrc: ["'self'", "data:", "https://via.placeholder.com", "https://*.amazonaws.com"],
        // 允许加载manifest.json
        manifestSrc: ["'self'"]
      }
    },
    // 确保不会阻止同源iframe
    frameSrc: ["'self'"],
    // 配置CORS设置
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
  })
);
// 配置CORS，允许来自特定域名的请求
app.use(cors({
  origin: ['https://analyze.dsir.cc', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
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
