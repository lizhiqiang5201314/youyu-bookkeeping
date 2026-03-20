-- 完全重置 book_invites 的 RLS 策略

-- 1. 先禁用 RLS（测试用）
ALTER TABLE book_invites DISABLE ROW LEVEL SECURITY;

-- 2. 删除所有策略
DROP POLICY IF EXISTS "select_book_invites" ON book_invites;
DROP POLICY IF EXISTS "insert_book_invites" ON book_invites;
DROP POLICY IF EXISTS "update_book_invites" ON book_invites;
DROP POLICY IF EXISTS "update_book_invites_usage" ON book_invites;
DROP POLICY IF EXISTS "delete_book_invites" ON book_invites;

-- 3. 重新启用 RLS
ALTER TABLE book_invites ENABLE ROW LEVEL SECURITY;

-- 4. 创建宽松策略（允许所有已认证用户操作）
-- 查询
CREATE POLICY "select_book_invites" ON book_invites
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- 插入 - 关键是这里，允许已登录用户插入
CREATE POLICY "insert_book_invites" ON book_invites
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 更新
CREATE POLICY "update_book_invites" ON book_invites
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 删除
CREATE POLICY "delete_book_invites" ON book_invites
    FOR DELETE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM books WHERE id = book_id AND created_by = auth.uid()
        )
    );
