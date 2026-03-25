// Edge Function: 密码登录
// 处理密码验证，不将 password_hash 暴露到前端

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // 处理 CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return new Response(
        JSON.stringify({ error: '手机号和密码不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 创建 Supabase 客户端
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 查询用户
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('id, phone, nickname, avatar, created_at, password_hash')
      .eq('phone', phone)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: '账号不存在' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 使用 Deno 的 bcrypt 验证密码
    const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: '密码错误' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 返回用户信息（不包含 password_hash）
    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname || `用户${user.phone.slice(-4)}`,
          avatar: user.avatar,
          createdAt: user.created_at,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('登录错误:', error);
    return new Response(
      JSON.stringify({ error: '登录失败，请重试' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
