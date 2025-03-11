const mysql = require('mysql2/promise');
const config = require('../config');

class DataService {
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

  async getCategories() {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT category_id, category_name, parent_category_id, category_level FROM product_categories WHERE is_active = true'
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  async getChannels() {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT DISTINCT order_source FROM orders'
      );
      return rows.map(row => row.order_source);
    } finally {
      connection.release();
    }
  }

  async getCampaigns() {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT campaign_id, campaign_name, campaign_type, start_date, end_date FROM marketing_campaigns'
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  async getDashboardData() {
    const connection = await this.pool.getConnection();
    try {
      // 获取总销售额
      const [totalSales] = await connection.execute(
        'SELECT SUM(total_amount) as total FROM orders WHERE order_status != "Cancelled"'
      );
      
      // 获取总订单数
      const [totalOrders] = await connection.execute(
        'SELECT COUNT(*) as total FROM orders WHERE order_status != "Cancelled"'
      );
      
      // 获取总用户数
      const [totalUsers] = await connection.execute(
        'SELECT COUNT(*) as total FROM users'
      );
      
      // 获取月度销售趋势
      const [monthlySales] = await connection.execute(`
        SELECT 
          DATE_FORMAT(order_date, '%Y-%m') as month,
          SUM(total_amount) as sales
        FROM orders
        WHERE order_status != "Cancelled"
        GROUP BY DATE_FORMAT(order_date, '%Y-%m')
        ORDER BY month
      `);
      
      // 获取类别销售分布
      const [categorySales] = await connection.execute(`
        SELECT 
          pc.category_name,
          SUM(o.total_amount) as sales
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        JOIN product_categories pc ON p.category_id = pc.category_id
        WHERE o.order_status != "Cancelled"
        GROUP BY pc.category_name
        ORDER BY sales DESC
      `);
      
      // 获取渠道销售分布
      const [channelSales] = await connection.execute(`
        SELECT 
          order_source,
          SUM(total_amount) as sales
        FROM orders
        WHERE order_status != "Cancelled"
        GROUP BY order_source
        ORDER BY sales DESC
      `);
      
      return {
        summary: {
          totalSales: totalSales[0].total || 0,
          totalOrders: totalOrders[0].total || 0,
          totalUsers: totalUsers[0].total || 0
        },
        trends: {
          monthlySales
        },
        distribution: {
          categorySales,
          channelSales
        }
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = new DataService();