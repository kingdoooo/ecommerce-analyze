const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const mysql = require('mysql2/promise');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

class AnalysisService {
  constructor() {
    this.bedrock = new BedrockRuntimeClient({ region: config.AWS_REGION });
    this.dynamoDB = new DynamoDBClient({ region: config.AWS_REGION });
    this.pool = mysql.createPool({
      host: config.DB_HOST,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10
    });
  }

  async createAnalysis(userId, queryParams) {
    const reportId = uuidv4();
    const now = new Date();
    const ttl = Math.floor(now.getTime() / 1000) + (config.TTL_DAYS * 24 * 60 * 60);

    try {
      // 初始化分析记录
      await this.dynamoDB.send(new PutItemCommand({
        TableName: config.DYNAMODB_TABLE,
        Item: {
          reportId: { S: reportId },
          userId: { S: userId.toString() },
          queryParams: { S: JSON.stringify(queryParams) },
          status: { S: 'PROCESSING' },
          createdAt: { S: now.toISOString() },
          ttl: { N: ttl.toString() }
        }
      }));

      return { reportId, status: 'PROCESSING' };
    } catch (error) {
      console.error('Failed to create analysis task:', error);
      throw new Error('Failed to create analysis task');
    }
  }

  async getAnalysis(reportId) {
    try {
      const result = await this.dynamoDB.send(new GetItemCommand({
        TableName: config.DYNAMODB_TABLE,
        Key: { reportId: { S: reportId } }
      }));

      if (!result.Item) {
        throw new Error('Analysis report not found');
      }

      return this.unmarshallItem(result.Item);
    } catch (error) {
      console.error(`Failed to retrieve analysis ${reportId}:`, error);
      throw error;
    }
  }

  async queryData(params) {
    const connection = await this.pool.getConnection();
    try {
      const { timeRange, dimensions, metrics, filters } = params;
      
      // 构建SQL查询
      let selectClauses = [];
      let groupByClauses = [];
      let whereClauses = [`o.order_date BETWEEN ? AND ?`];
      let queryParams = [timeRange.start, timeRange.end];
      
      // 添加维度
      if (dimensions.includes('category')) {
        selectClauses.push('pc.category_name');
        groupByClauses.push('pc.category_name');
      }
      if (dimensions.includes('channel')) {
        selectClauses.push('o.order_source');
        groupByClauses.push('o.order_source');
      }
      if (dimensions.includes('date')) {
        selectClauses.push('DATE(o.order_date) as order_day');
        groupByClauses.push('order_day');
      }
      
      // 添加指标
      if (metrics.includes('sales') || metrics.length === 0) {
        selectClauses.push('SUM(o.total_amount) as total_sales');
      }
      if (metrics.includes('orders') || metrics.length === 0) {
        selectClauses.push('COUNT(DISTINCT o.order_id) as order_count');
      }
      if (metrics.includes('aov') || metrics.length === 0) {
        selectClauses.push('SUM(o.total_amount) / COUNT(DISTINCT o.order_id) as average_order_value');
      }
      
      // 添加过滤条件
      if (filters?.categories?.length) {
        whereClauses.push(`pc.category_name IN (?)`);
        queryParams.push(filters.categories);
      }
      if (filters?.channels?.length) {
        whereClauses.push(`o.order_source IN (?)`);
        queryParams.push(filters.channels);
      }
      
      const sql = `
        SELECT ${selectClauses.join(', ')}
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        JOIN product_categories pc ON p.category_id = pc.category_id
        WHERE ${whereClauses.join(' AND ')}
        ${groupByClauses.length ? 'GROUP BY ' + groupByClauses.join(', ') : ''}
      `;
      
      const [rows] = await connection.execute(sql, queryParams);
      return rows;
    } finally {
      connection.release();
    }
  }

  async callBedrock(prompt, modelId = config.DEFAULT_MODEL_ID) {
    try {
      const payload = JSON.stringify({
        prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
        max_tokens_to_sample: 4000,
        temperature: 0.7
      });

      const command = new InvokeModelCommand({
        modelId,
        body: payload
      });

      const response = await this.bedrock.send(command);
      const responseBody = JSON.parse(Buffer.from(response.body).toString());
      return responseBody.completion;
    } catch (error) {
      console.error('Bedrock API call failed:', error);
      throw new Error(`Failed to invoke Bedrock: ${error.message}`);
    }
  }

  generatePrompt(data, queryParams) {
    return `
      作为电商数据分析专家，请分析以下销售数据并提供专业见解。

      ## 分析时间范围
      ${queryParams.timeRange.start} 至 ${queryParams.timeRange.end}

      ## 销售数据
      ${JSON.stringify(data, null, 2)}

      ## 分析要求
      请提供以下分析:

      1. 销售趋势分析：描述主要销售趋势，包括增长或下降的时间点和幅度。
      2. 原因分析：分析销售增长或下降的可能原因。
      3. 关键发现：提炼3-5个最重要的数据发现。
      4. 行动建议：基于分析提供3-5条具体可行的建议。

      请以JSON格式返回分析结果，包含以下字段：
      {
        "trendAnalysis": "销售趋势的详细分析...",
        "causalFactors": [
          {"factor": "因素1", "impact": "高/中/低", "description": "详细描述..."},
          ...
        ],
        "keyInsights": ["洞察1", "洞察2", ...],
        "recommendations": ["建议1", "建议2", ...]
      }
    `;
  }

  unmarshallItem(item) {
    const result = {};
    for (const [key, value] of Object.entries(item)) {
      const type = Object.keys(value)[0];
      result[key] = value[type];
      
      // 解析JSON字符串
      if (['queryParams', 'rawData', 'analysisResults'].includes(key)) {
        try {
          result[key] = JSON.parse(result[key]);
        } catch (e) {
          console.warn(`Failed to parse JSON for ${key}`);
        }
      }
    }
    return result;
  }
}

module.exports = new AnalysisService();