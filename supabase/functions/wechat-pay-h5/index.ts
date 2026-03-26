// Supabase Edge Function: 微信支付H5调起
// 路径: supabase/functions/wechat-pay-h5/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface PayRequest {
  orderId: string;
  amount: number;
  description: string;
  redirectUrl: string;
  userIp?: string;
}

// 生成随机字符串
function generateNonceStr(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 生成签名（微信支付V3签名）
async function generateSignature(
  method: string,
  url: string,
  timestamp: string,
  nonceStr: string,
  body: string,
  mchId: string,
  apiKey: string
): Promise<string> {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  
  // 使用 HMAC-SHA256 签名
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiKey);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (req: Request) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: PayRequest = await req.json();
    const { orderId, amount, description, redirectUrl } = body;

    if (!orderId || !amount || !description || !redirectUrl) {
      return new Response(
        JSON.stringify({ success: false, message: '参数不完整' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 从环境变量读取微信支付配置
    const mchId = Deno.env.get('WECHAT_MCH_ID') || '';
    const appId = Deno.env.get('WECHAT_APP_ID') || '';
    const apiKey = Deno.env.get('WECHAT_API_KEY') || '';
    const notifyUrl = Deno.env.get('WECHAT_NOTIFY_URL') || '';

    if (!mchId || !appId || !apiKey || !notifyUrl) {
      console.error('微信支付配置缺失');
      return new Response(
        JSON.stringify({ success: false, message: '支付配置未完善，请联系管理员' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 创建 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 获取用户IP
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userIp = clientIp.split(',')[0].trim();

    // 构建请求参数
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = generateNonceStr();

    const requestBody = JSON.stringify({
      mchid: mchId,
      out_trade_no: orderId,
      appid: appId,
      description,
      notify_url: notifyUrl,
      amount: {
        total: amount,
        currency: 'CNY',
      },
      scene_info: {
        payer_client_ip: userIp,
        h5_info: {
          type: 'Wap',
          app_url: 'https://your-app-domain.com',
          app_name: '有鱼记账',
        },
      },
    });

    // 生成签名
    const signature = await generateSignature(
      'POST',
      '/v3/pay/transactions/h5',
      timestamp,
      nonceStr,
      requestBody,
      mchId,
      apiKey
    );

    // 调用微信支付API
    const authToken = `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="",signature="${signature}"`;
    
    const response = await fetch('https://api.mch.weixin.qq.com/v3/pay/transactions/h5', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
        'Accept': 'application/json',
      },
      body: requestBody,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('微信支付API错误:', result);
      return new Response(
        JSON.stringify({ success: false, message: result.message || '调起支付失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 更新订单状态为已调起支付
    await supabase
      .from('pay_orders')
      .update({ 
        status: 'PROCESSING',
        prepay_id: result.prepay_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // 返回H5支付链接
    return new Response(
      JSON.stringify({
        success: true,
        mweb_url: result.h5_url,
        orderId,
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
