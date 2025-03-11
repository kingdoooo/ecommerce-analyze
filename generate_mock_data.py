import pymysql
import random
from faker import Faker
from datetime import datetime, timedelta
import time
import argparse

# 初始化Faker生成器
fake = Faker()

def create_database(conn_params):
    """创建数据库"""
    # 连接到MySQL服务器(不指定数据库)
    conn = pymysql.connect(
        host=conn_params['host'],
        user=conn_params['user'],
        password=conn_params['password']
    )
    
    cursor = conn.cursor()
    
    try:
        # 创建数据库
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {conn_params['database']}")
        print(f"数据库 {conn_params['database']} 创建成功或已存在")
    except Exception as e:
        print(f"创建数据库时出错: {e}")
    finally:
        cursor.close()
        conn.close()

def connect_to_db(conn_params):
    """连接到指定数据库"""
    return pymysql.connect(
        host=conn_params['host'],
        user=conn_params['user'],
        password=conn_params['password'],
        db=conn_params['database']
    )

def generate_product_categories(conn):
    """生成商品分类数据"""
    cursor = conn.cursor()
    
    # 清除已有数据
    cursor.execute("DELETE FROM product_categories")
    
    categories = [
        (1, "泳装", None, 1, True),
        (11, "女士泳衣", 1, 2, True),
        (12, "男士泳裤", 1, 2, True),
        (13, "儿童泳衣", 1, 2, True),
        (14, "比基尼", 1, 2, True),
        (15, "沙滩配件", 1, 2, True),
        
        (2, "成衣", None, 1, True),
        (21, "女士上装", 2, 2, True),
        (22, "女士下装", 2, 2, True),
        (23, "男士上装", 2, 2, True),
        (24, "男士下装", 2, 2, True),
        
        (3, "配饰", None, 1, True),
        (31, "项链", 3, 2, True),
        (32, "手链", 3, 2, True),
        (33, "耳环", 3, 2, True),
        
        (4, "帽子", None, 1, True),
        (41, "棒球帽", 4, 2, True),
        (42, "太阳帽", 4, 2, True),
        (43, "沙滩帽", 4, 2, True),
        
        (5, "包袋", None, 1, True),
        (51, "手提包", 5, 2, True),
        (52, "沙滩包", 5, 2, True),
        (53, "背包", 5, 2, True)
    ]
    
    for category in categories:
        cursor.execute("""
        INSERT INTO product_categories (category_id, category_name, parent_category_id, category_level, is_active)
        VALUES (%s, %s, %s, %s, %s)
        """, category)
    
    conn.commit()
    print(f"已插入 {len(categories)} 个产品类别")

