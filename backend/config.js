const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  // 数据库配置
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME || 'ecommerce',
  
  // AWS配置
  AWS_REGION: process.env.AWS_REGION || 'us-west-2',
  
  // Bedrock模型配置
  DEFAULT_MODEL_ID: process.env.DEFAULT_MODEL_ID || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
  ALTERNATIVE_MODEL_ID: process.env.ALTERNATIVE_MODEL_ID || 'deepseek.r1-v1:0',
  
  // JWT配置
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: '24h',
  
  // DynamoDB配置
  DYNAMODB_TABLE: process.env.DYNAMODB_TABLE || 'SalesAnalysisResults',
  
  // 应用配置
  TTL_DAYS: 3 // 分析结果保存天数
};
