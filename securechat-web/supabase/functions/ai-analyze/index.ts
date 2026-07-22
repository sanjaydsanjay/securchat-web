import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || ''
const MODEL = Deno.env.get('AI_MODEL') || 'openai/gpt-4o-mini'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').concat([
  'http://localhost:5179',
  'http://127.0.0.1:5179',
  'http://localhost:3000',
  'http://10.149.61.225:5179',
]).filter(Boolean)

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  const originLower = origin.toLowerCase()
  return ALLOWED_ORIGINS.some((allowed) => {
    if (allowed.startsWith('https://*.')) {
      return originLower.endsWith(allowed.slice(9).toLowerCase())
    }
    if (allowed.endsWith(':5179') && allowed.startsWith('http://')) {
      const url = new URL(origin)
      return url.port === '5179' && url.protocol === 'http:'
    }
    return originLower === allowed.toLowerCase()
  })
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin')
  const allowOrigin = origin && isOriginAllowed(origin) ? origin : 'http://localhost:5179'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface ModerationResult {
  safe: boolean
  risk_score: number
  category: string
  severity: string
  reason: string
  language: string
  confidence: number
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)
  const startTime = Date.now()

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const { message_id, content, sender_unique_id } = await req.json()

    if (!content || !message_id) {
      return new Response(
        JSON.stringify({ allow: true, risk: 'none', category: 'none', warning: '' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const analysis = await analyzeContent(content)

    const isUnsafe = !analysis.safe
    const severityMapped = analysis.severity === 'critical' ? 'critical'
      : analysis.severity === 'high' ? 'high'
      : analysis.severity === 'medium' ? 'medium'
      : analysis.severity === 'low' ? 'low'
      : 'none'

    const shouldBlock = isUnsafe && (analysis.severity === 'critical' || analysis.severity === 'high')
    const shouldBan = analysis.severity === 'critical' || (analysis.severity === 'high' && analysis.confidence > 0.7)

    const updatePayload: Record<string, unknown> = {
      ai_analyzed: true,
      ai_threat_level: severityMapped,
      ai_categories: isUnsafe ? [analysis.category] : [],
      ai_confidence: analysis.confidence,
    }

    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update(updatePayload)
      .eq('id', message_id)

    if (updateError) {
      console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message: 'Failed to update message with AI analysis',
        message_id,
        error: updateError.message,
      }))
    }

    if (shouldBan && sender_unique_id) {
      console.log(JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message: `Banning user ${sender_unique_id} for ${analysis.severity} threat: ${analysis.category}`,
        sender_unique_id,
        severity: analysis.severity,
        category: analysis.category,
      }))

      const { error: banError } = await supabaseAdmin
        .from('users')
        .update({
          is_banned: true,
          ban_reason: `AI detection: ${analysis.category} - ${analysis.reason}`,
          ban_expires_at: null,
        })
        .eq('unique_id', sender_unique_id)

      if (banError) {
        console.error(JSON.stringify({
          level: 'error',
          timestamp: new Date().toISOString(),
          message: 'Failed to ban user',
          sender_unique_id,
          error: banError.message,
        }))
      }
    }

    const auditEntry = {
      actor_id: sender_unique_id ? `user_${sender_unique_id}` : 'anonymous',
      actor_unique_id: sender_unique_id || null,
      action: 'ai_moderation',
      resource_type: 'messages',
      resource_id: message_id,
      new_values: {
        safe: analysis.safe,
        risk_score: analysis.risk_score,
        category: analysis.category,
        severity: analysis.severity,
        reason: analysis.reason,
        language: analysis.language,
        confidence: analysis.confidence,
        action_taken: shouldBlock ? 'block' : 'allow',
        user_banned: shouldBan,
        response_time_ms: Date.now() - startTime,
      },
    }

    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert(auditEntry)

    if (auditError) {
      console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message: 'Failed to insert audit log',
        error: auditError.message,
      }))
    }

    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message_id,
      sender_unique_id,
      safe: analysis.safe,
      risk_score: analysis.risk_score,
      category: analysis.category,
      severity: analysis.severity,
      language: analysis.language,
      confidence: analysis.confidence,
      action_taken: shouldBlock ? 'block' : 'allow',
      user_banned: shouldBan,
      response_time_ms: Date.now() - startTime,
    }))

    return new Response(JSON.stringify({
      allow: !shouldBlock,
      risk: severityMapped,
      category: isUnsafe ? analysis.category : 'none',
      warning: shouldBlock ? analysis.reason : '',
      ban: shouldBan,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: 'Unhandled exception in ai-analyze',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack?.split('\n').slice(0, 3).join('\n') } : String(error),
    }))

    return new Response(
      JSON.stringify({
        allow: true,
        risk: 'none',
        category: 'none',
        warning: '',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

const SYSTEM_PROMPT = `You are a multilingual content safety classifier for a secure chat application. Your task is to analyze messages for harmful content across 40+ categories.

Supported languages:
- English
- Kannada (ಕನ್ನಡ)
- Hindi (हिन्दी)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Malayalam (മലയാളം)

Categories to detect:
1. murder_threats - Explicit threats to kill someone
2. death_threats - Threats of death
3. violence - Any violent content
4. assault - Threats or descriptions of physical assault
5. terrorism - Support for or threats of terrorism
6. bomb_threats - Threats involving explosives
7. kidnapping - Threats or discussion of kidnapping
8. human_trafficking - Discussion of human trafficking
9. child_exploitation - Any child exploitation content
10. self_harm - Supportive detection of self-harm discussion
11. suicide - Supportive detection of suicide discussion
12. blackmail - Blackmail threats
13. extortion - Extortion demands
14. ransom - Ransom demands
15. harassment - Harassing content
16. bullying - Bullying behavior
17. hate_speech - Hate speech against groups
18. discrimination - Discriminatory content
19. racism - Racist content
20. religious_hatred - Hatred based on religion
21. cyberstalking - Online stalking behavior
22. stalking - Stalking behavior or threats
23. doxxing - Sharing private information maliciously
24. identity_theft - Identity theft attempts
25. scam - Scam attempts
26. fraud - Fraudulent content
27. phishing - Phishing attempts
28. financial_fraud - Financial fraud
29. fake_investment_scams - Fake investment schemes
30. romance_scams - Romance scam attempts
31. account_theft - Account stealing attempts
32. password_stealing - Password stealing attempts
33. malware_distribution - Malware distribution
34. social_engineering - Social engineering attempts
35. impersonation - Impersonation of others
36. illegal_drug_selling - Drug sales
37. weapon_selling - Weapon sales
38. illegal_services - Illegal service offerings
39. explicit_threats - Any explicit threats
40. criminal_planning - Planning criminal activity

Detection guidelines:
- Detect INTENT and similar wording, not just exact keywords
- Consider context, tone, and implied meaning
- Support all listed languages equally — analyze the meaning regardless of language
- Detect creative phrasing, metaphors, euphemisms, and indirect threats
- For self_harm and suicide categories, detect supportive concerns (e.g., "I want to hurt myself") — do NOT flag educational or supportive discussions
- For threats, consider: "I will end your life", "Wait until I find you", "You will regret this", "Pay me or I will expose your photos" as harmful

Respond ONLY with valid JSON (no markdown, no code fences, no explanation text outside JSON):
{"safe": boolean, "risk_score": number (0-100), "category": "safe" | category_name, "severity": "low" | "medium" | "high" | "critical", "reason": "brief explanation", "language": "English" | "Kannada" | "Hindi" | "Tamil" | "Telugu" | "Malayalam", "confidence": number (0.0-1.0)}

Risk score guidelines:
- 0: Completely safe
- 1-30: Low risk, minor concerns
- 31-60: Medium risk, suspicious content
- 61-85: High risk, likely harmful
- 86-100: Critical risk, immediate threat

Severity mapping:
- low: Minor or ambiguous concerns (risk_score 1-30)
- medium: Concerning but not immediately dangerous (risk_score 31-60)
- high: Likely harmful, should be blocked (risk_score 61-85)
- critical: Immediate danger, must be blocked and user banned (risk_score 86-100)

Examples:
- "I will end your life" -> {"safe":false,"risk_score":95,"category":"death_threats","severity":"critical","reason":"Explicit death threat detected.","language":"English","confidence":0.99}
- "Wait until I find you" -> {"safe":false,"risk_score":72,"category":"explicit_threats","severity":"high","reason":"Implied threat of physical confrontation.","language":"English","confidence":0.88}
- "You will regret this" -> {"safe":false,"risk_score":55,"category":"harassment","severity":"medium","reason":"Threatening language suggesting future harm.","language":"English","confidence":0.76}
- "Pay me or I will expose your photos" -> {"safe":false,"risk_score":96,"category":"blackmail","severity":"critical","reason":"Blackmail threat demanding payment to prevent exposure of private content.","language":"English","confidence":0.99}
- "Hello, how are you?" -> {"safe":true,"risk_score":0,"category":"safe","severity":"low","reason":"Normal conversational message.","language":"English","confidence":0.99}
- "What is the weather today?" -> {"safe":true,"risk_score":0,"category":"safe","severity":"low","reason":"Harmless inquiry about weather.","language":"English","confidence":0.99}

Use "safe" category when message is benign. Set safe=true for harmless messages.`

async function analyzeContent(content: string): Promise<ModerationResult> {
  if (!OPENROUTER_API_KEY) {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message: 'OPENROUTER_API_KEY is not configured',
    }))
    return {
      safe: true,
      risk_score: 0,
      category: 'unknown',
      severity: 'low',
      reason: 'AI unavailable',
      language: 'unknown',
      confidence: 0,
    }
  }

  let response: Response
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://securechat-ai.vercel.app',
        'X-Title': 'SecureChat AI Moderation',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        temperature: 0.1,
        max_tokens: 350,
      }),
    })
  } catch (fetchError) {
    const errMsg = fetchError instanceof Error ? fetchError.message : String(fetchError)
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: 'Network error calling OpenRouter API',
      error: errMsg,
    }))
    return {
      safe: true,
      risk_score: 0,
      category: 'unknown',
      severity: 'low',
      reason: 'AI unavailable',
      language: 'unknown',
      confidence: 0,
    }
  }

  if (!response.ok) {
    let errorBody = ''
    try {
      errorBody = await response.text()
    } catch {
      errorBody = 'Could not read error body'
    }

    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: 'OpenRouter API returned error',
      status: response.status,
      statusText: response.statusText,
      body: errorBody.substring(0, 1000),
    }))

    if (response.status === 429) {
      return {
        safe: true,
        risk_score: 0,
        category: 'unknown',
        severity: 'low',
        reason: 'AI rate limited — try again later',
        language: 'unknown',
        confidence: 0,
      }
    }

    return {
      safe: true,
      risk_score: 0,
      category: 'unknown',
      severity: 'low',
      reason: 'AI unavailable',
      language: 'unknown',
      confidence: 0,
    }
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: 'Failed to parse OpenRouter response JSON',
    }))
    return {
      safe: true,
      risk_score: 0,
      category: 'unknown',
      severity: 'low',
      reason: 'AI unavailable',
      language: 'unknown',
      confidence: 0,
    }
  }

  const chatResponse = data as {
    choices?: Array<{
      message?: {
        content?: string
        refusal?: string
      }
    }>
  }

  const choice = chatResponse.choices?.[0]
  if (!choice) {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: 'OpenRouter response missing choices',
    }))
    return {
      safe: true,
      risk_score: 0,
      category: 'unknown',
      severity: 'low',
      reason: 'AI unavailable',
      language: 'unknown',
      confidence: 0,
    }
  }

  const messageContent = choice.message?.content
  const refusal = choice.message?.refusal

  if (refusal) {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message: 'OpenRouter refused to analyze content',
      refusal,
    }))
    return {
      safe: false,
      risk_score: 85,
      category: 'explicit_threats',
      severity: 'high',
      reason: 'Content analysis refused — potentially harmful content',
      language: 'unknown',
      confidence: 0.85,
    }
  }

  if (!messageContent) {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message: 'OpenRouter returned empty content',
    }))
    return {
      safe: true,
      risk_score: 0,
      category: 'unknown',
      severity: 'low',
      reason: 'AI unavailable',
      language: 'unknown',
      confidence: 0,
    }
  }

  try {
    const cleaned = messageContent
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    return {
      safe: typeof parsed.safe === 'boolean' ? parsed.safe : true,
      risk_score: typeof parsed.risk_score === 'number' ? Math.max(0, Math.min(100, parsed.risk_score)) : 0,
      category: typeof parsed.category === 'string' && parsed.category ? parsed.category : 'safe',
      severity: ['low', 'medium', 'high', 'critical'].includes(parsed.severity) ? parsed.severity : 'low',
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
      language: typeof parsed.language === 'string' ? parsed.language : 'unknown',
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
    }
  } catch (parseError) {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: 'Failed to parse LLM response as JSON',
      raw: messageContent.substring(0, 500),
    }))
    return {
      safe: true,
      risk_score: 0,
      category: 'unknown',
      severity: 'low',
      reason: 'AI unavailable',
      language: 'unknown',
      confidence: 0,
    }
  }
}
