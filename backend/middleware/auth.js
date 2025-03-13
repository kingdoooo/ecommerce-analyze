const jwt = require('jsonwebtoken');
const config = require('../config');

// JWT认证中间件
const authenticateJWT = (req, res, next) => {
  // 尝试从Authorization头获取令牌
  const authHeader = req.headers.authorization;
  
  // 如果头部不存在，检查查询参数
  let token = null;
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    // 支持从查询参数中获取令牌
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is missing' });
  }

  try {
    const user = jwt.verify(token, config.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = {
  authenticateJWT
};
