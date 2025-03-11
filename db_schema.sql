-- 创建电商分析数据库
CREATE DATABASE IF NOT EXISTS ecommerce;
USE ecommerce;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    gender VARCHAR(10),
    age INT,
    city VARCHAR(50),
    country VARCHAR(50),
    registration_date DATE,
    user_level VARCHAR(20),
    is_active BOOLEAN,
    user_source VARCHAR(50)
);

-- 商品分类表
CREATE TABLE IF NOT EXISTS product_categories (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(100),
    parent_category_id INT NULL,
    category_level INT,
    is_active BOOLEAN,
    FOREIGN KEY (parent_category_id) REFERENCES product_categories(category_id)
);

-- 商品表
CREATE TABLE IF NOT EXISTS products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(200),
    category_id INT,
    brand VARCHAR(100),
    supplier VARCHAR(100),
    original_price DECIMAL(10, 2),
    current_price DECIMAL(10, 2),
    cost DECIMAL(10, 2),
    stock_quantity INT,
    create_time DATE,
    is_active BOOLEAN,
    FOREIGN KEY (category_id) REFERENCES product_categories(category_id)
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    order_id INT PRIMARY KEY,
    user_id INT,
    order_date TIMESTAMP,
    total_amount DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    payment_status VARCHAR(20),
    shipping_address VARCHAR(200),
    order_status VARCHAR(20),
    order_source VARCHAR(50),
    device_type VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 订单详情表
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    unit_price DECIMAL(10, 2),
    discount DECIMAL(10, 2),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- 营销活动表
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    campaign_id INT PRIMARY KEY,
    campaign_name VARCHAR(100),
    campaign_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10, 2),
    target_audience VARCHAR(100),
    discount_type VARCHAR(50),
    discount_value DECIMAL(10, 2),
    is_active BOOLEAN
);

-- 订单营销关联表
CREATE TABLE IF NOT EXISTS order_campaign_map (
    id INT PRIMARY KEY,
    order_id INT,
    campaign_id INT,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(campaign_id)
);

-- 访问日志表
CREATE TABLE IF NOT EXISTS visit_logs (
    log_id INT PRIMARY KEY,
    user_id INT NULL,
    session_id VARCHAR(100),
    page_url VARCHAR(200),
    referrer_url VARCHAR(200),
    visit_time TIMESTAMP,
    device_type VARCHAR(50),
    ip_address VARCHAR(50),
    stay_duration INT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 库存记录表
CREATE TABLE IF NOT EXISTS inventory_records (
    record_id INT PRIMARY KEY,
    product_id INT,
    change_date TIMESTAMP,
    quantity_change INT,
    reason VARCHAR(100),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- 价格变动表
CREATE TABLE IF NOT EXISTS price_changes (
    change_id INT PRIMARY KEY,
    product_id INT,
    change_date TIMESTAMP,
    old_price DECIMAL(10, 2),
    new_price DECIMAL(10, 2),
    reason VARCHAR(100),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- 用户行为表
CREATE TABLE IF NOT EXISTS user_behaviors (
    behavior_id INT PRIMARY KEY,
    user_id INT,
    product_id INT,
    behavior_type VARCHAR(50),
    behavior_time TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- 渠道来源表
CREATE TABLE IF NOT EXISTS traffic_sources (
    source_id INT PRIMARY KEY,
    source_name VARCHAR(100),
    source_type VARCHAR(50),
    campaign_id INT NULL,
    FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(campaign_id)
);

-- 退款/退货表
CREATE TABLE IF NOT EXISTS returns (
    return_id INT PRIMARY KEY,
    order_id INT,
    order_item_id INT NULL,
    return_date TIMESTAMP,
    return_reason VARCHAR(200),
    return_status VARCHAR(50),
    refund_amount DECIMAL(10, 2),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id)
);

-- 评价表
CREATE TABLE IF NOT EXISTS reviews (
    review_id INT PRIMARY KEY,
    order_id INT,
    product_id INT,
    user_id INT,
    rating INT,
    comment TEXT,
    review_date TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 平台用户表 (用于Web应用登录)
CREATE TABLE IF NOT EXISTS platform_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'analyst', 'viewer') NOT NULL DEFAULT 'viewer',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 创建默认管理员用户 (密码: password)
INSERT INTO platform_users (username, email, password_hash, full_name, role)
VALUES ('admin', 'admin@example.com', '$2a$10$mR8hMxHZgMqQO/0fYO.NB.mRR1XB4KLh1Q1.Kr.s5GDTQQHQrYg4W', 'Admin User', 'admin');