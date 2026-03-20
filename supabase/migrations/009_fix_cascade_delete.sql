-- 确保删除账本时自动清理关联数据
-- 如果外键没有设置级联删除，需要添加

-- 1. 检查当前外键约束
-- \d book_members
-- \d book_invites

-- 2. 如果 book_members 没有级联删除，添加
-- 先删除旧的外键约束（如果存在）
ALTER TABLE book_members 
DROP CONSTRAINT IF EXISTS book_members_book_id_fkey;

-- 添加带级联删除的外键约束
ALTER TABLE book_members
ADD CONSTRAINT book_members_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

-- 3. 如果 book_invites 没有级联删除，添加
ALTER TABLE book_invites 
DROP CONSTRAINT IF EXISTS book_invites_book_id_fkey;

ALTER TABLE book_invites
ADD CONSTRAINT book_invites_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

-- 4. categories 表的外键（如果存在）
ALTER TABLE categories 
DROP CONSTRAINT IF EXISTS categories_book_id_fkey;

ALTER TABLE categories
ADD CONSTRAINT categories_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

-- 5. transactions 表的外键（如果存在）
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_book_id_fkey;

ALTER TABLE transactions
ADD CONSTRAINT transactions_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

-- 6. budgets 表的外键（如果存在）
ALTER TABLE budgets 
DROP CONSTRAINT IF EXISTS budgets_book_id_fkey;

ALTER TABLE budgets
ADD CONSTRAINT budgets_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

-- 验证：创建者删除账本后，所有成员记录应该自动删除
-- 测试步骤：
-- 1. 创建情侣账本
-- 2. 生成邀请码
-- 3. 另一用户加入
-- 4. 创建者删除账本
-- 5. 检查 book_members 中该账本的所有记录是否已删除
