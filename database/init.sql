-- ============================================
-- 记账APP数据库初始化脚本
-- 在Supabase SQL Editor中执行
-- ============================================

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 账本表
-- ============================================
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('PERSONAL', 'COUPLE', 'FAMILY')) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 账本RLS策略
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their books" ON books
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert their books" ON books
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their books" ON books
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their books" ON books
  FOR DELETE USING (created_by = auth.uid());

-- ============================================
-- 2. 账本成员表
-- ============================================
CREATE TABLE IF NOT EXISTS book_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')) DEFAULT 'MEMBER',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_id, user_id)
);

ALTER TABLE book_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view book members" ON book_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    book_id IN (SELECT id FROM books WHERE created_by = auth.uid())
  );

CREATE POLICY "Owners can manage members" ON book_members
  FOR ALL USING (
    book_id IN (SELECT id FROM books WHERE created_by = auth.uid())
  );

-- ============================================
-- 3. 分类表
-- ============================================
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

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories" ON categories
  FOR SELECT USING (
    book_id IN (
      SELECT id FROM books WHERE created_by = auth.uid()
      UNION
      SELECT book_id FROM book_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage categories" ON categories
  FOR ALL USING (
    book_id IN (
      SELECT id FROM books WHERE created_by = auth.uid()
      UNION
      SELECT book_id FROM book_members WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================
-- 4. 交易记录表
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions" ON transactions
  FOR SELECT USING (
    book_id IN (
      SELECT id FROM books WHERE created_by = auth.uid()
      UNION
      SELECT book_id FROM book_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    book_id IN (
      SELECT id FROM books WHERE created_by = auth.uid()
      UNION
      SELECT book_id FROM book_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their transactions" ON transactions
  FOR UPDATE USING (
    user_id = auth.uid() OR
    book_id IN (
      SELECT id FROM books WHERE created_by = auth.uid()
      UNION
      SELECT book_id FROM book_members WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Users can delete their transactions" ON transactions
  FOR DELETE USING (
    user_id = auth.uid() OR
    book_id IN (
      SELECT id FROM books WHERE created_by = auth.uid()
      UNION
      SELECT book_id FROM book_members WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================
-- 5. 资产表
-- ============================================
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'CASH',
  balance INTEGER DEFAULT 0,
  note TEXT,
  is_included BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assets_user ON assets(user_id);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their assets" ON assets
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 6. 会员订阅表
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their subscriptions" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their subscriptions" ON subscriptions
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 7. 插入默认分类数据
-- ============================================

-- 支出分类（图标和颜色）
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

-- 收入分类
INSERT INTO categories (book_id, name, type, icon, color, is_builtin, sort_order) VALUES
(NULL, '工资', 'INCOME', 'Banknote', '#10B981', TRUE, 1),
(NULL, '奖金', 'INCOME', 'Gift', '#EAB308', TRUE, 2),
(NULL, '投资', 'INCOME', 'TrendingUp', '#8B5CF6', TRUE, 3),
(NULL, '兼职', 'INCOME', 'Briefcase', '#06B6D4', TRUE, 4),
(NULL, '红包', 'INCOME', 'Heart', '#EF4444', TRUE, 5),
(NULL, '其他收入', 'INCOME', 'MoreHorizontal', '#9CA3AF', TRUE, 99);

-- ============================================
-- 8. 创建实时同步发布
-- ============================================

-- 启用实时功能（在Supabase Dashboard的Database → Replication中确认）
-- transactions表的变更会实时推送

-- 添加表注释
COMMENT ON TABLE books IS '账本表';
COMMENT ON TABLE book_members IS '账本成员关联表';
COMMENT ON TABLE categories IS '收支分类表';
COMMENT ON TABLE transactions IS '交易记录表';
COMMENT ON TABLE assets IS '用户资产表';
COMMENT ON TABLE subscriptions IS '会员订阅表';

-- 完成！
SELECT '数据库初始化完成！' as status;