def generate_products(conn):
    """生成商品数据"""
    cursor = conn.cursor()
    
    # 清除已有数据
    cursor.execute("DELETE FROM products")
    
    brands = ["OceanBreeze", "SunnyDays", "WaveRider", "BeachLife", "TropicalVibes", "CoastalChic"]
    suppliers = ["SeaFashion Inc.", "BeachGear Supply", "Aquatic Styles", "Summer Collections Ltd", "Coastal Manufacturers"]
    
    # 产品名称模板
    product_templates = {
        11: ["女式连体泳衣", "流行女士泳衣", "修身女士泳衣", "性感露背泳衣"],
        12: ["男士沙滩短裤", "男士游泳短裤", "快干泳裤", "时尚男士泳裤"],
        13: ["儿童可爱泳衣", "防晒儿童泳装", "卡通儿童泳衣"],
        14: ["时尚比基尼套装", "性感分体泳衣", "热带风情比基尼"],
        15: ["防水沙滩包", "防晒沙滩巾", "沙滩拖鞋"],
        21: ["女士T恤", "女士衬衫", "女士背心"],
        22: ["女士短裤", "女士牛仔裤", "女士裙装"],
        23: ["男士T恤", "男士衬衫", "男士背心"],
        24: ["男士短裤", "男士牛仔裤", "男士休闲裤"],
        31: ["波西米亚项链", "简约风项链", "贝壳项链"],
        32: ["手工串珠手链", "银质手链", "编织手链"],
        33: ["贝壳耳环", "波西米亚耳环", "简约耳钉"],
        41: ["标志棒球帽", "复古棒球帽"],
        42: ["宽边太阳帽", "折叠太阳帽"],
        43: ["草编沙滩帽", "防晒沙滩帽"],
        51: ["手提购物包", "编织手提包"],
        52: ["防水沙滩包", "网眼沙滩包"],
        53: ["轻便背包", "防水背包"]
    }
    
    products = []
    product_id = 1
    
    # 生成产品数据，泳装类别占70%的产品
    for category_id in product_templates:
        # 确定每个类别产品数量
        if category_id in [11, 12, 13, 14, 15]:  # 泳装类别
            count = random.randint(20, 30)
        elif category_id in [21, 22, 23, 24]:  # 成衣类别
            count = random.randint(8, 15)
        else:  # 其他类别
            count = random.randint(5, 10)
        
        for _ in range(count):
            template = random.choice(product_templates[category_id])
            color = random.choice(["红色", "蓝色", "黑色", "白色", "粉色", "绿色", "黄色", "紫色"])
            size = random.choice(["S", "M", "L", "XL"]) if category_id not in [31, 32, 33] else ""
            
            product_name = f"{template} {color}" + (f" {size}" if size else "")
            brand = random.choice(brands)
            supplier = random.choice(suppliers)
            
            # 价格设置在5-50美元之间，成本为售价的60%左右
            if category_id in [11, 12, 13, 14]:  # 泳装主要产品
                current_price = round(random.uniform(20, 50), 2)
            elif category_id in [31, 32, 33]:  # 配饰
                current_price = round(random.uniform(5, 15), 2)
            else:  # 其他产品
                current_price = round(random.uniform(10, 40), 2)
                
            original_price = round(current_price * random.uniform(1, 1.2), 2)
            cost = round(current_price * random.uniform(0.55, 0.65), 2)
            
            stock = random.randint(50, 500)
            create_date = (datetime.now() - timedelta(days=random.randint(180, 720))).strftime('%Y-%m-%d')
            
            products.append((
                product_id, 
                product_name, 
                category_id, 
                brand, 
                supplier,
                original_price, 
                current_price, 
                cost, 
                stock, 
                create_date, 
                True
            ))
            
            product_id += 1
    
    for product in products:
        cursor.execute("""
        INSERT INTO products (product_id, product_name, category_id, brand, supplier, original_price, 
                             current_price, cost, stock_quantity, create_time, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, product)
    
    conn.commit()
    print(f"已插入 {len(products)} 个产品")
    return product_id - 1  # 返回最大产品ID用于后续引用

def generate_users(conn, count=3000):
    """生成用户数据"""
    cursor = conn.cursor()
    
    # 清除已有数据
    cursor.execute("DELETE FROM users")
    
    users = []
    
    # 国家分布：美国70%，其他国家共30%
    countries = {
        "United States": 0.7,
        "Canada": 0.1,
        "United Kingdom": 0.1,
        "France": 0.05,
        "Australia": 0.05
    }
    
    # 用户来源
    sources = ["Organic Search", "Direct", "Social Media", "Referral", "Email Campaign"]
    
    for user_id in range(1, count+1):
        # 选择国家，根据权重
        country = random.choices(list(countries.keys()), weights=list(countries.values()))[0]
        
        # 创建注册日期 - 分布在过去两年时间
        reg_days_ago = random.randint(1, 730)
        reg_date = (datetime.now() - timedelta(days=reg_days_ago)).strftime('%Y-%m-%d')
        
        # 用户等级
        days_since_reg = (datetime.now() - datetime.strptime(reg_date, '%Y-%m-%d')).days
        purchases = max(0, int(days_since_reg / 60) + random.randint(-2, 2))  # 大致每60天购买一次
        
        if purchases >= 10:
            user_level = "VIP"
        elif purchases >= 5:
            user_level = "Gold"
        elif purchases >= 2:
            user_level = "Silver"
        else:
            user_level = "Bronze"
            
        user = (
            user_id,
            fake.user_name(),
            fake.email(),
            fake.phone_number(),
            random.choice(["Male", "Female"]),
            random.randint(18, 65),
            fake.city(),
            country,
            reg_date,
            user_level,
            random.random() > 0.1,  # 90%是活跃用户
            random.choice(sources)
        )
        
        users.append(user)
    
    for user in users:
        cursor.execute("""
        INSERT INTO users (user_id, username, email, phone, gender, age, city, country, registration_date, 
                          user_level, is_active, user_source)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, user)
    
    conn.commit()
    print(f"已插入 {count} 个用户")

