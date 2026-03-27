import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, phone, newPassword, verificationCode, currentPassword } = await req.json();

    if (!userId || !phone || !newPassword) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: '密码长度不能少于6位' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizePhone = (value: string) => value.trim().replace(/\s/g, '').replace(/^\+?86/, '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SB_URL') || '';
    const supabaseServiceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase admin env is missing for set-password');
      return new Response(
        JSON.stringify({ error: '设置密码服务配置错误，请稍后重试' }),
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

    const normalizedPhone = normalizePhone(phone);

    const { data: user, error } = await supabase
      .from('app_users')
      .select('id, phone, password_hash')
      .eq('id', userId)
      .single();

    if (error || !user || normalizePhone(user.phone) !== normalizedPhone) {
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');

    let verificationRecordId: string | null = null;

    if (user.password_hash) {
      if (verificationCode) {
        const trimmedCode = String(verificationCode).trim();

        if (!/^\d{6}$/.test(trimmedCode)) {
          return new Response(
            JSON.stringify({ error: '验证码必须是6位数字' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: verifyData, error: verifyError } = await supabase
          .from('sms_verification_codes')
          .select('id, code, attempt_count, expire_at, used')
          .eq('phone', normalizedPhone)
          .eq('used', false)
          .gte('expire_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (verifyError) {
          console.error('查询验证码失败:', verifyError);
          return new Response(
            JSON.stringify({ error: '验证服务暂时不可用' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!verifyData) {
          return new Response(
            JSON.stringify({ error: '验证码已过期，请重新获取' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const currentAttempts = Number(verifyData.attempt_count || 0);
        const maxAttempts = 3;

        if (currentAttempts >= maxAttempts) {
          await supabase
            .from('sms_verification_codes')
            .update({ used: true })
            .eq('id', verifyData.id);

          return new Response(
            JSON.stringify({ error: `错误次数过多(${maxAttempts}次)，请重新获取验证码` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (verifyData.code !== trimmedCode) {
          const newAttempts = currentAttempts + 1;
          const remainingAttempts = maxAttempts - newAttempts;

          await supabase
            .from('sms_verification_codes')
            .update({ attempt_count: newAttempts })
            .eq('id', verifyData.id);

          return new Response(
            JSON.stringify({ error: `验证码错误，还剩${Math.max(remainingAttempts, 0)}次机会` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        verificationRecordId = verifyData.id;
      } else if (currentPassword) {
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: '当前密码错误' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: '请输入验证码' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('app_users')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    if (updateError) {
      console.error('设置密码失败:', updateError);
      return new Response(
        JSON.stringify({ error: '设置密码失败，请稍后重试' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (verificationRecordId) {
      const { error: markUsedError } = await supabase
        .from('sms_verification_codes')
        .update({ used: true })
        .eq('id', verificationRecordId);

      if (markUsedError) {
        console.error('标记验证码使用状态失败:', markUsedError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, hasPassword: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('设置密码错误:', error);
    return new Response(
      JSON.stringify({ error: '设置密码失败，请稍后重试' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
