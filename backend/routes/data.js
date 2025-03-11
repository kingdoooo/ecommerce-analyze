const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');
const { authenticateJWT } = require('../middleware/auth');

// 所有路由需要JWT认证
router.use(authenticateJWT);

// 获取所有产品类别
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await dataService.getCategories();
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// 获取销售渠道
router.get('/channels', async (req, res, next) => {
  try {
    const channels = await dataService.getChannels();
    res.json(channels);
  } catch (error) {
    next(error);
  }
});

// 获取可用指标
router.get('/metrics', async (req, res, next) => {
  try {
    // 返回可用的分析指标
    const metrics = [
      { id: 'sales', name: '销售额', description: '总销售金额' },
      { id: 'orders', name: '订单量', description: '订单总数' },
      { id: 'aov', name: '平均订单价值', description: '平均每单金额' },
      { id: 'units', name: '销售数量', description: '销售商品总数' },
      { id: 'discount', name: '折扣金额', description: '总折扣金额' }
    ];
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

// 获取营销活动
router.get('/campaigns', async (req, res, next) => {
  try {
    const campaigns = await dataService.getCampaigns();
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

// 获取仪表盘概览数据
router.get('/dashboard', async (req, res, next) => {
  try {
    const dashboardData = await dataService.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;