def generate_marketing_campaigns(conn):
    """生成营销活动数据"""
    cursor = conn.cursor()
    
    # 清除已有数据
    cursor.execute("DELETE FROM marketing_campaigns")
    
    campaigns = [
        (1, "新年特惠", "Discount", "2023-01-01", "2023-01-15", 5000.00, "All Users", "Percentage", 20.00, False),
        (2, "春季泳装上新", "New Arrival", "2023-03-01", "2023-03-31", 8000.00, "Female Users", "Percentage", 10.00, False),
        (3, "夏日狂欢", "Holiday", "2023-06-01", "2023-06-30", 10000.00, "All Users", "Percentage", 15.00, False),
        (4, "返校季促销", "Back to School", "2023-08-15", "2023-09-15", 6000.00, "Students", "Fixed", 5.00, False),
        (5, "黑色星期五", "Holiday", "2023-11-24", "2023-11-28", 15000.00, "All Users", "Percentage", 30.00, False),
        (6, "圣诞特惠", "Holiday", "2023-12-15", "2023-12-25", 12000.00, "All Users", "Percentage", 25.00, True),
        (7, "会员专享", "Membership", "2023-01-01", "2023-12-31", 5000.00, "VIP & Gold Members", "Percentage", 10.00, True),
        (8, "首单立减", "New Customer", "2023-01-01", "2023-12-31", 3000.00, "New Users", "Fixed", 5.00, True)
    ]
    
    for campaign in campaigns:
        cursor.execute("""
        INSERT INTO marketing_campaigns (campaign_id, campaign_name, campaign_type, start_date, end_date, 
                                        budget, target_audience, discount_type, discount_value, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, campaign)
    
    conn.commit()
    print(f"已插入 {len(campaigns)} 个营销活动")

def generate_traffic_sources(conn):
    """生成流量来源数据"""
    cursor = conn.cursor()
    
    # 清除已有数据
    cursor.execute("DELETE FROM traffic_sources")
    
    sources = [
        (1, "Direct", "Direct", None),
        (2, "Google Organic", "Search", None),
        (3, "Bing Organic", "Search", None),
        (4, "Facebook", "Social", None),
        (5, "Instagram", "Social", None),
        (6, "Twitter", "Social", None),
        (7, "Pinterest", "Social", None),
        (8, "Email Newsletter", "Email", None),
        (9, "Affiliate", "Referral", None),
        (10, "New Year Campaign", "Paid", 1),
        (11, "Spring Collection", "Paid", 2),
        (12, "Summer Sale", "Paid", 3),
        (13, "Back to School", "Paid", 4),
        (14, "Black Friday", "Paid", 5),
        (15, "Christmas Sale", "Paid", 6)
    ]
    
    for source in sources:
        cursor.execute("""
        INSERT INTO traffic_sources (source_id, source_name, source_type, campaign_id)
        VALUES (%s, %s, %s, %s)
        """, source)
    
    conn.commit()
    print(f"已插入 {len(sources)} 个流量来源")

def get_month_multiplier(month):
    """
    根据月份返回销售量倍数，实现季节性趋势:
    1月开始逐步增长，7月达到高峰，之后开始下降
    """
    # 季节性趋势系数
    seasonal_trend = {
        1: 0.8,  # 1月，开始上升
        2: 0.9,
        3: 1.0, 
        4: 1.2,
        5: 1.4,
        6: 1.6,
        7: 1.8,  # 7月高峰
        8: 1.6,
        9: 1.4,
        10: 1.2,
        11: 1.0,
        12: 1.1  # 假日季节略有提升
    }
    
    return seasonal_trend.get(month, 1.0)

def generate_orders_and_items(conn, max_product_id):
    """生成订单和订单项数据"""
    cursor = conn.cursor()
    
    # 清除已有数据
    cursor.execute("DELETE FROM order_items")
    cursor.execute("DELETE FROM orders")
    cursor.execute("DELETE FROM order_campaign_map")
    
    # 订单来源
    order_sources = {
        "Own Website": 0.50,
        "Amazon": 0.40,
        "Other Marketplaces": 0.10
    }
    
    # 支付方式
    payment_methods = ["Credit Card", "PayPal", "Apple Pay", "Google Pay", "Amazon Pay"]
    
    # 设备类型
    device_types = ["Desktop", "Mobile", "Tablet"]
    
    # 订单状态
    order_statuses = ["Completed", "Shipped", "Processing", "Cancelled"]
    status_weights = [0.85, 0.08, 0.05, 0.02]
    
    # 获取所有有效活动
    cursor.execute("SELECT campaign_id, start_date, end_date, discount_type, discount_value FROM marketing_campaigns")
    campaigns = {row[0]: {"start": row[1], "end": row[2], "type": row[3], "value": row[4]} for row in cursor.fetchall()}
    
    # 生成2023年的订单
    start_date = datetime(2023, 1, 1)
    end_date = datetime(2023, 12, 31)
    
    order_id = 1
    order_item_id = 1
    map_id = 1
    
    # 订单数量将根据月份有所不同
    base_daily_orders = 50  # 基础日均订单量
    
    current_date = start_date
    while current_date <= end_date:
        # 根据月份调整订单数量
        month_multiplier = get_month_multiplier(current_date.month)
        daily_orders = int(base_daily_orders * month_multiplier)
        
        # 添加一些随机波动
        daily_orders = int(daily_orders * random.uniform(0.8, 1.2))
        
        # 周末订单更多
        if current_date.weekday() >= 5:  # 5,6是周六日
            daily_orders = int(daily_orders * 1.3)
        
        # 特殊节日
        if (current_date.month == 11 and current_date.day >= 24 and current_date.day <= 28) or \
           (current_date.month == 12 and current_date.day >= 15 and current_date.day <= 25):
            daily_orders = int(daily_orders * 1.5)  # 黑五和圣诞季节
            
        # 生成当天订单
        for _ in range(daily_orders):
            user_id = random.randint(1, 3000)
            order_hour = random.randint(0, 23)
            order_minute = random.randint(0, 59)
            order_second = random.randint(0, 59)
            order_datetime = datetime(current_date.year, current_date.month, current_date.day, 
                                    order_hour, order_minute, order_second)
            
            # 选择订单来源
            order_source = random.choices(list(order_sources.keys()), weights=list(order_sources.values()))[0]
            
            # 随机选择支付和设备
            payment_method = random.choice(payment_methods)
            device_type = random.choice(device_types)
            
            # 随机选择订单状态
            order_status = random.choices(order_statuses, weights=status_weights)[0]
            
            # 订单金额初始化
            total_amount = 0.0
            discount_amount = 0.0
            
            # 查看是否有活动
            applicable_campaigns = []
            for camp_id, camp_data in campaigns.items():
                if camp_data["start"] <= order_datetime.date() <= camp_data["end"]:
                    applicable_campaigns.append(camp_id)
            
            # 创建订单
            cursor.execute("""
            INSERT INTO orders (order_id, user_id, order_date, total_amount, discount_amount, 
                              payment_method, payment_status, shipping_address, order_status, order_source, device_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                order_id, 
                user_id, 
                order_datetime,
                0,  # 临时设为0，后面更新
                0,  # 临时设为0，后面更新
                payment_method,
                "Paid" if order_status != "Cancelled" else "Refunded",
                fake.address().replace('\n', ', '),
                order_status,
                order_source,
                device_type
            ))
            
            # 决定订单项数量
            items_count = random.choices([1, 2, 3, 4], weights=[0.6, 0.25, 0.1, 0.05])[0]
            
            # 创建订单项
            selected_products = random.sample(range(1, max_product_id+1), items_count)
            for product_id in selected_products:
                # 获取产品信息
                cursor.execute("SELECT current_price FROM products WHERE product_id = %s", (product_id,))
                product = cursor.fetchone()
                
                if product:
                    unit_price = product[0]
                    quantity = random.randint(1, 3)
                    item_discount = 0
                    
                    # 计算折扣
                    if applicable_campaigns and random.random() < 0.7:  # 70%的订单应用活动
                        campaign_id = random.choice(applicable_campaigns)
                        camp_data = campaigns[campaign_id]
                        
                        # 记录订单与活动的关联
                        cursor.execute("""
                        INSERT INTO order_campaign_map (id, order_id, campaign_id)
                        VALUES (%s, %s, %s)
                        """, (map_id, order_id, campaign_id))
                        map_id += 1
                        
                        # 计算折扣金额
                        if camp_data["type"] == "Percentage":
                            item_discount = round((unit_price * quantity) * (camp_data["value"] / 100), 2)
                        else:  # Fixed
                            item_discount = min(camp_data["value"], unit_price * quantity)
                        
                        discount_amount += item_discount
                    
                    # 添加订单项
                    cursor.execute("""
                    INSERT INTO order_items (order_item_id, order_id, product_id, quantity, unit_price, discount)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        order_item_id,
                        order_id,
                        product_id,
                        quantity,
                        unit_price,
                        item_discount
                    ))
                    
                    total_amount += unit_price * quantity
                    order_item_id += 1
            
            # 更新订单总金额
            cursor.execute("""
            UPDATE orders SET total_amount = %s, discount_amount = %s WHERE order_id = %s
            """, (total_amount, discount_amount, order_id))
            
            order_id += 1
        
        # 进入下一天
        current_date += timedelta(days=1)
        
        # 每处理50天提交一次，减少内存压力
        if current_date.day % 50 == 0:
            conn.commit()
            print(f"已处理到 {current_date.strftime('%Y-%m-%d')}")
    
    conn.commit()
    print(f"已插入 {order_id-1} 个订单和 {order_item_id-1} 个订单项")

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='生成电商模拟数据')
    parser.add_argument('--host', default='localhost', help='数据库主机地址')
    parser.add_argument('--user', default='root', help='数据库用户名')
    parser.add_argument('--password', required=True, help='数据库密码')
    parser.add_argument('--database', default='ecommerce', help='数据库名称')
    
    args = parser.parse_args()
    
    conn_params = {
        'host': args.host,
        'user': args.user,
        'password': args.password,
        'database': args.database
    }
    
    print("开始执行电商数据模拟...")
    
    try:
        # 创建数据库
        create_database(conn_params)
        
        # 连接到数据库
        conn = connect_to_db(conn_params)
        print("成功连接到数据库")
        
        # 生成模拟数据
        generate_product_categories(conn)
        max_product_id = generate_products(conn)
        generate_users(conn, 3000)
        generate_marketing_campaigns(conn)
        generate_traffic_sources(conn)
        generate_orders_and_items(conn, max_product_id)
        
        print("数据模拟完成!")
    except Exception as e:
        print(f"发生错误: {e}")
    finally:
        if 'conn' in locals():
            conn.close()
            print("数据库连接已关闭")

if __name__ == "__main__":
    main()