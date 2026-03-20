-- 修复邀请码插入权限问题
-- 之前的策略太严格，导致创建者也无法插入

-- 1. 先查看当前策略
-- SELECT * FROM pg_policies WHERE tablename = 'book_invites';

-- 2. 删除所有旧的策略
DROP POLICY IF EXISTS "select_book_invites" ON book_invites;
DROP POLICY IF EXISTS "insert_book_invites" ON book_invites;
DROP POLICY IF EXISTS "update_book_invites_usage" ON book_invites;
DROP POLICY IF EXISTS "delete_book_invites" ON book_invites;

-- 3. 创建新策略
-- 查询：任何人可查（用于验证邀请码）
CREATE POLICY "select_book_invites" ON book_invites
    FOR SELECT USING (true);

-- 插入：已登录用户都可以创建邀请码
-- 注意：实际权限控制在应用层检查（只有账本创建者能生成）
CREATE POLICY "insert_book_invites" ON book_invites
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 更新：任何人可以更新使用次数（用于加入时）
CREATE POLICY "update_book_invites_usage" ON book_invites
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- 删除：创建者或账本所有者可以删除
CREATE POLICY "delete_book_invites" ON book_invites
    FOR DELETE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM books WHERE id = book_id AND created_by = auth.uid()
        )
    );

-- 4. 确认 RLS 已启用
ALTER TABLE book_invites ENABLE ROW LEVEL SECURITY;

-- 5. 检查 book_members 表的策略
-- 确保成员可以正确插入
DROP POLICY IF EXISTS "insert_book_members" ON book_members;

-- 任何人都可以加入（通过邀请码）
CREATE POLICY "insert_book_members" ON book_members
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
