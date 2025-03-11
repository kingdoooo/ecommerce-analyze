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
connection = None
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
    
    # 检查表是否存在，如果不存在则创建
    with connection.cursor() as cursor:
        # 检查product_categories表
        cursor.execute("SHOW TABLES LIKE 'product_categories'")
        if not cursor.fetchone():
            print("创建product_categories表")
            cursor.execute("""
            CREATE TABLE product_categories (
                category_id INT NOT NULL PRIMARY KEY,
                category_name VARCHAR(100) NOT NULL,
                category_level INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
            """)
        
        # 检查products表
        cursor.execute("SHOW TABLES LIKE 'products'")
        if not cursor.fetchone():
            print("创建products表")
            cursor.execute("""
            CREATE TABLE products (
                product_id INT NOT NULL PRIMARY KEY,
                product_name VARCHAR(200) DEFAULT NULL,
                category_id INT DEFAULT NULL,
                brand VARCHAR(100) DEFAULT NULL,
                supplier VARCHAR(100) DEFAULT NULL,
                original_price DECIMAL(10, 2) DEFAULT NULL,
                current_price DECIMAL(10, 2) DEFAULT NULL,
                cost DECIMAL(10, 2) DEFAULT NULL,
                stock_quantity INT DEFAULT NULL,
                create_time DATE DEFAULT NULL,
                is_active TINYINT(1) DEFAULT NULL,
                FOREIGN KEY (category_id) REFERENCES product_categories(category_id)
            )
            """)
        
        # 检查users表
        cursor.execute("SHOW TABLES LIKE 'users'")
        if not cursor.fetchone():
            print("创建users表")
            cursor.execute("""
            CREATE TABLE users (
                user_id INT NOT NULL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                email VARCHAR(100) NOT NULL,
                registration_date DATE NOT NULL,
                last_login_date DATE,
                user_source VARCHAR(50)
            )
            """)
        
        # 检查orders表
        cursor.execute("SHOW TABLES LIKE 'orders'")
        if not cursor.fetchone():
            print("创建orders表")
            cursor.execute("""
            CREATE TABLE orders (
                order_id INT NOT NULL PRIMARY KEY,
                user_id INT DEFAULT NULL,
                order_date TIMESTAMP NULL DEFAULT NULL,
                total_amount DECIMAL(10, 2) DEFAULT NULL,
                discount_amount DECIMAL(10, 2) DEFAULT NULL,
                payment_method VARCHAR(50) DEFAULT NULL,
                payment_status VARCHAR(20) DEFAULT NULL,
                shipping_address VARCHAR(200) DEFAULT NULL,
                order_status VARCHAR(20) DEFAULT NULL,
                order_source VARCHAR(50) DEFAULT NULL,
                device_type VARCHAR(20) DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
            """)
        
        # 检查order_items表
        cursor.execute("SHOW TABLES LIKE 'order_items'")
        if not cursor.fetchone():
            print("创建order_items表")
            cursor.execute("""
            CREATE TABLE order_items (
                order_item_id INT NOT NULL PRIMARY KEY,
                order_id INT DEFAULT NULL,
                product_id INT DEFAULT NULL,
                quantity INT DEFAULT NULL,
                unit_price DECIMAL(10, 2) DEFAULT NULL,
                discount DECIMAL(10, 2) DEFAULT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(order_id),
                FOREIGN KEY (product_id) REFERENCES products(product_id)
            )
            """)
        
        # 检查marketing_campaigns表
        cursor.execute("SHOW TABLES LIKE 'marketing_campaigns'")
        if not cursor.fetchone():
            print("创建marketing_campaigns表")
            cursor.execute("""
            CREATE TABLE marketing_campaigns (
                campaign_id INT NOT NULL PRIMARY KEY,
                campaign_name VARCHAR(100) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                budget DECIMAL(10, 2) NOT NULL
            )
            """)
        
        # 检查traffic_sources表
        cursor.execute("SHOW TABLES LIKE 'traffic_sources'")
        if not cursor.fetchone():
            print("创建traffic_sources表")
            cursor.execute("""
            CREATE TABLE traffic_sources (
                source_id INT NOT NULL PRIMARY KEY,
                source_name VARCHAR(50) NOT NULL,
                source_type VARCHAR(20) NOT NULL
            )
            """)
        
        connection.commit()
    
    # 生成产品类别数据
    categories = [
        {"id": 1, "name": "女装", "level": 1},
        {"id": 2, "name": "男装", "level": 1},
        {"id": 3, "name": "鞋靴", "level": 1},
        {"id": 4, "name": "箱包", "level": 1},
        {"id": 5, "name": "配饰", "level": 1},
        {"id": 6, "name": "美妆", "level": 1},
        {"id": 7, "name": "家居", "level": 1},
    ]
    
    # 二级类别
    subcategories = {
        "女装": [{"id": 8, "name": "连衣裙"}, {"id": 9, "name": "T恤"}, {"id": 10, "name": "衬衫"}, {"id": 11, "name": "裤子"}, {"id": 12, "name": "外套"}],
        "男装": [{"id": 13, "name": "T恤"}, {"id": 14, "name": "衬衫"}, {"id": 15, "name": "裤子"}, {"id": 16, "name": "外套"}],
        "鞋靴": [{"id": 17, "name": "女鞋"}, {"id": 18, "name": "男鞋"}, {"id": 19, "name": "运动鞋"}, {"id": 20, "name": "靴子"}],
        "箱包": [{"id": 21, "name": "女包"}, {"id": 22, "name": "男包"}, {"id": 23, "name": "旅行箱"}],
        "配饰": [{"id": 24, "name": "首饰"}, {"id": 25, "name": "手表"}, {"id": 26, "name": "眼镜"}, {"id": 27, "name": "帽子"}],
        "美妆": [{"id": 28, "name": "护肤"}, {"id": 29, "name": "彩妆"}, {"id": 30, "name": "香水"}],
        "家居": [{"id": 31, "name": "床品"}, {"id": 32, "name": "家具"}, {"id": 33, "name": "装饰品"}]
    }
    
    with connection.cursor() as cursor:
        # 检查product_categories表是否已有数据
        cursor.execute("SELECT COUNT(*) as count FROM product_categories")
        category_count = cursor.fetchone()['count']
        
        if category_count == 0:
            print("插入产品类别数据")
            # 插入一级类别
            category_id_map = {}
            for category in categories:
                cursor.execute(
                    "INSERT INTO product_categories (category_id, category_name, category_level) VALUES (%s, %s, %s)",
                    (category["id"], category["name"], category["level"])
                )
                category_id_map[category["name"]] = category["id"]
            
            # 插入二级类别
            for parent_name, subcats in subcategories.items():
                for subcat in subcats:
                    cursor.execute(
                        "INSERT INTO product_categories (category_id, category_name, category_level) VALUES (%s, %s, %s)",
                        (subcat["id"], subcat["name"], 2)
                    )
            
            connection.commit()
            print(f"已插入 {len(categories) + sum(len(subcats) for subcats in subcategories.values())} 个产品类别")
        else:
            print(f"产品类别表已有 {category_count} 条数据，跳过插入")
    
    # 获取所有类别ID
    with connection.cursor() as cursor:
        cursor.execute("SELECT category_id, category_name, category_level FROM product_categories")
        all_categories = cursor.fetchall()
        level2_categories = [cat for cat in all_categories if cat['category_level'] == 2]
        if not level2_categories:  # 如果没有二级类别，使用所有类别
            level2_categories = all_categories
    
    # 检查products表是否已有数据
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as count FROM products")
        product_count = cursor.fetchone()['count']
        
        if product_count == 0:
            print("生成产品数据")
            # 生成产品数据
            products = []
            for i in range(200 + random.randint(0, 100)):
                category = random.choice(level2_categories)
                original_price = decimal.Decimal(str(round(random.uniform(49.9, 999.9), 2)))
                current_price = original_price * decimal.Decimal(str(round(random.uniform(0.7, 1.0), 2)))  # 当前价格是原价的70%-100%
                cost = current_price * decimal.Decimal(str(round(random.uniform(0.4, 0.7), 2)))
                
                product = {
                    "product_id": i + 1,  # 使用循环索引作为product_id
                    "product_name": fake.word() + fake.word() + random.choice(["", "系列", "款", "新品"]),
                    "category_id": category['category_id'],
                    "brand": fake.company(),
                    "supplier": fake.company(),
                    "original_price": original_price,
                    "current_price": current_price,
                    "cost": cost,
                    "stock_quantity": random.randint(0, 1000),
                    "create_time": fake.date_between(start_date="-1y", end_date="today"),
                    "is_active": random.choices([1, 0], weights=[0.9, 0.1])[0]  # 90%的概率为活动状态
                }
                products.append(product)
            
            with connection.cursor() as cursor:
                for product in products:
                    cursor.execute(
                        """
                        INSERT INTO products (
                            product_id, product_name, category_id, brand, supplier,
                            original_price, current_price, cost, stock_quantity,
                            create_time, is_active
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            product["product_id"], product["product_name"], product["category_id"],
                            product["brand"], product["supplier"], product["original_price"],
                            product["current_price"], product["cost"], product["stock_quantity"],
                            product["create_time"], product["is_active"]
                        )
                    )
                
                connection.commit()
                print(f"已插入 {len(products)} 个产品")
        else:
            print(f"产品表已有 {product_count} 条数据，跳过插入")
    
    # 检查users表是否已有数据
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as count FROM users")
        user_count = cursor.fetchone()['count']
        
        if user_count == 0:
            print("生成用户数据")
            # 生成用户数据
            users = []
            user_sources = ["直接访问", "搜索引擎", "社交媒体", "广告", "推荐"]
            
            for i in range(3000):
                registration_date = fake.date_between(start_date="-3y", end_date="today")
                last_login_date = fake.date_between(start_date=registration_date, end_date="today") if random.random() > 0.1 else None
                
                user = {
                    "user_id": i + 1,  # 使用循环索引作为user_id
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
                        """
                        INSERT INTO users (
                            user_id, username, email, registration_date, 
                            last_login_date, user_source
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            user["user_id"], user["username"], user["email"], 
                            user["registration_date"], user["last_login_date"], user["user_source"]
                        )
                    )
                
                connection.commit()
                print(f"已插入 {len(users)} 个用户")
        else:
            print(f"用户表已有 {user_count} 条数据，跳过插入")
    
    # 检查marketing_campaigns表是否已有数据
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as count FROM marketing_campaigns")
        campaign_count = cursor.fetchone()['count']
        
        if campaign_count == 0:
            print("生成营销活动数据")
            # 生成营销活动数据
            campaigns = []
            campaign_names = ["春节大促", "618购物节", "双11狂欢", "双12年终盛典", "新年特惠", "情人节专场", "暑期大促", "开学季"]
            
            start_date = datetime.now() - timedelta(days=365*2)
            for i, name in enumerate(campaign_names):
                end_date = start_date + timedelta(days=random.randint(7, 14))
                budget = decimal.Decimal(str(round(random.uniform(10000, 50000), 2)))
                
                campaign = {
                    "campaign_id": i + 1,  # 使用循环索引作为campaign_id
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
                        """
                        INSERT INTO marketing_campaigns (
                            campaign_id, campaign_name, start_date, end_date, budget
                        ) VALUES (%s, %s, %s, %s, %s)
                        """,
                        (
                            campaign["campaign_id"], campaign["campaign_name"], 
                            campaign["start_date"], campaign["end_date"], campaign["budget"]
                        )
                    )
                
                connection.commit()
                print(f"已插入 {len(campaigns)} 个营销活动")
        else:
            print(f"营销活动表已有 {campaign_count} 条数据，跳过插入")
    
    # 检查traffic_sources表是否已有数据
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as count FROM traffic_sources")
        source_count = cursor.fetchone()['count']
        
        if source_count == 0:
            print("生成流量来源数据")
            # 生成流量来源数据
            traffic_sources = [
                {"id": 1, "name": "百度", "type": "搜索引擎"},
                {"id": 2, "name": "Google", "type": "搜索引擎"},
                {"id": 3, "name": "微信", "type": "社交媒体"},
                {"id": 4, "name": "微博", "type": "社交媒体"},
                {"id": 5, "name": "抖音", "type": "社交媒体"},
                {"id": 6, "name": "小红书", "type": "社交媒体"},
                {"id": 7, "name": "直接访问", "type": "直接"},
                {"id": 8, "name": "电子邮件", "type": "营销"},
                {"id": 9, "name": "联盟广告", "type": "广告"},
                {"id": 10, "name": "信息流广告", "type": "广告"},
                {"id": 11, "name": "朋友推荐", "type": "推荐"},
                {"id": 12, "name": "App", "type": "应用"},
                {"id": 13, "name": "其他", "type": "其他"},
                {"id": 14, "name": "天猫", "type": "电商平台"},
                {"id": 15, "name": "京东", "type": "电商平台"}
            ]
            
            with connection.cursor() as cursor:
                for source in traffic_sources:
                    cursor.execute(
                        """
                        INSERT INTO traffic_sources (
                            source_id, source_name, source_type
                        ) VALUES (%s, %s, %s)
                        """,
                        (source["id"], source["name"], source["type"])
                    )
                
                connection.commit()
                print(f"已插入 {len(traffic_sources)} 个流量来源")
        else:
            print(f"流量来源表已有 {source_count} 条数据，跳过插入")
    
    # 获取所有用户ID
    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id FROM users")
        user_ids = [row['user_id'] for row in cursor.fetchall()]
    
    # 获取所有产品ID和价格
    with connection.cursor() as cursor:
        cursor.execute("SELECT product_id, current_price FROM products")
        product_data = cursor.fetchall()
        product_ids = [row['product_id'] for row in product_data]
        product_prices = {row['product_id']: row['current_price'] for row in product_data}
    
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
    
    # 检查orders表是否已有数据
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as count FROM orders")
        order_count = cursor.fetchone()['count']
        
        if order_count == 0 and user_ids and product_ids:
            print("生成订单数据")
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
            
            order_id_counter = 1
            order_item_id_counter = 1
            
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
                        "order_id": order_id_counter,
                        "user_id": user_id,
                        "order_date": order_date,
                        "total_amount": decimal.Decimal('0.00'),  # 将在添加订单项后更新
                        "discount_amount": decimal.Decimal('0.00'),  # 总折扣金额
                        "payment_method": random.choice(payment_methods),
                        "payment_status": random.choice(["已支付", "待支付", "已退款"]),
                        "shipping_address": fake.address(),
                        "order_status": random.choices(
                            order_statuses,
                            weights=[0.85, 0.08, 0.05, 0.02],
                            k=1
                        )[0],
                        "order_source": order_source,
                        "device_type": random.choice(["PC", "Mobile", "Tablet", "其他"])
                    }
                    
                    # 为订单添加1-5个商品
                    items_count = random.choices([1, 2, 3, 4, 5], weights=[0.3, 0.3, 0.2, 0.15, 0.05], k=1)[0]
                    order_total = decimal.Decimal('0.00')
                    total_discount = decimal.Decimal('0.00')  # 订单总折扣金额
                    
                    order_items_list = []
                    selected_products = random.sample(product_ids, min(items_count, len(product_ids)))
                    
                    for product_id in selected_products:
                        price = product_prices[product_id]
                        quantity = random.choices([1, 2, 3], weights=[0.7, 0.2, 0.1], k=1)[0]
                        
                        # 如果在活动期间，可能有折扣
                        if in_campaign and random.random() < 0.7:
                            discount = decimal.Decimal(str(round(float(price) * random.uniform(0.05, 0.3), 2)))
                        else:
                            discount = decimal.Decimal('0.00')
                        
                        item_total = (price - discount) * quantity
                        order_total += item_total
                        total_discount += discount * quantity  # 累计订单总折扣
                        
                        order_items_list.append({
                            "order_item_id": order_item_id_counter,
                            "order_id": order_id_counter,
                            "product_id": product_id,
                            "quantity": quantity,
                            "unit_price": price,
                            "discount": discount
                        })
                        order_item_id_counter += 1
                    
                    order["total_amount"] = order_total
                    order["discount_amount"] = total_discount
                    orders.append((order, order_items_list))
                    order_id_counter += 1
                
                # 移动到下个月
                current_date += timedelta(days=30)
            
            # 批量插入订单和订单明细
            with connection.cursor() as cursor:
                for i, (order, items) in enumerate(orders):
                    # 插入订单
                    cursor.execute(
                        """
                        INSERT INTO orders 
                        (order_id, user_id, order_date, total_amount, discount_amount, payment_method, 
                        payment_status, shipping_address, order_status, order_source, device_type) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            order["order_id"],
                            order["user_id"], 
                            order["order_date"], 
                            order["total_amount"],
                            order["discount_amount"],
                            order["payment_method"],
                            order["payment_status"],
                            order["shipping_address"],
                            order["order_status"], 
                            order["order_source"],
                            order["device_type"]
                        )
                    )
                    
                    # 插入订单明细
                    for item in items:
                        cursor.execute(
                            """
                            INSERT INTO order_items 
                            (order_item_id, order_id, product_id, quantity, unit_price, discount) 
                            VALUES (%s, %s, %s, %s, %s, %s)
                            """,
                            (
                                item["order_item_id"],
                                item["order_id"], 
                                item["product_id"], 
                                item["quantity"], 
                                item["unit_price"], 
                                item["discount"]
                            )
                        )
                    
                    # 每1000个订单提交一次，避免事务过大
                    if (i + 1) % 1000 == 0:
                        connection.commit()
                        print(f"已插入 {i + 1}/{len(orders)} 个订单")
                
                # 最后提交剩余事务
                connection.commit()
                print(f"已插入 {len(orders)} 个订单和相关订单明细")
        elif order_count > 0:
            print(f"订单表已有 {order_count} 条数据，跳过插入")
        else:
            print("缺少用户或产品数据，无法生成订单")
    
    print("数据生成完成！")

except Exception as e:
    print(f"发生错误: {e}")
finally:
    if connection:
        connection.close()
        print("数据库连接已关闭")