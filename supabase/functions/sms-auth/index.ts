import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as Dysmsapi20170525 from 'npm:@alicloud/dysmsapi20170525'

// ==================== 配置常量 ====================
const CONFIG = {
  // 验证码有效期（分钟）
  CODE_EXPIRE_MINUTES: Number(Deno.env.get('SMS_CODE_EXPIRE_MINUTES') || '5'),
  // 最大错误尝试次数
  MAX_ATTEMPTS: 3,
  // 验证码长度
  CODE_LENGTH: 6,
}

const SMS_REGION_ID = Deno.env.get('SMS_REGION_ID') || 'cn-hangzhou'
const SMS_ENDPOINT = Deno.env.get('SMS_ENDPOINT') || ''
const SMS_SIGN_NAME = Deno.env.get('SMS_SIGN_NAME') || ''
const SMS_TEMPLATE_CODE = Deno.env.get('SMS_TEMPLATE_CODE') || ''
const SMS_TEMPLATE_PARAM_KEY = Deno.env.get('SMS_TEMPLATE_PARAM_KEY') || 'code'
const SMS_DEBUG_MODE = Deno.env.get('SMS_DEBUG_MODE') === 'true'

// ==================== 工具函数 ====================

// 生成6位随机验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { message?: unknown; data?: { Message?: unknown } }
    if (typeof maybeError.message === 'string' && maybeError.message) {
      return maybeError.message
    }
    if (typeof maybeError.data?.Message === 'string' && maybeError.data.Message) {
      return maybeError.data.Message
    }
  }

  return fallback
}

function getSmsConfig() {
  return {
    accessKeyId: Deno.env.get('ALIBABA_CLOUD_ACCESS_KEY_ID') || '',
    accessKeySecret: Deno.env.get('ALIBABA_CLOUD_ACCESS_KEY_SECRET') || '',
    signName: SMS_SIGN_NAME,
    templateCode: SMS_TEMPLATE_CODE,
    templateParamKey: SMS_TEMPLATE_PARAM_KEY,
    regionId: SMS_REGION_ID,
    endpoint: SMS_ENDPOINT,
  }
}

function isSmsConfigured() {
  const config = getSmsConfig()
  return Boolean(
    config.accessKeyId &&
    config.accessKeySecret &&
    config.signName &&
    config.templateCode
  )
}

async function sendVerificationSms(phone: string, code: string) {
  const config = getSmsConfig()

  const client = new Dysmsapi20170525.default({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    regionId: config.regionId,
    endpoint: config.endpoint || undefined,
  })

  const templateParam = JSON.stringify({
    [config.templateParamKey]: code,
  })

  const request = new Dysmsapi20170525.SendSmsRequest({
    phoneNumbers: phone,
    signName: config.signName,
    templateCode: config.templateCode,
    templateParam,
  })

  const response = await client.sendSms(request)
  const responseCode = response.body?.code || ''

  if (responseCode !== 'OK') {
    throw new Error(response.body?.message || '阿里云短信发送失败')
  }

  return {
    bizId: response.body?.bizId || null,
    requestId: response.body?.requestId || null,
  }
}

// 标准化手机号
function normalizePhone(phone: string): string {
  phone = phone.trim().replace(/\s/g, '')
  if (phone.startsWith('+86')) phone = phone.slice(3)
  if (phone.startsWith('86')) phone = phone.slice(2)
  return phone
}

// 验证手机号
function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

// 获取客户端IP
function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  // 从连接信息获取（如果可用）
  return 'unknown'
}

