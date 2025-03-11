#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pymysql
import random
import argparse
import decimal
from datetime import datetime, timedelta
from faker import Faker

# 初始化Faker
fake = Faker('zh_CN')

# 解析命令行参数
parser = argparse.ArgumentParser(description='生成电商模拟数据')
parser.add_argument('--host', default='localhost', help='数据库主机地址')
parser.add_argument('--user', default='root', help='数据库用户名')
parser.add_argument('--password', default='', help='数据库密码')
parser.add_argument('--database', default='ecommerce', help='数据库名称')
args = parser.parse_args()

# 数据库连接参数
db_config = {
    'host': args.host,
    'user': args.user,
    'password': args.password,
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

# 连接到MySQL
try:
    print("开始执行电商数据模拟...")
    
    # 创建数据库（如果不存在）
    connection = pymysql.connect(
        host=db_config['host'],
        user=db_config['user'],
        password=db_config['password'],
        charset=db_config['charset'],
        cursorclass=db_config['cursorclass']
    )
    
    with connection.cursor() as cursor:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {args.database}")
        print(f"数据库 {args.database} 创建成功或已存在")
    
    connection.close()
    
    # 连接到指定数据库
    db_config['db'] = args.database
    connection = pymysql.connect(**db_config)
    print("成功连接到数据库")
    
    # 创建表结构（如果不存在）
    with connection.cursor() as cursor:
        # 创建产品类别表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS product_categories (
            category_id INT AUTO_INCREMENT PRIMARY KEY,
            category_name VARCHAR(100) NOT NULL,
            category_level INT NOT NULL,
            parent_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """)
        
        # 创建产品表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            product_id INT AUTO_INCREMENT PRIMARY KEY,
            product_name VARCHAR(200) NOT NULL,
            category_id INT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            cost DECIMAL(10, 2) NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES product_categories(category_id)
        )
        """)
        
        # 创建用户表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL,
            email VARCHAR(100) NOT NULL,
            registration_date DATE NOT NULL,
            last_login_date DATE,
            user_source VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """)
        
        # 创建订单表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            order_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            order_date DATETIME NOT NULL,
            order_status VARCHAR(20) NOT NULL,
            payment_method VARCHAR(50),
            order_source VARCHAR(50),
            campaign_id INT,
            total_amount DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
        """)
        
        # 创建订单明细表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            item_id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            discount DECIMAL(10, 2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(order_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id)
        )
        """)
        
        # 创建营销活动表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS marketing_campaigns (
            campaign_id INT AUTO_INCREMENT PRIMARY KEY,
            campaign_name VARCHAR(100) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            budget DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """)
        
        # 创建流量来源表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS traffic_sources (
            source_id INT AUTO_INCREMENT PRIMARY KEY,
            source_name VARCHAR(50) NOT NULL,
            source_type VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """)
        
        # 创建用户行为表
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_behaviors (
            behavior_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            product_id INT,
            behavior_type VARCHAR(20) NOT NULL,
            behavior_date DATETIME NOT NULL,
            source_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id),
            FOREIGN KEY (source_id) REFERENCES traffic_sources(source_id)
        )
        """)
    
    # 生成产品类别数据
    categories = [
        # 一级类别
        {"name": "女装", "level": 1, "parent_id": None},
        {"name": "男装", "level": 1, "parent_id": None},
        {"name": "鞋靴", "level": 1, "parent_id": None},
        {"name": "箱包", "level": 1, "parent_id": None},
        {"name": "配饰", "level": 1, "parent_id": None},
        {"name": "美妆", "level": 1, "parent_id": None},
        {"name": "家居", "level": 1, "parent_id": None},
    ]
    
    # 二级类别
    subcategories = {
        "女装": ["连衣裙", "T恤", "衬衫", "裤子", "外套"],
        "男装": ["T恤", "衬衫", "裤子", "外套"],
        "鞋靴": ["女鞋", "男鞋", "运动鞋", "靴子"],
        "箱包": ["女包", "男包", "旅行箱"],
        "配饰": ["首饰", "手表", "眼镜", "帽子"],
        "美妆": ["护肤", "彩妆", "香水"],
        "家居": ["床品", "家具", "装饰品"]
    }
    
    with connection.cursor() as cursor:
        # 插入一级类别
        category_id_map = {}
        for category in categories:
            cursor.execute(
                "INSERT INTO product_categories (category_name, category_level, parent_id) VALUES (%s, %s, %s)",
                (category["name"], category["level"], category["parent_id"])
            )
            category_id_map[category["name"]] = cursor.lastrowid
        
        # 插入二级类别
        for parent_name, subcats in subcategories.items():
            parent_id = category_id_map[parent_name]
            for subcat in subcats:
                cursor.execute(
                    "INSERT INTO product_categories (category_name, category_level, parent_id) VALUES (%s, %s, %s)",
                    (subcat, 2, parent_id)
                )
        
        connection.commit()
        print(f"已插入 {len(categories) + sum(len(subcats) for subcats in subcategories.values())} 个产品类别")
    
    # 获取所有类别ID
    with connection.cursor() as cursor:
        cursor.execute("SELECT category_id, category_name, category_level FROM product_categories")
        all_categories = cursor.fetchall()
        level2_categories = [cat for cat in all_categories if cat['category_level'] == 2]
    
    # 生成产品数据
    products = []
    for _ in range(200 + random.randint(0, 100)):
        category = random.choice(level2_categories)
        price = round(random.uniform(49.9, 999.9), 2)
        cost = round(price * random.uniform(0.4, 0.7), 2)
        
        product = {
            "product_name": fake.word() + fake.word() + random.choice(["", "系列", "款", "新品"]),
            "category_id": category['category_id'],
            "price": price,
            "cost": cost,
            "description": fake.paragraph()
        }
        products.append(product)
    
    with connection.cursor() as cursor:
        for product in products:
            cursor.execute(
                "INSERT INTO products (product_name, category_id, price, cost, description) VALUES (%s, %s, %s, %s, %s)",
                (product["product_name"], product["category_id"], product["price"], product["cost"], product["description"])
            )
        
        connection.commit()
        print(f"已插入 {len(products)} 个产品")
    
    # 生成用户数据
    users = []
    user_sources = ["直接访问", "搜索引擎", "社交媒体", "广告", "推荐"]
    
    for _ in range(3000):
        registration_date = fake.date_between(start_date="-3y", end_date="today")
        last_login_date = fake.date_between(start_date=registration_date, end_date="today") if random.random() > 0.1 else None
        
        user = {
            "username": fake.user_name(),
            "email": fake.email(),
            "registration_date": registration_date,
            "last_login_date": last_login_date,
            "user_source": random.choice(user_sources)
        }
        users.append(user)
    
    with connection.cursor() as cursor:
        for user in users:
            cursor.execute(
                "INSERT INTO users (username, email, registration_date, last_login_date, user_source) VALUES (%s, %s, %s, %s, %s)",
                (user["username"], user["email"], user["registration_date"], user["last_login_date"], user["user_source"])
            )
        
        connection.commit()
        print(f"已插入 {len(users)} 个用户")
    
    # 生成营销活动数据
    campaigns = []
    campaign_names = ["春节大促", "618购物节", "双11狂欢", "双12年终盛典", "新年特惠", "情人节专场", "暑期大促", "开学季"]
    
    start_date = datetime.now() - timedelta(days=365*2)
    for name in campaign_names:
        end_date = start_date + timedelta(days=random.randint(7, 14))
        budget = round(random.uniform(10000, 50000), 2)
        
        campaign = {
            "campaign_name": name,
            "start_date": start_date,
            "end_date": end_date,
            "budget": budget
        }
        campaigns.append(campaign)
        
        # 下一个活动的开始日期
        start_date = end_date + timedelta(days=random.randint(30, 60))
    
    with connection.cursor() as cursor:
        for campaign in campaigns:
            cursor.execute(
                "INSERT INTO marketing_campaigns (campaign_name, start_date, end_date, budget) VALUES (%s, %s, %s, %s)",
                (campaign["campaign_name"], campaign["start_date"], campaign["end_date"], campaign["budget"])
            )
        
        connection.commit()
        print(f"已插入 {len(campaigns)} 个营销活动")
    
    # 生成流量来源数据
    traffic_sources = [
        {"name": "百度", "type": "搜索引擎"},
        {"name": "Google", "type": "搜索引擎"},
        {"name": "微信", "type": "社交媒体"},
        {"name": "微博", "type": "社交媒体"},
        {"name": "抖音", "type": "社交媒体"},
        {"name": "小红书", "type": "社交媒体"},
        {"name": "直接访问", "type": "直接"},
        {"name": "电子邮件", "type": "营销"},
        {"name": "联盟广告", "type": "广告"},
        {"name": "信息流广告", "type": "广告"},
        {"name": "朋友推荐", "type": "推荐"},
        {"name": "App", "type": "应用"},
        {"name": "其他", "type": "其他"},
        {"name": "天猫", "type": "电商平台"},
        {"name": "京东", "type": "电商平台"}
    ]
    
    with connection.cursor() as cursor:
        for source in traffic_sources:
            cursor.execute(
                "INSERT INTO traffic_sources (source_name, source_type) VALUES (%s, %s)",
                (source["name"], source["type"])
            )
        
        connection.commit()
        print(f"已插入 {len(traffic_sources)} 个流量来源")
    
    # 获取所有用户ID
    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id FROM users")
        user_ids = [row['user_id'] for row in cursor.fetchall()]
    
    # 获取所有产品ID和价格
    with connection.cursor() as cursor:
        cursor.execute("SELECT product_id, price FROM products")
        product_data = cursor.fetchall()
        product_ids = [row['product_id'] for row in product_data]
        product_prices = {row['product_id']: row['price'] for row in product_data}
    
    # 获取所有营销活动ID
    with connection.cursor() as cursor:
        cursor.execute("SELECT campaign_id, start_date, end_date FROM marketing_campaigns")
        campaign_data = cursor.fetchall()
    
    # 获取所有流量来源ID
    with connection.cursor() as cursor:
        cursor.execute("SELECT source_id, source_name FROM traffic_sources")
        source_data = cursor.fetchall()
        source_ids = [row['source_id'] for row in source_data]
        source_names = {row['source_id']: row['source_name'] for row in source_data}
    
    # 生成订单和订单明细数据
    order_sources = ["PC网站", "移动网站", "iOS App", "Android App", "微信小程序", "天猫", "京东"]
    payment_methods = ["支付宝", "微信支付", "银行卡", "货到付款", "花呗", "京东白条"]
    order_statuses = ["已完成", "已取消", "已退款", "处理中"]
    
    # 按月生成订单，确保数据分布合理
    start_date = datetime.now() - timedelta(days=365*2)
    end_date = datetime.now()
    current_date = start_date
    
    orders = []
    order_items = []
    
    # 获取活动日期范围
    campaign_periods = []
    for campaign in campaign_data:
        campaign_periods.append({
            'campaign_id': campaign['campaign_id'],
            'start_date': campaign['start_date'],
            'end_date': campaign['end_date']
        })
    
    while current_date <= end_date:
        # 每月订单数量，随机波动
        month_orders_count = random.randint(800, 1200)
        
        # 判断是否在活动期间，如果是则增加订单量
        in_campaign = False
        campaign_id = None
        for period in campaign_periods:
            if period['start_date'] <= current_date.date() <= period['end_date']:
                in_campaign = True
                campaign_id = period['campaign_id']
                # 活动期间订单量提升
                month_orders_count = int(month_orders_count * random.uniform(1.5, 2.5))
                break
        
        # 生成当月订单
        for _ in range(month_orders_count):
            user_id = random.choice(user_ids)
            order_date = fake.date_time_between(
                start_date=current_date,
                end_date=current_date + timedelta(days=30)
            )
            
            # 如果在活动期间，大部分订单关联到活动
            if in_campaign and random.random() < 0.8:
                order_campaign_id = campaign_id
            else:
                order_campaign_id = None
            
            # 订单来源，如果在活动期间，更可能来自特定渠道
            if in_campaign:
                order_source = random.choices(
                    order_sources,
                    weights=[0.15, 0.25, 0.2, 0.2, 0.1, 0.05, 0.05],
                    k=1
                )[0]
            else:
                order_source = random.choice(order_sources)
            
            # 创建订单
            order = {
                "user_id": user_id,
                "order_date": order_date,
                "order_status": random.choices(
                    order_statuses,
                    weights=[0.85, 0.08, 0.05, 0.02],
                    k=1
                )[0],
                "payment_method": random.choice(payment_methods),
                "order_source": order_source,
                "campaign_id": order_campaign_id,
                "total_amount": 0  # 将在添加订单项后更新
            }
            
            # 为订单添加1-5个商品
            items_count = random.choices([1, 2, 3, 4, 5], weights=[0.3, 0.3, 0.2, 0.15, 0.05], k=1)[0]
            order_total = decimal.Decimal('0.00')
            
            order_items_list = []
            selected_products = random.sample(product_ids, items_count)
            
            for product_id in selected_products:
                price = product_prices[product_id]
                quantity = random.choices([1, 2, 3], weights=[0.7, 0.2, 0.1], k=1)[0]
                
                # 如果在活动期间，可能有折扣
                if in_campaign and random.random() < 0.7:
                    discount = decimal.Decimal(str(round(price * random.uniform(0.05, 0.3), 2)))
                else:
                    discount = decimal.Decimal('0.00')
                
                item_total = (price - discount) * quantity
                order_total += item_total
                
                order_items_list.append({
                    "product_id": product_id,
                    "quantity": quantity,
                    "price": price,
                    "discount": discount
                })
            
            order["total_amount"] = order_total
            orders.append((order, order_items_list))
        
        # 移动到下个月
        current_date += timedelta(days=30)
    
    # 批量插入订单和订单明细
    with connection.cursor() as cursor:
        for order, items in orders:
            # 插入订单
            cursor.execute(
                """
                INSERT INTO orders 
                (user_id, order_date, order_status, payment_method, order_source, campaign_id, total_amount) 
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    order["user_id"], 
                    order["order_date"], 
                    order["order_status"], 
                    order["payment_method"], 
                    order["order_source"], 
                    order["campaign_id"], 
                    order["total_amount"]
                )
            )
            
            order_id = cursor.lastrowid
            
            # 插入订单明细
            for item in items:
                cursor.execute(
                    """
                    INSERT INTO order_items 
                    (order_id, product_id, quantity, price, discount) 
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        order_id, 
                        item["product_id"], 
                        item["quantity"], 
                        item["price"], 
                        item["discount"]
                    )
                )
            
            # 每1000个订单提交一次，避免事务过大
            if order_id % 1000 == 0:
                connection.commit()
        
        # 最后提交剩余事务
        connection.commit()
        print(f"已插入 {len(orders)} 个订单和相关订单明细")
    
    # 生成用户行为数据
    behavior_types = ["浏览", "加入购物车", "收藏", "购买", "评价"]
    
    # 获取所有订单信息，用于生成购买行为
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT o.order_id, o.user_id, oi.product_id, o.order_date 
            FROM orders o 
            JOIN order_items oi ON o.order_id = oi.order_id
            WHERE o.order_status = '已完成'
        """)
        purchase_data = cursor.fetchall()
    
    # 为每个用户生成浏览、加入购物车、收藏行为
    behaviors = []
    
    # 首先添加所有购买行为
    for purchase in purchase_data:
        behavior = {
            "user_id": purchase["user_id"],
            "product_id": purchase["product_id"],
            "behavior_type": "购买",
            "behavior_date": purchase["order_date"],
            "source_id": random.choice(source_ids)
        }
        behaviors.append(behavior)
    
    # 然后为每个用户添加其他行为
    for user_id in user_ids:
        # 每个用户生成10-50个行为
        behavior_count = random.randint(10, 50)
        
        for _ in range(behavior_count):
            product_id = random.choice(product_ids)
            behavior_type = random.choices(
                behavior_types[:3],  # 只选择浏览、加入购物车、收藏
                weights=[0.7, 0.2, 0.1],
                k=1
            )[0]
            
            behavior_date = fake.date_time_between(start_date="-2y", end_date="now")
            
            behavior = {
                "user_id": user_id,
                "product_id": product_id,
                "behavior_type": behavior_type,
                "behavior_date": behavior_date,
                "source_id": random.choice(source_ids)
            }
            behaviors.append(behavior)
    
    # 添加评价行为（基于购买）
    for purchase in purchase_data:
        # 只有部分购买会有评价
        if random.random() < 0.3:
            # 评价通常在购买后1-14天
            days_after = random.randint(1, 14)
            review_date = purchase["order_date"] + timedelta(days=days_after)
            
            behavior = {
                "user_id": purchase["user_id"],
                "product_id": purchase["product_id"],
                "behavior_type": "评价",
                "behavior_date": review_date,
                "source_id": None  # 评价没有来源
            }
            behaviors.append(behavior)
    
    # 批量插入用户行为
    with connection.cursor() as cursor:
        for i, behavior in enumerate(behaviors):
            cursor.execute(
                """
                INSERT INTO user_behaviors 
                (user_id, product_id, behavior_type, behavior_date, source_id) 
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    behavior["user_id"],
                    behavior["product_id"],
                    behavior["behavior_type"],
                    behavior["behavior_date"],
                    behavior["source_id"]
                )
            )
            
            # 每10000条提交一次
            if (i + 1) % 10000 == 0:
                connection.commit()
                print(f"已插入 {i + 1}/{len(behaviors)} 条用户行为数据")
        
        # 提交剩余事务
        connection.commit()
        print(f"已插入 {len(behaviors)} 条用户行为数据")
    
    print("数据生成完成！")

except Exception as e:
    print(f"发生错误: {e}")
finally:
    if connection:
        connection.close()
        print("数据库连接已关闭")