-- 创建支付订单表
-- 用于存储微信支付订单信息

-- 支付订单表
CREATE TABLE IF NOT EXISTS pay_orders (
    id VARCHAR(32) PRIMARY KEY, -- 订单号，格式：YY + 时间戳 + 随机码
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('COUPLE', 'FAMILY')),
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('MONTHLY', 'YEARLY')),
    amount INTEGER NOT NULL, -- 金额（单位：分）
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'CLOSED', 'FAILED', 'REFUNDED')),
    transaction_id VARCHAR(64), -- 微信支付订单号
    prepay_id VARCHAR(64), -- 微信预支付ID
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX idx_pay_orders_user_id ON pay_orders(user_id);
CREATE INDEX idx_pay_orders_status ON pay_orders(status);
CREATE INDEX idx_pay_orders_created_at ON pay_orders(created_at);

-- 启用 RLS
ALTER TABLE pay_orders ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的订单
CREATE POLICY "Users can view own orders" ON pay_orders
    FOR SELECT USING (auth.uid() = user_id);

-- 用户只能创建自己的订单
CREATE POLICY "Users can create own orders" ON pay_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_pay_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pay_orders_updated_at ON pay_orders;

CREATE TRIGGER trigger_update_pay_orders_updated_at
    BEFORE UPDATE ON pay_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_pay_orders_updated_at();
