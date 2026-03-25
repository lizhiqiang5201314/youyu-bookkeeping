-- 添加验证码错误次数字段
ALTER TABLE sms_verification_codes 
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;

-- 添加IP地址字段到发送日志
ALTER TABLE sms_send_log 
ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- 创建IP索引
CREATE INDEX IF NOT EXISTS idx_sms_log_ip ON sms_send_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_sms_log_ip_created ON sms_send_log(ip_address, created_at);

-- 创建错误次数索引
CREATE INDEX IF NOT EXISTS idx_sms_codes_attempts ON sms_verification_codes(attempt_count);