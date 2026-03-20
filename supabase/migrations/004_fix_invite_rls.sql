-- 修复邀请码查询权限问题
-- 允许任何人查询有效的邀请码（用于加入账本时验证）

-- 删除旧的查询策略
DROP POLICY IF EXISTS "select_book_invites" ON book_invites;

-- 创建新的查询策略：允许任何人查询（用于验证邀请码）
CREATE POLICY "select_book_invites" ON book_invites
    FOR SELECT USING (true);

-- 其他策略保持不变
-- insert/update/delete 仍然只有创建者可以操作
