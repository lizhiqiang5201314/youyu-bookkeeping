// Supabase Edge Function: 创建支付订单
// 路径: supabase/functions/create-pay-order/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { crypto } from 'jsr:@std/crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface CreateOrderRequest {
  userId: string;
  type: 'COUPLE' | 'FAMILY';
  plan: 'MONTHLY' | 'YEARLY';
  amount: number; // 单位：分
  description: string;
}

// 生成订单号
function generateOrderNo(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `YY${timestamp}${random}`; // YY = 有鱼记账
}

Deno.serve(async (req: Request) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateOrderRequest = await req.json();
    const { userId, type, plan, amount, description } = body;

    // 验证参数
    if (!userId || !type || !plan || !amount || !description) {
      return new Response(
        JSON.stringify({ success: false, message: '参数不完整' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 验证金额（情侣/家庭会员的定价）
    const validAmounts = [990, 2990, 4990, 19990]; // 9.9, 29.9, 49.9, 199.9
    if (!validAmounts.includes(amount)) {
      return new Response(
        JSON.stringify({ success: false, message: '金额不合法' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 创建 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 生成订单号
    const orderNo = generateOrderNo();

    // 插入订单到数据库
    const { data, error } = await supabase
      .from('pay_orders')
      .insert({
        id: orderNo,
        user_id: userId,
        type,
        plan,
        amount,
        description,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('创建订单失败:', error);
      return new Response(
        JSON.stringify({ success: false, message: '创建订单失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderNo,
        order: data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
