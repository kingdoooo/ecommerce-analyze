const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateJWT } = require('../middleware/auth');

// 用户登录
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const result = await authService.login(username, password);
    res.json(result);
  } catch (error) {
    if (error.message === 'Invalid username or password') {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

// 用户注册 (仅管理员可用)
router.post('/register', authenticateJWT, async (req, res, next) => {
  try {
    // 检查是否是管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can register new users' });
    }
    
    const { username, email, password, fullName, role } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    
    const result = await authService.register({
      username,
      email,
      password,
      fullName,
      role: role || 'viewer'
    });
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

// 获取当前用户信息
router.get('/profile', authenticateJWT, async (req, res, next) => {
  try {
    const profile = await authService.getUserProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// 修改密码
router.put('/change-password', authenticateJWT, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error.message === 'Invalid current password') {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;