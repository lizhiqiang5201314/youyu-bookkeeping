// Supabase Edge Function: 查询订单状态
// 路径: supabase/functions/check-order/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req: Request) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 从 URL 获取订单号
    const url = new URL(req.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, message: '缺少订单号' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 创建 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 查询订单
    const { data: order, error } = await supabase
      .from('pay_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return new Response(
        JSON.stringify({ success: false, message: '订单不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 如果订单是处理中状态，尝试查询微信支付状态
    if (order.status === 'PROCESSING') {
      // 这里可以调用微信支付查询订单API
      // 为简化，暂时直接返回订单状态
      // 实际项目中建议定期轮询或等待回调
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          orderId: order.id,
          status: order.status,
          amount: order.amount,
          type: order.type,
          plan: order.plan,
          createdAt: order.created_at,
          paidAt: order.paid_at,
          transactionId: order.transaction_id,
        },
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
