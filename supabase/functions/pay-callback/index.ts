// Supabase Edge Function: 微信支付回调处理
// 路径: supabase/functions/pay-callback/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

Deno.serve(async (req: Request) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 解析微信回调数据
    const callbackData = await req.json();
    
    console.log('微信支付回调:', JSON.stringify(callbackData));

    const {
      id, // 微信支付订单号
      out_trade_no, // 商户订单号
      transaction_id, // 微信支付订单号
      trade_state, // 支付状态 SUCCESS/CLOSED/REVOKED/REFUND/NOTPAY
      success_time, // 支付完成时间
      payer, // 支付者信息
      amount, // 订单金额
    } = callbackData;

    // 创建 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 查询订单
    const { data: order, error: orderError } = await supabase
      .from('pay_orders')
      .select('*')
      .eq('id', out_trade_no)
      .single();

    if (orderError || !order) {
      console.error('订单不存在:', out_trade_no);
      return new Response(
        JSON.stringify({ code: 'FAIL', message: '订单不存在' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 验证金额
    if (amount && amount.total !== order.amount) {
      console.error('金额不匹配:', amount.total, '!==', order.amount);
      return new Response(
        JSON.stringify({ code: 'FAIL', message: '金额不匹配' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 处理支付成功
    if (trade_state === 'SUCCESS') {
      // 更新订单状态
      const { error: updateError } = await supabase
        .from('pay_orders')
        .update({
          status: 'PAID',
          transaction_id: transaction_id || id,
          paid_at: success_time || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', out_trade_no);

      if (updateError) {
        console.error('更新订单失败:', updateError);
        return new Response(
          JSON.stringify({ code: 'FAIL', message: '更新订单失败' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 创建会员订阅
      const { type, plan, user_id } = order;
      
      // 计算会员有效期
      const startDate = new Date();
      const endDate = new Date();
      const durationDays = plan === 'MONTHLY' ? 30 : 365;
      endDate.setDate(endDate.getDate() + durationDays);

      // 检查是否已有该类型订阅
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user_id)
        .eq('type', type)
        .eq('status', 'ACTIVE')
        .single();

      if (existingSub) {
        // 续费：延长有效期
        const currentEndDate = new Date(existingSub.end_date);
        const newEndDate = currentEndDate > new Date() 
          ? new Date(currentEndDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
          : endDate;

        await supabase
          .from('subscriptions')
          .update({
            end_date: newEndDate.toISOString(),
            auto_renew: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSub.id);
      } else {
        // 新订阅
        await supabase
          .from('subscriptions')
          .insert({
            user_id: user_id,
            type: type,
            plan: plan,
            price: order.amount / 100, // 分转元
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'ACTIVE',
            auto_renew: true,
          });
      }

      console.log('支付成功处理完成:', out_trade_no);
    } else {
      // 其他状态：更新订单状态
      await supabase
        .from('pay_orders')
        .update({
          status: trade_state === 'CLOSED' ? 'CLOSED' : 'FAILED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', out_trade_no);
    }

    // 返回成功响应给微信
    return new Response(
      JSON.stringify({ code: 'SUCCESS', message: 'OK' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('回调处理错误:', error);
    return new Response(
      JSON.stringify({ code: 'FAIL', message: '处理失败' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
