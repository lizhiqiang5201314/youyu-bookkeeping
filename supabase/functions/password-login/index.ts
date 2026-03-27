// Edge Function: 密码登录
// 处理密码验证，不将 password_hash 暴露到前端

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SB_URL') || '';
    const supabaseServiceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase admin env is missing for password-login');
      return new Response(
        JSON.stringify({ error: '登录服务配置错误，请稍后重试' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
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
        JSON.stringify({ error: '用户不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user.password_hash) {
      return new Response(
        JSON.stringify({ error: '该账号尚未设置密码，请先使用验证码登录' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          hasPassword: true,
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
