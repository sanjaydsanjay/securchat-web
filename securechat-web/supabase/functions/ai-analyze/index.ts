import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || ''
const MODEL = 'openai/gpt-4o-mini'

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

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

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

    const updatePayload: Record<string, unknown> = {
      ai_analyzed: true,
      ai_threat_level: analysis.threat_level,
      ai_categories: analysis.categories,
      ai_confidence: analysis.confidence,
    }

    await supabaseAdmin
      .from('messages')
      .update(updatePayload)
      .eq('id', message_id)

    const shouldBlock = analysis.recommended_action === 'block' || analysis.threat_level === 'critical' || analysis.threat_level === 'high'
    const shouldBan = analysis.threat_level === 'critical' || (analysis.threat_level === 'high' && analysis.confidence > 0.7)

    if (shouldBan && sender_unique_id) {
      console.log(JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message: `Banning user ${sender_unique_id} for ${analysis.threat_level} threat: ${analysis.categories.join(', ')}`,
        sender_unique_id,
        threat_level: analysis.threat_level,
        categories: analysis.categories,
      }))

      await supabaseAdmin
        .from('users')
        .update({
          is_banned: true,
          ban_reason: `AI detection: ${analysis.categories.join(', ')} - ${analysis.explanation}`,
          ban_expires_at: null,
        })
        .eq('unique_id', sender_unique_id)
    }

    const structuredResponse = {
      allow: !shouldBlock,
      risk: analysis.threat_level === 'critical' ? 'critical' : analysis.threat_level === 'high' ? 'high' : analysis.threat_level === 'medium' ? 'medium' : analysis.threat_level === 'low' ? 'low' : 'none',
      category: analysis.categories.length > 0 ? analysis.categories[0] : 'none',
      warning: shouldBlock ? analysis.explanation : '',
      ban: shouldBan,
    }

    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message_id,
      sender_unique_id,
      threat_level: analysis.threat_level,
      categories: analysis.categories,
      recommended_action: analysis.recommended_action,
      should_ban: shouldBan,
    }))

    return new Response(JSON.stringify(structuredResponse), {
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

async function analyzeContent(content: string): Promise<{
  threat_level: string
  categories: string[]
  confidence: number
  explanation: string
  recommended_action: string
}> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a content safety classifier. Analyze the user message and respond with ONLY valid JSON (no markdown, no code fences):
{
  "threat_level": "none"|"low"|"medium"|"high"|"critical",
  "categories": [],
  "confidence": 0.0-1.0,
  "explanation": "brief reason",
  "recommended_action": "allow"|"warn"|"flag"|"block"
}

Categories: violence, threat, harassment, hate_speech, self_harm, sexual, spam, misinformation, weapons, kidnapping, extortion, illegal_drugs, none

Use "allow" if the message is safe. Use "block" for critical/high threats. Use "warn" for low/medium. Use "flag" for borderline cases.`,
        },
        { role: 'user', content },
      ],
      temperature: 0,
      max_tokens: 300,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: 'OpenRouter API error',
      status: response.status,
      body: errorText.substring(0, 1000),
    }))

    return {
      threat_level: 'low',
      categories: [],
      confidence: 0,
      explanation: 'Content analysis service temporarily unavailable',
      recommended_action: 'allow',
    }
  }

  const data = await response.json()

  const choice = data.choices?.[0]
  if (!choice) {
    return {
      threat_level: 'none',
      categories: [],
      confidence: 0,
      explanation: 'Could not analyze message',
      recommended_action: 'allow',
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
      threat_level: 'high',
      categories: ['violence'],
      confidence: 0.9,
      explanation: 'Content analysis refused - potentially harmful content',
      recommended_action: 'block',
    }
  }

  if (!messageContent) {
    return {
      threat_level: 'none',
      categories: [],
      confidence: 0,
      explanation: 'No analysis returned',
      recommended_action: 'allow',
    }
  }

  try {
    const cleaned = messageContent
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    return {
      threat_level: parsed.threat_level || 'none',
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      explanation: parsed.explanation || '',
      recommended_action: parsed.recommended_action || 'allow',
    }
  } catch (parseError) {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: 'Failed to parse LLM response as JSON',
      raw: messageContent.substring(0, 500),
    }))

    return {
      threat_level: 'none',
      categories: [],
      confidence: 0,
      explanation: 'Could not interpret analysis result',
      recommended_action: 'allow',
    }
  }
}
