const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const config = require('../config');

class AuthService {
  constructor() {
    this.pool = mysql.createPool({
      host: config.DB_HOST,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10
    });
  }

  async login(username, password) {
    console.log('Login attempt for user:', username);
    console.log('Database config:', {
      host: config.DB_HOST,
      user: config.DB_USER,
      database: config.DB_NAME
    });

    const connection = await this.pool.getConnection();
    try {
      console.log('Database connection successful');

      // 查找用户
      const [users] = await connection.execute(
        'SELECT id, username, password_hash, role, full_name FROM platform_users WHERE username = ? AND is_active = true',
        [username]
      );

      console.log('Query result:', users.length > 0 ? 'User found' : 'User not found');

      if (users.length === 0) {
        throw new Error('Invalid username or password');
      }

      const user = users[0];

      // 验证密码
      console.log('Comparing password hash');
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      console.log('Comparing password hash');
      if (!isPasswordValid) {
        throw new Error('Invalid username or password');
      }

      // 生成JWT令牌
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      // 更新最后登录时间
      await connection.execute(
        'UPDATE platform_users SET last_login = NOW() WHERE id = ?',
        [user.id]
      );

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.full_name
        }
      };
    } finally {
      connection.release();
    }
  }

  async register(userData) {
    const { username, email, password, fullName, role } = userData;
    const connection = await this.pool.getConnection();

    try {
      // 检查用户名是否已存在
      const [existingUsers] = await connection.execute(
        'SELECT id FROM platform_users WHERE username = ?',
        [username]
      );

      if (existingUsers.length > 0) {
        throw new Error('Username already exists');
      }

      // 检查邮箱是否已存在
      const [existingEmails] = await connection.execute(
        'SELECT id FROM platform_users WHERE email = ?',
        [email]
      );

      if (existingEmails.length > 0) {
        throw new Error('Email already exists');
      }

      // 哈希密码
      const passwordHash = await bcrypt.hash(password, 10);

      // 插入新用户
      const [result] = await connection.execute(
        'INSERT INTO platform_users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
        [username, email, passwordHash, fullName, role]
      );

      return {
        id: result.insertId,
        username,
        email,
        fullName,
        role
      };
    } finally {
      connection.release();
    }
  }

  async getUserProfile(userId) {
    const connection = await this.pool.getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT id, username, email, full_name, role, last_login, created_at FROM platform_users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        lastLogin: user.last_login,
        createdAt: user.created_at
      };
    } finally {
      connection.release();
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    const connection = await this.pool.getConnection();
    try {
      // 获取当前用户信息
      const [users] = await connection.execute(
        'SELECT password_hash FROM platform_users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      // 验证当前密码
      const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid current password');
      }

      // 哈希新密码
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // 更新密码
      await connection.execute(
        'UPDATE platform_users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId]
      );

      return true;
    } finally {
      connection.release();
    }
  }
}

module.exports = new AuthService();