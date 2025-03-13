const express = require('express');
const router = express.Router();
const analysisService = require('../services/analysisService');
const { authenticateJWT } = require('../middleware/auth');

// 所有路由需要JWT认证
router.use(authenticateJWT);

// 创建新的分析任务
router.post('/create', async (req, res, next) => {
  try {
    const { timeRange, dimensions, metrics, filters, compareWith } = req.body;
    
    // 参数验证
    if (!timeRange || !timeRange.start || !timeRange.end) {
      return res.status(400).json({ error: 'Invalid time range parameters' });
    }
    
    const result = await analysisService.createAnalysis(req.user.id, req.body);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

// 获取历史分析列表
router.get('/history', async (req, res, next) => {
  try {
    const history = await analysisService.getAnalysisHistory(req.user.id);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// 删除分析报告
router.delete('/:reportId', async (req, res, next) => {
  try {
    const { reportId } = req.params;
    await analysisService.deleteAnalysis(reportId, req.user.id);
    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// 流式分析API
router.post('/stream', async (req, res, next) => {
  // 设置SSE头部
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    console.log('POST /stream API called with body:', JSON.stringify(req.body, null, 2));
    
    // 发送thinking开始事件
    res.write(`data: ${JSON.stringify({type: 'thinking_start'})}\n\n`);
    
    try {
      // 查询数据库
      const data = await analysisService.queryData(req.body);
      console.log('Database query successful, data length:', data.length);
      
      // 准备Bedrock调用
      const prompt = analysisService.generatePrompt(data, req.body);
      console.log('Generated prompt length:', prompt.length);
      
      // 创建一个回调函数处理流式响应
      let accumulatedChunk = '';
      
      const streamCallback = (event) => {
        switch(event.type) {
          case 'content_chunk':
            // 检查内容块是否包含<output>标签
            const outputMatch = event.chunk && event.chunk.match(/<output>([\s\S]*?)<\/output>/);
            if (outputMatch) {
              // 如果包含<output>标签，直接发送标签内的内容
              res.write(`data: ${JSON.stringify({
                type: 'thinking_progress',
                message: outputMatch[1],
                progress: 80,
                isReasoning: false
              })}\n\n`);
            } else {
              // 否则发送原始内容块
              res.write(`data: ${JSON.stringify({
                type: 'thinking_progress',
                message: event.chunk,
                progress: 80,
                isReasoning: false
              })}\n\n`);
            }
            break;
            
          // 处理reasoning内容
          case 'reasoning_chunk':
            res.write(`data: ${JSON.stringify({
              type: 'thinking_progress',
              message: event.chunk,
              progress: 80,
              isReasoning: true
            })}\n\n`);
            break;
            
          case 'message_complete':
            // 发送任何剩余的累积内容
            if (accumulatedChunk.trim()) {
              res.write(`data: ${JSON.stringify({
                type: 'thinking_progress',
                message: accumulatedChunk.trim(),
                progress: 80,
                isReasoning: false
              })}\n\n`);
              accumulatedChunk = '';
            }
            
            // 发送thinking结束事件
            res.write(`data: ${JSON.stringify({
              type: 'thinking_end',
              autoCollapse: true
            })}\n\n`);
            
            // 发送最终分析结果
            try {
              // 处理返回的结果，现在应该是包含markdownContent的对象
              let resultContent = event.fullContent;
              
              // 创建一个临时的reportId用于存储结果
              const tempReportId = `temp-${Date.now()}`;
              
              // 保存分析结果到DynamoDB，包括reasoning内容
              analysisService.updateAnalysisResults(tempReportId, data, resultContent, event.fullReasoning)
                .then(saved => {
                  console.log(`Analysis results ${saved ? 'saved to' : 'not saved to'} DynamoDB`);
                })
                .catch(err => {
                  console.error('Error saving analysis results:', err);
                });
              
              // 发送结果到客户端
              res.write(`data: ${JSON.stringify({
                type: 'analysis_result',
                result: resultContent
              })}\n\n`);
            } catch (jsonError) {
              console.error('Error processing analysis result:', jsonError);
              res.write(`data: ${JSON.stringify({
                type: 'error',
                message: '处理分析结果时出错'
              })}\n\n`);
            }
            
            res.end();
            break;
            
          case 'metadata':
            // 可以发送模型使用统计信息
            console.log('Metadata received:', event.usage);
            break;
        }
      };
      
      console.log('Calling Bedrock Stream API with model ID:', req.body.modelId);
      console.log('Enable thinking:', req.body.enableThinking);
      
      // 调用Bedrock流式API，传递enableThinking参数
      await analysisService.callBedrockStream(prompt, req.body.modelId, streamCallback, {
        enableThinking: req.body.enableThinking
      });
      
    } catch (innerError) {
      console.error('Inner error in stream API:', innerError);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: `Inner error: ${innerError.message}`
      })}\n\n`);
      res.end();
    }
    
  } catch (error) {
    console.error('Stream API error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message
    })}\n\n`);
    res.end();
  }
});

// 支持GET请求的流式分析API (用于EventSource)
router.get('/stream', authenticateJWT, async (req, res, next) => {
  // 设置SSE头部
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    console.log('GET /stream API called with query params:', req.query);
    
    // 从查询参数中获取分析参数
    const params = req.query.params ? JSON.parse(decodeURIComponent(req.query.params)) : {};
    console.log('Parsed params:', JSON.stringify(params, null, 2));
    
    // 发送thinking开始事件
    res.write(`data: ${JSON.stringify({type: 'thinking_start'})}\n\n`);
    
    try {
      // 查询数据库
      const data = await analysisService.queryData(params);
      console.log('Database query successful, data length:', data.length);
      
      // 准备Bedrock调用
      const prompt = analysisService.generatePrompt(data, params);
      console.log('Generated prompt length:', prompt.length);
      
      // 创建一个回调函数处理流式响应
      let accumulatedChunk = '';
      
      const streamCallback = (event) => {
        switch(event.type) {
          case 'content_chunk':
            // 检查内容块是否包含<output>标签
            const outputMatch = event.chunk && event.chunk.match(/<output>([\s\S]*?)<\/output>/);
            if (outputMatch) {
              // 如果包含<output>标签，直接发送标签内的内容
              res.write(`data: ${JSON.stringify({
                type: 'thinking_progress',
                message: outputMatch[1],
                progress: 80,
                isReasoning: false
              })}\n\n`);
            } else {
              // 否则发送原始内容块
              res.write(`data: ${JSON.stringify({
                type: 'thinking_progress',
                message: event.chunk,
                progress: 80,
                isReasoning: false
              })}\n\n`);
            }
            break;
            
          // 处理reasoning内容
          case 'reasoning_chunk':
            res.write(`data: ${JSON.stringify({
              type: 'thinking_progress',
              message: event.chunk,
              progress: 80,
              isReasoning: true
            })}\n\n`);
            break;
            
          case 'message_complete':
            // 发送任何剩余的累积内容
            if (accumulatedChunk.trim()) {
              res.write(`data: ${JSON.stringify({
                type: 'thinking_progress',
                message: accumulatedChunk.trim(),
                progress: 80,
                isReasoning: false
              })}\n\n`);
              accumulatedChunk = '';
            }
            
            // 发送thinking结束事件
            res.write(`data: ${JSON.stringify({
              type: 'thinking_end',
              autoCollapse: true
            })}\n\n`);
            
            // 发送最终分析结果
            try {
              // 处理返回的结果，现在应该是包含markdownContent的对象
              let resultContent = event.fullContent;
              
              // 创建一个临时的reportId用于存储结果
              const tempReportId = `temp-${Date.now()}`;
              
              // 保存分析结果到DynamoDB，包括reasoning内容
              analysisService.updateAnalysisResults(tempReportId, data, resultContent, event.fullReasoning)
                .then(saved => {
                  console.log(`Analysis results ${saved ? 'saved to' : 'not saved to'} DynamoDB`);
                })
                .catch(err => {
                  console.error('Error saving analysis results:', err);
                });
              
              // 发送结果到客户端
              res.write(`data: ${JSON.stringify({
                type: 'analysis_result',
                result: resultContent
              })}\n\n`);
            } catch (jsonError) {
              console.error('Error processing analysis result:', jsonError);
              res.write(`data: ${JSON.stringify({
                type: 'error',
                message: '处理分析结果时出错'
              })}\n\n`);
            }
            
            res.end();
            break;
            
          case 'metadata':
            // 可以发送模型使用统计信息
            console.log('Metadata received:', event.usage);
            break;
        }
      };
      
      console.log('Calling Bedrock Stream API with model ID:', params.modelId);
      console.log('Enable thinking:', params.enableThinking);
      
      // 调用Bedrock流式API，传递enableThinking参数
      await analysisService.callBedrockStream(prompt, params.modelId, streamCallback, {
        enableThinking: params.enableThinking
      });
      
    } catch (innerError) {
      console.error('Inner error in stream API:', innerError);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: `Inner error: ${innerError.message}`
      })}\n\n`);
      res.end();
    }
    
  } catch (error) {
    console.error('Stream API error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message
    })}\n\n`);
    res.end();
  }
});

// 获取分析结果 - 放在最后，避免与其他路由冲突
router.get('/:reportId', async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const result = await analysisService.getAnalysis(reportId);
    
    // 检查是否是该用户的报告
    if (result.userId !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
