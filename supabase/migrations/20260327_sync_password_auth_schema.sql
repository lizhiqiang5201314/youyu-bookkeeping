ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS avatar TEXT;

ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE app_users
ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE sms_verification_codes
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;

ALTER TABLE sms_send_log
ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_sms_codes_attempts ON sms_verification_codes(attempt_count);
CREATE INDEX IF NOT EXISTS idx_sms_log_ip ON sms_send_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_sms_log_ip_created ON sms_send_log(ip_address, created_at);
