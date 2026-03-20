-- 临时禁用 RLS 测试
-- 如果这能解决问题，说明是 RLS 配置问题

-- 完全禁用 RLS（测试用）
ALTER TABLE book_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE book_members DISABLE ROW LEVEL SECURITY;

-- 删除所有策略避免冲突
DROP POLICY IF EXISTS "select_book_invites" ON book_invites;
DROP POLICY IF EXISTS "insert_book_invites" ON book_invites;
DROP POLICY IF EXISTS "update_book_invites" ON book_invites;
DROP POLICY IF EXISTS "delete_book_invites" ON book_invites;

DROP POLICY IF EXISTS "select_book_members" ON book_members;
DROP POLICY IF EXISTS "insert_book_members" ON book_members;
DROP POLICY IF EXISTS "delete_book_members" ON book_members;
