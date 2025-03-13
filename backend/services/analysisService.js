const { BedrockRuntimeClient, InvokeModelCommand, ConverseStreamCommand } = require('@aws-sdk/client-bedrock-runtime');
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
  
  /**
   * 更新分析结果
   * @param {string} reportId - 分析报告ID
   * @param {object} data - 查询的原始数据
   * @param {object} results - 分析结果
   */
  async updateAnalysisResults(reportId, data, results, reasoningContent) {
    try {
      console.log(`Updating analysis results for report ${reportId}`);
      
      // 检查是否是临时报告ID
      if (reportId.startsWith('temp-')) {
        // 对于临时报告ID，创建一个新的记录，包含userId字段
        const userId = '1'; // 默认用户ID，实际应用中应该从认证中获取
        const now = new Date();
        const ttl = Math.floor(now.getTime() / 1000) + (config.TTL_DAYS * 24 * 60 * 60);
        
        // 创建DynamoDB项目
        const item = {
          reportId: { S: reportId },
          userId: { S: userId },
          status: { S: 'COMPLETED' },
          rawData: { S: JSON.stringify(data) },
          analysisResults: { S: JSON.stringify(results) },
          createdAt: { S: now.toISOString() },
          completedAt: { S: now.toISOString() },
          ttl: { N: ttl.toString() },
          queryParams: { S: JSON.stringify({
            timeRange: {
              start: '2024-09-01',
              end: '2025-03-01'
            },
            dimensions: ['category', 'channel'],
            metrics: ['sales', 'orders']
          })}
        };
        
        // 如果有reasoning内容，也保存到DynamoDB
        if (reasoningContent) {
          item.reasoningContent = { S: reasoningContent };
        }
        
        await this.dynamoDB.send(new PutItemCommand({
          TableName: config.DYNAMODB_TABLE,
          Item: item
        }));
      } else {
        // 对于非临时报告ID，先获取现有记录
        try {
          const existingReport = await this.getAnalysis(reportId);
          
          // 创建DynamoDB项目
          const item = {
            reportId: { S: reportId },
            userId: { S: existingReport.userId },
            status: { S: 'COMPLETED' },
            rawData: { S: JSON.stringify(data) },
            analysisResults: { S: JSON.stringify(results) },
            createdAt: { S: existingReport.createdAt },
            completedAt: { S: new Date().toISOString() },
            ttl: { S: existingReport.ttl },
            queryParams: { S: existingReport.queryParams ? JSON.stringify(existingReport.queryParams) : '{}' }
          };
          
          // 如果有reasoning内容，也保存到DynamoDB
          if (reasoningContent) {
            item.reasoningContent = { S: reasoningContent };
          }
          
          // 更新DynamoDB中的分析记录，保留原有的userId和其他字段
          await this.dynamoDB.send(new PutItemCommand({
            TableName: config.DYNAMODB_TABLE,
            Item: item
          }));
        } catch (getError) {
          console.error(`Failed to get existing report ${reportId}:`, getError);
          // 如果获取失败，创建一个新记录
          const userId = '1'; // 默认用户ID
          const now = new Date();
          const ttl = Math.floor(now.getTime() / 1000) + (config.TTL_DAYS * 24 * 60 * 60);
          
          // 创建DynamoDB项目
          const item = {
            reportId: { S: reportId },
            userId: { S: userId },
            status: { S: 'COMPLETED' },
            rawData: { S: JSON.stringify(data) },
            analysisResults: { S: JSON.stringify(results) },
            createdAt: { S: now.toISOString() },
            completedAt: { S: now.toISOString() },
            ttl: { N: ttl.toString() },
            queryParams: { S: JSON.stringify({
              timeRange: {
                start: '2024-09-01',
                end: '2025-03-01'
              },
              dimensions: ['category', 'channel'],
              metrics: ['sales', 'orders']
            })}
          };
          
          // 如果有reasoning内容，也保存到DynamoDB
          if (reasoningContent) {
            item.reasoningContent = { S: reasoningContent };
          }
          
          await this.dynamoDB.send(new PutItemCommand({
            TableName: config.DYNAMODB_TABLE,
            Item: item
          }));
        }
      }
      
      console.log(`Successfully updated analysis results for report ${reportId}`);
      return true;
    } catch (error) {
      console.error(`Failed to update analysis results for report ${reportId}:`, error);
      return false;
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

  async getAnalysisHistory(userId) {
    try {
      console.log(`Fetching analysis history for user ${userId}`);
      
      // 使用Scan操作获取用户的分析历史
      const { ScanCommand } = require('@aws-sdk/client-dynamodb');
      const result = await this.dynamoDB.send(new ScanCommand({
        TableName: config.DYNAMODB_TABLE,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': { S: userId.toString() }
        }
      }));

      if (!result.Items || result.Items.length === 0) {
        console.log(`No analysis history found for user ${userId}`);
        return [];
      }

      // 将DynamoDB项目转换为普通JavaScript对象
      const history = result.Items.map(item => this.unmarshallItem(item));
      
      // 按创建时间降序排序
      history.sort((a, b) => {
        return new Date(b.createdAt || '1970-01-01') - new Date(a.createdAt || '1970-01-01');
      });
      
      console.log(`Found ${history.length} analysis reports for user ${userId}`);
      return history;
    } catch (error) {
      console.error(`Failed to retrieve analysis history for user ${userId}:`, error);
      throw error;
    }
  }

  async deleteAnalysis(reportId, userId) {
    try {
      console.log(`Deleting analysis report ${reportId} for user ${userId}`);
      
      // 首先检查报告是否存在且属于该用户
      const report = await this.getAnalysis(reportId);
      
      if (!report) {
        throw new Error('Analysis report not found');
      }
      
      if (report.userId !== userId.toString()) {
        throw new Error('Access denied: Report does not belong to this user');
      }
      
      // 删除报告
      await this.dynamoDB.send(new DeleteItemCommand({
        TableName: config.DYNAMODB_TABLE,
        Key: { reportId: { S: reportId } }
      }));
      
      console.log(`Successfully deleted analysis report ${reportId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete analysis report ${reportId}:`, error);
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
      let categoryFilter = '';
      if (filters?.categories?.length) {
        // 获取所有选定类别及其子类别的ID
        const [categoryRows] = await connection.execute(`
          WITH selected_categories AS (
            -- 直接匹配选定的类别
            SELECT category_id FROM product_categories 
            WHERE category_name IN (${filters.categories.map(() => '?').join(', ')})
            UNION
            -- 匹配选定类别的所有子类别
            SELECT c.category_id FROM product_categories c
            JOIN product_categories p ON c.parent_category_id = p.category_id
            WHERE p.category_name IN (${filters.categories.map(() => '?').join(', ')})
          )
          SELECT category_id FROM selected_categories
        `, [...filters.categories, ...filters.categories]);
        
        if (categoryRows.length > 0) {
          const categoryIds = categoryRows.map(row => row.category_id);
          categoryFilter = `p.category_id IN (${categoryIds.map(() => '?').join(', ')})`;
          queryParams.push(...categoryIds);
          whereClauses.push(categoryFilter);
        }
      }
      
      if (filters?.channels?.length) {
        whereClauses.push(`o.order_source IN (${filters.channels.map(() => '?').join(', ')})`);
        queryParams.push(...filters.channels);
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
        max_tokens_to_sample: 8000,
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

  async callBedrockStream(prompt, modelId = config.DEFAULT_MODEL_ID, responseCallback, options = {}) {
    try {
      console.log(`Using model ID: ${modelId}`);
      console.log(`AWS Region: ${config.AWS_REGION}`);
      
      // 创建 Bedrock 客户端 - 使用本地 AWS 凭证
      const client = new BedrockRuntimeClient({ 
        region: config.AWS_REGION
        // 无需显式提供凭证，SDK 会自动从 ~/.aws/credentials 加载
      });

      // 检查模型ID
      if (modelId.includes('claude')) {
        // Claude 3 模型使用 ConverseStream API
        console.log('Using ConverseStream API for Claude model');
        
        // 根据enableThinking选项设置参数
        const enableThinking = options.enableThinking || false;
        console.log(`Thinking mode: ${enableThinking ? 'enabled' : 'disabled'}`);
        
        // 构建 ConverseStream 请求
        const input = {
          modelId: modelId,
          messages: [
            {
              role: "user",
              content: [
                {
                  text: prompt
                }
              ]
            }
          ],
          inferenceConfig: {
            temperature: enableThinking ? 1 : 0.7,
            maxTokens: enableThinking ? 16000 : 8000
          }
        };
        
        // 仅当启用思考模式时添加reasoning_config
        if (enableThinking) {
          input.additionalModelRequestFields = {
            reasoning_config: {
              type: "enabled",
              budget_tokens: 4096
            }
          };
        }
        
        console.log('ConverseStream input:', JSON.stringify(input, null, 2));
        
        let command;
        try {
          // 创建命令
          command = new ConverseStreamCommand(input);
          console.log('ConverseStream command created successfully');
        } catch (cmdError) {
          console.error('Error creating ConverseStream command:', cmdError);
          throw cmdError;
        }
        
        console.log('Sending ConverseStream command...');
        
        // 处理流式响应
        const response = await client.send(command);
        
        let fullResponse = '';
        let currentMessageContent = '';
        let reasoningContent = '';
        let allResponse = { content: '', reasoning: '' }; // 新增：记录完整的LLM响应
        
        // 处理流式响应事件
        for await (const event of response.stream) {
          if (event.contentBlockDelta && event.contentBlockDelta.delta) {
            // 处理主要内容
            if (event.contentBlockDelta.delta.text) {
              const textChunk = event.contentBlockDelta.delta.text;
              fullResponse += textChunk;
              currentMessageContent += textChunk;
              allResponse.content += textChunk; // 记录主要内容
              
              // 使用回调通知前端有新内容
              if (responseCallback) {
                responseCallback({
                  type: 'content_chunk',
                  chunk: textChunk,
                  contentSoFar: currentMessageContent
                });
              }
            }
            
            // 处理reasoning内容
            if (event.contentBlockDelta.delta.reasoningContent && 
                event.contentBlockDelta.delta.reasoningContent.text) {
              const reasoningChunk = event.contentBlockDelta.delta.reasoningContent.text;
              reasoningContent += reasoningChunk;
              allResponse.reasoning += reasoningChunk; // 记录reasoning内容
              
              // 通知前端有新的reasoning内容
              if (responseCallback) {
                responseCallback({
                  type: 'reasoning_chunk',
                  chunk: reasoningChunk,
                  reasoningSoFar: reasoningContent
                });
              }
            }
          } else if (event.messageStop) {
            // 输出完整响应到控制台
            console.log('All LLM Response:', allResponse);
            
            // 消息结束时通知
            if (responseCallback) {
              responseCallback({
                type: 'message_complete',
                stopReason: event.messageStop.stopReason,
                fullContent: fullResponse,
                fullReasoning: reasoningContent
              });
            }
          } else if (event.metadata) {
            // 发送元数据信息
            if (responseCallback && event.metadata.usage) {
              responseCallback({
                type: 'metadata',
                usage: event.metadata.usage
              });
            }
          }
        }
        
        // 提取<output>标签中的内容
        try {
          console.log('Full response from Bedrock:', fullResponse);
          
          // 提取<output>标签中的内容
          const outputMatch = fullResponse.match(/<output>([\s\S]*?)<\/output>/);
          if (outputMatch) {
            const markdownContent = outputMatch[1].trim();
            console.log('Successfully extracted markdown content from <output> tags');
            
            // 返回包含markdown内容的对象
            return {
              markdownContent: markdownContent,
              // 保留原始响应以便调试
              rawResponse: fullResponse
            };
          }
          
          // 如果没有找到<output>标签，尝试直接使用全部内容作为markdown
          console.log('No <output> tags found, using full response as markdown');
          return {
            markdownContent: fullResponse,
            rawResponse: fullResponse
          };
        } catch (e) {
          console.error('Error in response processing:', e);
          // 发生任何错误时，返回一个错误对象
          return {
            markdownContent: "处理AI响应时发生错误: " + e.message,
            rawResponse: fullResponse
          };
        }
      } else if (modelId.includes('deepseek')) {
        // DeepSeek R1 模型使用 ConverseStream API，但有不同的参数
        console.log('Using ConverseStream API for DeepSeek model');
        
        // DeepSeek R1 模型不支持Thinking选项，但会有reasoning输出
        // 构建 ConverseStream 请求
        const input = {
          modelId: modelId,
          messages: [
            {
              role: "user",
              content: [
                {
                  text: prompt
                }
              ]
            }
          ],
          inferenceConfig: {
            temperature: 1,
            maxTokens: 16000
          }
          // DeepSeek R1 不需要additionalModelRequestFields
        };
        
        console.log('ConverseStream input:', JSON.stringify(input, null, 2));
        
        let command;
        try {
          // 创建命令
          command = new ConverseStreamCommand(input);
          console.log('ConverseStream command created successfully');
        } catch (cmdError) {
          console.error('Error creating ConverseStream command:', cmdError);
          throw cmdError;
        }
        
        console.log('Sending ConverseStream command...');
        
        // 处理流式响应
        const response = await client.send(command);
        
        let fullResponse = '';
        let currentMessageContent = '';
        let reasoningContent = '';
        let allResponse = { content: '', reasoning: '' }; // 新增：记录完整的LLM响应
        
        // 处理流式响应事件
        for await (const event of response.stream) {
          if (event.contentBlockDelta && event.contentBlockDelta.delta) {
            // 处理主要内容
            if (event.contentBlockDelta.delta.text) {
              const textChunk = event.contentBlockDelta.delta.text;
              fullResponse += textChunk;
              currentMessageContent += textChunk;
              allResponse.content += textChunk; // 记录主要内容
              
              // 使用回调通知前端有新内容
              if (responseCallback) {
                responseCallback({
                  type: 'content_chunk',
                  chunk: textChunk,
                  contentSoFar: currentMessageContent
                });
              }
            }
            
            // 处理reasoning内容
            if (event.contentBlockDelta.delta.reasoningContent && 
                event.contentBlockDelta.delta.reasoningContent.text) {
              const reasoningChunk = event.contentBlockDelta.delta.reasoningContent.text;
              reasoningContent += reasoningChunk;
              allResponse.reasoning += reasoningChunk; // 记录reasoning内容
              
              // 通知前端有新的reasoning内容
              if (responseCallback) {
                responseCallback({
                  type: 'reasoning_chunk',
                  chunk: reasoningChunk,
                  reasoningSoFar: reasoningContent
                });
              }
            }
          } else if (event.messageStop) {
            // 输出完整响应到控制台
            console.log('All LLM Response:', allResponse);
            
            // 消息结束时通知
            if (responseCallback) {
              responseCallback({
                type: 'message_complete',
                stopReason: event.messageStop.stopReason,
                fullContent: fullResponse,
                fullReasoning: reasoningContent
              });
            }
          } else if (event.metadata) {
            // 发送元数据信息
            if (responseCallback && event.metadata.usage) {
              responseCallback({
                type: 'metadata',
                usage: event.metadata.usage
              });
            }
          }
        }
        
          // 提取<output>标签中的内容
          try {
            console.log('Full response from Bedrock:', fullResponse);
            
            // 提取<output>标签中的内容
            const outputMatch = fullResponse.match(/<output>([\s\S]*?)<\/output>/);
            if (outputMatch) {
              const markdownContent = outputMatch[1].trim();
              console.log('Successfully extracted markdown content from <output> tags');
              
              // 返回包含markdown内容的对象
              return {
                markdownContent: markdownContent,
                // 保留原始响应以便调试
                rawResponse: fullResponse
              };
            }
            
            // 如果没有找到<output>标签，尝试直接使用全部内容作为markdown
            console.log('No <output> tags found, using full response as markdown');
            return {
              markdownContent: fullResponse,
              rawResponse: fullResponse
            };
          } catch (e) {
            console.error('Error in response processing:', e);
            // 发生任何错误时，返回一个错误对象
            return {
              markdownContent: "处理AI响应时发生错误: " + e.message,
              rawResponse: fullResponse
            };
          }
      } else {
        // 非Claude 3模型使用传统的InvokeModel API
        console.log('Using traditional InvokeModel API for non-Claude 3 model');
        return await this.callBedrock(prompt, modelId);
      }
    } catch (error) {
      console.error('Bedrock Stream API call failed:', error);
      throw new Error(`Failed to invoke Bedrock: ${error.message}`);
    }
  }

  generatePrompt(data, queryParams) {
    return `
      你是一位专业的电子商务数据分析师。你将分析从电子商务系统导出的销售数据，进行全面的多维度分析和智能归因分析，以帮助了解销售业绩并识别影响因素。

      ## 分析时间范围
      ${queryParams.timeRange.start} 至 ${queryParams.timeRange.end}

      ## 销售数据
      ${JSON.stringify(data, null, 2)}

      ## 数据结构
      数据包含以下字段：
      - category_name: 产品类别
      - order_source: 订单来源渠道
      - total_sales: 总销售额
      - order_count: 订单数量
      - average_order_value: 平均订单价值

      ## 分析要求
      基于提供的数据，完成以下分析并以清晰、专业的方式呈现结果：

      1.多维度销售分析
        - 销售趋势分析
          - 根据提供的时间范围分析整体销售趋势
          - 计算各类别的同比/环比增长率（如果数据支持）
          - 识别并监控关键销售指标（GMV、订单量、平均订单价值）变化
        - 产品组合分析
          - 计算各类别销售占比，识别核心类别和具有增长潜力的类别
          - 评估各产品类别的生命周期阶段（增长/成熟/衰退）
          - 自动识别畅销产品和滞销产品，提供分析见解
        - 渠道表现分析
          - 比较各渠道的销售贡献和效率
          - 分析各渠道的转化率和平均订单价值差异
          - 评估多渠道协同效应并提供渠道优化建议

      2.智能归因分析
        - 销售波动分析
          - 识别影响销售表现的关键因素
          - 量化各因素的贡献度和影响程度
          - 提供基于数据的解释而非简单预测
        - 多因素相关性分析
          - 分析营销活动与销售增长之间的相关性
          - 评估价格变化对销售量的影响
          - 探索库存水平与销售表现之间的相关性
        - 外部因素考量
          - 考虑季节性对销售的影响
          - 评估天气、假期和其他外部因素的影响
          - 分析潜在竞争活动（如果数据支持）

      ## 输出格式要求
      将内容以markdown格式输出到<output>标签中

      <output>
      ## 执行摘要
      Brief summary of key findings

      ## 多维度销售分析
      1. 销售趋势分析
      - 数据洞察
        - Data-based objective analysis of sales trends
      - 业务解读
        - Explanation of the business meaning behind the data
      - 建议
        - Specific actionable suggestions based on sales trend analysis

      2. 产品组合分析
      - 数据洞察
        - Data-based objective analysis of product portfolio
      - 业务解读
        - Explanation of the business meaning behind the data
      - 建议
        - Specific actionable suggestions based on product portfolio analysis

      3. 渠道表现分析
      - 数据洞察
        - Data-based objective analysis of channel performance
      - 业务解读
        - Explanation of the business meaning behind the data
      - 建议
        - Specific actionable suggestions based on channel performance analysis


      ## 智能归因分析
      1. 销售波动分析
      - 数据洞察
        - Data-based objective analysis of sales fluctuation factors
      - 业务解读
        - Explanation of the business meaning behind the data
      - 建议
        - Specific actionable suggestions based on sales fluctuation analysis

      2. 多因素相关性分析
      - 数据洞察
        - Data-based objective analysis of multi-factor correlations
      - 业务解读
        - Explanation of the business meaning behind the data
      - 建议
        - Specific actionable suggestions based on correlation analysis

      3. 外部因素分析
      - 数据洞察
        - Data-based objective analysis of external factors
      - 业务解读
        - Explanation of the business meaning behind the data
      - 建议
        - Specific actionable suggestions based on external factor analysis

      ## 关键机会
      Summary of growth opportunities worth attention
      </output>

      ## 重要注意事项 
        - 在分析中保持客观性，所有结论均基于数据
        - 关注异常值和重大趋势变化
        - 提供具有实际业务价值的见解，而不仅仅是数据摘要
        - 如果有明显的数据缺口或异常，请指出并提供解决方案
        - 专注于从数字数据中提取可行的业务见解 

      根据上述要求彻底分析销售数据，并按照指定的格式准确呈现你的发现。确保将所有内容放在<output>标签内。
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
