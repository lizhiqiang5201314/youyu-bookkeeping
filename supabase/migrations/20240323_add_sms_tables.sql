-- 短信验证码表
CREATE TABLE IF NOT EXISTS sms_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 短信发送日志表
CREATE TABLE IF NOT EXISTS sms_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_sms_codes_phone ON sms_verification_codes(phone);
CREATE INDEX idx_sms_codes_expire ON sms_verification_codes(expire_at);
CREATE INDEX idx_sms_log_phone ON sms_send_log(phone);
CREATE INDEX idx_sms_log_created ON sms_send_log(created_at);

-- 添加RLS策略（仅服务端可访问）
ALTER TABLE sms_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_send_log ENABLE ROW LEVEL SECURITY;

-- 禁止客户端直接访问
CREATE POLICY "Deny all access" ON sms_verification_codes FOR ALL USING (false);
CREATE POLICY "Deny all access" ON sms_send_log FOR ALL USING (false);