// CORS 响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ==================== 主服务 ====================
serve(async (req) => {
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  // 只接受 POST 请求
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '只支持 POST 请求' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const clientIp = getClientIp(req)
  
  try {
    let body;
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: '请求体格式错误' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const { action, phone, code } = body
    
    if (!phone || typeof phone !== 'string') {
      return new Response(JSON.stringify({ error: '手机号不能为空' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const normalizedPhone = normalizePhone(phone)
    
    if (!isValidPhone(normalizedPhone)) {
      return new Response(JSON.stringify({ error: '手机号格式不正确' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // 初始化 Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SB_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || ''
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('环境变量未配置')
      return new Response(JSON.stringify({ error: '服务器配置错误' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // ==================== 发送验证码 ====================
    if (action === 'send') {
      const now = new Date()

      // 1. 生成验证码
      const newCode = generateCode()
      const expireAt = new Date(now.getTime() + CONFIG.CODE_EXPIRE_MINUTES * 60000).toISOString()
      
      // 2. 保存验证码
      const { error: upsertError } = await supabase
        .from('sms_verification_codes')
        .upsert({
          phone: normalizedPhone,
          code: newCode,
          expire_at: expireAt,
          used: false,
          attempt_count: 0,
          created_at: now.toISOString(),
        }, { onConflict: 'phone' })
      
      if (upsertError) {
        console.error('保存验证码失败:', upsertError)
        return new Response(JSON.stringify({ error: '验证码生成失败' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      try {
        if (isSmsConfigured()) {
          await sendVerificationSms(normalizedPhone, newCode)
        } else if (!SMS_DEBUG_MODE) {
          console.error('阿里云短信服务未配置完整')
          await supabase
            .from('sms_verification_codes')
            .update({ used: true, expire_at: now.toISOString() })
            .eq('phone', normalizedPhone)

          return new Response(JSON.stringify({ error: '短信服务未配置，请联系管理员' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      } catch (error) {
        console.error('发送阿里云短信失败:', error)
        await supabase
          .from('sms_verification_codes')
          .update({ used: true, expire_at: now.toISOString() })
          .eq('phone', normalizedPhone)

        return new Response(JSON.stringify({
          error: getErrorMessage(error, '验证码发送失败，请稍后重试'),
        }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // 3. 记录发送日志（包含IP）
      const { error: logError } = await supabase
        .from('sms_send_log')
        .insert({
          phone: normalizedPhone,
          ip_address: clientIp,
          created_at: now.toISOString(),
        })
      
      if (logError) {
        console.error('记录发送日志失败:', logError)
      }
      
      if (SMS_DEBUG_MODE) {
        console.log(`[调试模式] 验证码 for ${normalizedPhone}: ${newCode}`)
      }
      
      return new Response(JSON.stringify({
        success: true, 
        message: '验证码已发送',
        code: SMS_DEBUG_MODE ? newCode : undefined,
        expireMinutes: CONFIG.CODE_EXPIRE_MINUTES
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    // ==================== 验证验证码 ====================
    if (action === 'verify') {
      if (!code || typeof code !== 'string') {
        return new Response(JSON.stringify({ error: '验证码不能为空' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      const trimmedCode = code.trim()
      
      if (!/^\d{6}$/.test(trimmedCode)) {
        return new Response(JSON.stringify({ error: '验证码必须是6位数字' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // 1. 查询验证码记录
      const { data: verifyData, error: verifyError } = await supabase
        .from('sms_verification_codes')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('used', false)
        .gte('expire_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (verifyError) {
        console.error('查询验证码失败:', verifyError)
        return new Response(JSON.stringify({ error: '验证服务暂时不可用' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // 2. 验证码不存在或已过期
      if (!verifyData) {
        return new Response(JSON.stringify({ 
          error: '验证码已过期，请重新获取',
          code: 'EXPIRED'
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // 3. 检查错误次数
      const currentAttempts = verifyData.attempt_count || 0
      if (currentAttempts >= CONFIG.MAX_ATTEMPTS) {
        // 错误次数过多，标记为已使用（作废）
        await supabase
          .from('sms_verification_codes')
          .update({ used: true })
          .eq('id', verifyData.id)
        
        return new Response(JSON.stringify({ 
          error: `错误次数过多(${CONFIG.MAX_ATTEMPTS}次)，请重新获取验证码`,
          code: 'TOO_MANY_ATTEMPTS'
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // 4. 验证验证码是否正确
      if (verifyData.code !== trimmedCode) {
        // 更新错误次数
        const newAttempts = currentAttempts + 1
        const remainingAttempts = CONFIG.MAX_ATTEMPTS - newAttempts
        
        await supabase
          .from('sms_verification_codes')
          .update({ attempt_count: newAttempts })
          .eq('id', verifyData.id)
        
        return new Response(JSON.stringify({ 
          error: `验证码错误，还剩${remainingAttempts}次机会`,
          code: 'INVALID_CODE',
          remainingAttempts
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // 5. 验证码正确 - 标记为已使用
      await supabase
        .from('sms_verification_codes')
        .update({ used: true })
        .eq('id', verifyData.id)
      
      // 6. 检查用户是否存在
      const { data: existingUser, error: userError } = await supabase
        .from('app_users')
        .select('*')
        .eq('phone', normalizedPhone)
        .maybeSingle()
      
      if (userError) {
        console.error('查询用户失败:', userError)
        return new Response(JSON.stringify({ error: '用户查询失败' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      let userId = existingUser?.id
      let isNewUser = false
      let hasPassword = Boolean(existingUser?.password_hash)
      
      // 7. 创建新用户
      if (!existingUser) {
        const newUserData = {
          phone: normalizedPhone,
          nickname: `用户${normalizedPhone.slice(-4)}`,
          password_hash: null,
          created_at: new Date().toISOString(),
        }
        
        const { data: newUser, error: createError } = await supabase
          .from('app_users')
          .insert(newUserData)
          .select()
          .single()
        
        if (createError) {
          console.error('创建用户失败:', createError)
          return new Response(JSON.stringify({ 
            error: '账号创建失败',
            details: createError.message
          }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        userId = newUser.id
        isNewUser = true
        hasPassword = false
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: isNewUser ? '注册成功' : '登录成功',
        userId: userId,
        phone: normalizedPhone,
        isNewUser: isNewUser,
        hasPassword
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    return new Response(JSON.stringify({ error: '未知操作，action 必须是 send 或 verify' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error: any) {
    console.error('服务器错误:', error)
    return new Response(JSON.stringify({ 
      error: '服务器内部错误',
      message: Deno.env.get('DENO_ENV') === 'development' ? error.message : undefined
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
