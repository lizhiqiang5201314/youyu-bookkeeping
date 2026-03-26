-- ============================================  
-- Supabase Storage avatars 存储桶 RLS 策略配置
-- 适用于自定义用户系统（非 Supabase Auth）
-- ============================================

-- 1. 先启用 avatars 桶的 RLS（如果还没启用）
-- 注意：需要在 Supabase 控制台手动创建 avatars bucket 并开启 RLS

-- 2. 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "允许上传头像" ON storage.objects;
DROP POLICY IF EXISTS "允许更新头像" ON storage.objects;
DROP POLICY IF EXISTS "允许读取头像" ON storage.objects;
DROP POLICY IF EXISTS "允许删除头像" ON storage.objects;

-- 3. 允许插入（上传）- 任何人都可以上传到 avatars 桶
-- 因为用的是自定义认证，无法在 RLS 中验证用户，只能靠应用层控制
CREATE POLICY "允许上传头像" 
ON storage.objects 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (bucket_id = 'avatars');

-- 4. 允许更新
CREATE POLICY "允许更新头像" 
ON storage.objects 
FOR UPDATE 
TO anon, authenticated 
USING (bucket_id = 'avatars');

-- 5. 允许读取（公开访问）
CREATE POLICY "允许读取头像" 
ON storage.objects 
FOR SELECT 
TO anon, authenticated 
USING (bucket_id = 'avatars');

-- 6. 允许删除
CREATE POLICY "允许删除头像" 
ON storage.objects 
FOR DELETE 
TO anon, authenticated 
USING (bucket_id = 'avatars');

-- ============================================
-- 替代方案：如果你只想允许特定操作
-- ============================================

-- 如果上面不行，试试这个最宽松的版本（仅开发环境使用）：
-- CREATE POLICY "允许所有操作" 
-- ON storage.objects 
-- FOR ALL 
-- TO anon, authenticated 
-- USING (bucket_id = 'avatars')
-- WITH CHECK (bucket_id = 'avatars');
