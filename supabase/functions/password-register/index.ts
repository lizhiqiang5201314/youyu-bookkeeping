// Edge Function: 密码注册
// 在服务端处理密码加密，不将加密逻辑暴露到前端

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

    // 密码长度验证
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: '密码长度不能少于6位' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 创建 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SB_URL') || '';
    const supabaseServiceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase admin env is missing for password-register');
      return new Response(
        JSON.stringify({ error: '注册服务配置错误，请稍后重试' }),
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

    // 检查手机号是否已存在
    const { data: existingUser, error: checkError } = await supabase
      .from('app_users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: '该手机号已注册' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 使用 Deno 的 bcrypt 加密密码
    const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const { data: newUser, error: insertError } = await supabase
      .from('app_users')
      .insert({
        phone,
        password_hash: passwordHash,
        nickname: `用户${phone.slice(-4)}`,
      })
      .select('id, phone, nickname, avatar, created_at')
      .single();

    if (insertError || !newUser) {
      console.error('注册失败:', insertError);
      return new Response(
        JSON.stringify({ error: '注册失败，请重试' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 返回用户信息
    return new Response(
      JSON.stringify({
        user: {
          id: newUser.id,
          phone: newUser.phone,
          nickname: newUser.nickname,
          avatar: newUser.avatar,
          hasPassword: true,
          createdAt: newUser.created_at,
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('注册错误:', error);
    return new Response(
      JSON.stringify({ error: '注册失败，请重试' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
