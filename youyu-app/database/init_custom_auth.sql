-- ============================================
-- 自定义用户系统（不使用 Supabase Auth）
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入测试用户（密码: 123456，已经 bcrypt 加密）
-- $2a$10$xxxxxxxxxxxxxxxxxxxxxxxx 是 '123456' 的哈希
INSERT INTO app_users (phone, password_hash, nickname) VALUES
('13800138000', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '测试用户')
ON CONFLICT (phone) DO NOTHING;

-- ============================================
-- 其他业务表（不使用 RLS，应用层控制权限）
-- ============================================

-- 账本表
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('PERSONAL', 'COUPLE', 'FAMILY')) NOT NULL,
  created_by UUID REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 账本成员表
CREATE TABLE IF NOT EXISTS book_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')) DEFAULT 'MEMBER',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_id, user_id)
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('INCOME', 'EXPENSE')) NOT NULL,
  icon TEXT DEFAULT 'CircleDollarSign',
  color TEXT DEFAULT '#10B981',
  sort_order INTEGER DEFAULT 0,
  is_builtin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  type TEXT CHECK (type IN ('INCOME', 'EXPENSE')) NOT NULL,
  description TEXT,
  record_date DATE NOT NULL,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_book_date ON transactions(book_id, record_date DESC);
CREATE INDEX idx_transactions_user ON transactions(user_id);

-- 资产表
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'CASH',
  balance INTEGER DEFAULT 0,
  note TEXT,
  is_included BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assets_user ON assets(user_id);

-- 会员订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('COUPLE', 'FAMILY')),
  plan TEXT CHECK (plan IN ('MONTHLY', 'YEARLY')),
  price DECIMAL(10,2),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')) DEFAULT 'ACTIVE',
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认分类
INSERT INTO categories (book_id, name, type, icon, color, is_builtin, sort_order) VALUES
(NULL, '餐饮', 'EXPENSE', 'UtensilsCrossed', '#EF4444', TRUE, 1),
(NULL, '交通', 'EXPENSE', 'Car', '#F97316', TRUE, 2),
(NULL, '购物', 'EXPENSE', 'ShoppingBag', '#EAB308', TRUE, 3),
(NULL, '娱乐', 'EXPENSE', 'Gamepad2', '#8B5CF6', TRUE, 4),
(NULL, '居住', 'EXPENSE', 'Home', '#10B981', TRUE, 5),
(NULL, '医疗', 'EXPENSE', 'Heart', '#EC4899', TRUE, 6),
(NULL, '教育', 'EXPENSE', 'GraduationCap', '#06B6D4', TRUE, 7),
(NULL, '通讯', 'EXPENSE', 'Smartphone', '#6366F1', TRUE, 8),
(NULL, '宠物', 'EXPENSE', 'Cat', '#84CC16', TRUE, 9),
(NULL, '旅行', 'EXPENSE', 'Plane', '#14B8A6', TRUE, 10),
(NULL, '人情', 'EXPENSE', 'Gift', '#F43F5E', TRUE, 11),
(NULL, '其他支出', 'EXPENSE', 'MoreHorizontal', '#9CA3AF', TRUE, 99);

INSERT INTO categories (book_id, name, type, icon, color, is_builtin, sort_order) VALUES
(NULL, '工资', 'INCOME', 'Banknote', '#10B981', TRUE, 1),
(NULL, '奖金', 'INCOME', 'Gift', '#EAB308', TRUE, 2),
(NULL, '投资', 'INCOME', 'TrendingUp', '#8B5CF6', TRUE, 3),
(NULL, '兼职', 'INCOME', 'Briefcase', '#06B6D4', TRUE, 4),
(NULL, '红包', 'INCOME', 'Heart', '#EF4444', TRUE, 5),
(NULL, '其他收入', 'INCOME', 'MoreHorizontal', '#9CA3AF', TRUE, 99);

-- 完成
SELECT '自定义用户系统数据库初始化完成！' as status;
