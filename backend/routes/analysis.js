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

// 获取分析结果
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
    // 发送thinking开始事件
    res.write(`data: ${JSON.stringify({type: 'thinking_start'})}\n\n`);
    
    // 查询数据库
    const data = await analysisService.queryData(req.body);
    
    // 发送数据处理进度
    res.write(`data: ${JSON.stringify({
      type: 'thinking_progress',
      message: '正在分析销售数据...',
      progress: 30
    })}\n\n`);
    
    // 准备Bedrock调用
    const prompt = analysisService.generatePrompt(data, req.body);
    
    res.write(`data: ${JSON.stringify({
      type: 'thinking_progress',
      message: '正在生成AI分析...',
      progress: 60
    })}\n\n`);
    
    // 调用Bedrock
    const bedrockResponse = await analysisService.callBedrock(prompt, req.body.modelId);
    
    // 发送thinking结束事件
    res.write(`data: ${JSON.stringify({
      type: 'thinking_end',
      autoCollapse: true
    })}\n\n`);
    
    // 发送最终分析结果
    res.write(`data: ${JSON.stringify({
      type: 'analysis_result',
      result: bedrockResponse
    })}\n\n`);
    
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message
    })}\n\n`);
    res.end();
  }
});

module.exports = router;