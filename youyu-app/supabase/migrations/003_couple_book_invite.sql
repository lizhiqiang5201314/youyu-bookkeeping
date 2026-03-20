-- 情侣账本数据库表结构
-- 在 Supabase SQL Editor 中执行

-- ============================================
-- 1. 账本邀请表 (book_invites)
-- ============================================
CREATE TABLE IF NOT EXISTS book_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL UNIQUE,  -- 6位数字邀请码
    created_by UUID NOT NULL,  -- 创建者用户ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- 过期时间
    max_uses INTEGER DEFAULT 1,  -- 最大使用次数（默认1次）
    used_count INTEGER DEFAULT 0,  -- 已使用次数
    
    CONSTRAINT valid_code CHECK (code ~ '^[0-9]{6}$')  -- 确保是6位数字
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_book_invites_code ON book_invites(code);
CREATE INDEX IF NOT EXISTS idx_book_invites_book_id ON book_invites(book_id);
CREATE INDEX IF NOT EXISTS idx_book_invites_expires_at ON book_invites(expires_at);

-- ============================================
-- 2. 账本成员表 (book_members) - 如果不存在则创建
-- ============================================
CREATE TABLE IF NOT EXISTS book_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(book_id, user_id)  -- 一个用户在一个账本中只能有一种角色
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_book_members_book_id ON book_members(book_id);
CREATE INDEX IF NOT EXISTS idx_book_members_user_id ON book_members(user_id);

-- ============================================
-- 3. 清理过期邀请码的函数（可选，可配合 Cron 使用）
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
    DELETE FROM book_invites 
    WHERE expires_at < NOW() 
    OR (max_uses IS NOT NULL AND used_count >= max_uses);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Row Level Security (RLS) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE book_invites ENABLE ROW LEVEL SECURITY;

-- 邀请码策略：
-- - 账本创建者可以查看自己账本的邀请码
-- - 任何人都可以通过邀请码查询（用于加入时验证）

-- 查看邀请码（仅创建者和账本成员）
CREATE POLICY "select_book_invites" ON book_invites
    FOR SELECT USING (
        created_by = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM books WHERE id = book_id AND created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM book_members WHERE book_id = book_id AND user_id = auth.uid()
        )
    );

-- 创建邀请码（仅账本创建者）
CREATE POLICY "insert_book_invites" ON book_invites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM books WHERE id = book_id AND created_by = auth.uid()
        )
    );

-- 更新邀请码使用次数（任何人，用于加入时）
CREATE POLICY "update_book_invites_usage" ON book_invites
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- 删除邀请码（仅创建者）
CREATE POLICY "delete_book_invites" ON book_invites
    FOR DELETE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM books WHERE id = book_id AND created_by = auth.uid()
        )
    );

-- 成员表策略
ALTER TABLE book_members ENABLE ROW LEVEL SECURITY;

-- 查看成员（账本成员可见）
CREATE POLICY "select_book_members" ON book_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM books WHERE id = book_id AND created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM book_members bm WHERE bm.book_id = book_id AND bm.user_id = auth.uid()
        )
    );

-- 插入成员（任何人，用于加入账本）
CREATE POLICY "insert_book_members" ON book_members
    FOR INSERT WITH CHECK (true);

-- 删除成员（仅账本创建者或被删除者自己）
CREATE POLICY "delete_book_members" ON book_members
    FOR DELETE USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM books WHERE id = book_id AND created_by = auth.uid()
        )
    );

-- ============================================
-- 5. 触发器：创建账本时自动添加 OWNER 成员
-- ============================================
CREATE OR REPLACE FUNCTION auto_add_book_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO book_members (book_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.created_by, 'OWNER', NOW())
    ON CONFLICT (book_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 如果已存在触发器则删除
DROP TRIGGER IF EXISTS trigger_auto_add_owner ON books;

-- 创建触发器
CREATE TRIGGER trigger_auto_add_owner
    AFTER INSERT ON books
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_book_owner();

-- ============================================
-- 6. 更新 supabase.ts 中的类型定义
-- ============================================
/*
在 src/services/supabase.ts 中添加：

book_invites: {
  Row: {
    id: string
    book_id: string
    code: string
    created_by: string
    created_at: string
    expires_at: string
    max_uses: number
    used_count: number
  }
  Insert: {
    id?: string
    book_id: string
    code: string
    created_by: string
    created_at?: string
    expires_at: string
    max_uses?: number
    used_count?: number
  }
}
*/

-- ============================================
-- 7. 测试数据（可选）
-- ============================================
-- 创建测试邀请码示例：
-- INSERT INTO book_invites (book_id, code, created_by, expires_at)
-- VALUES ('your-book-uuid', '123456', 'your-user-uuid', NOW() + INTERVAL '7 days');
