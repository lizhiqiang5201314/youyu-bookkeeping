-- 修复 app_users 表的 password_hash 约束，允许短信登录用户没有密码
ALTER TABLE app_users ALTER COLUMN password_hash DROP NOT NULL;