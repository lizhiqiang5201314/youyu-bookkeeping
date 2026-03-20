-- 修复 book_members 的无限递归问题
-- 策略中引用了自身导致循环

-- 1. 删除所有 book_members 的策略
DROP POLICY IF EXISTS "select_book_members" ON book_members;
DROP POLICY IF EXISTS "insert_book_members" ON book_members;
DROP POLICY IF EXISTS "delete_book_members" ON book_members;

-- 2. 创建正确的策略
-- 查询：任何人可以查看（简化版，避免递归）
CREATE POLICY "select_book_members" ON book_members
    FOR SELECT USING (true);

-- 插入：已登录用户可以加入
CREATE POLICY "insert_book_members" ON book_members
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 删除：只能删除自己，或账本创建者可以删除任何成员
CREATE POLICY "delete_book_members" ON book_members
    FOR DELETE USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM books b 
            WHERE b.id = book_members.book_id 
            AND b.created_by = auth.uid()
        )
    );

-- 3. 启用 RLS
ALTER TABLE book_members ENABLE ROW LEVEL SECURITY;
