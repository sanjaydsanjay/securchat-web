import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { SharedArray } from 'k6/data'

export const errorRate = new Rate('errors')
export const apiLatency = new Trend('api_latency')
export const functionLatency = new Trend('function_latency')

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4173'
const SUPABASE_URL = __ENV.VITE_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_ANON_KEY = __ENV.VITE_SUPABASE_ANON_KEY || 'fake-key'

const COMMON_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
}

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.03'],
  },
  setupTimeout: '10s',
}

export default function () {
  group('Homepage Load', function () {
    const res = http.get(`${BASE_URL}/`)
    check(res, { 'homepage status is 200': (r) => r.status === 200 }) || errorRate.add(1)
    sleep(0.5)
  })

  group('Static Assets', function () {
    const res = http.get(`${BASE_URL}/assets/index.js`, { tags: { type: 'static' } })
    check(res, { 'static asset served': (r) => r.status < 400 }) || errorRate.add(1)
    sleep(0.2)
  })

  group('API - Chats List', function () {
    const start = Date.now()
    const res = http.get(`${SUPABASE_URL}/rest/v1/chats?select=id,participant_1_id,participant_2_id,last_message_preview&limit=20`, {
      headers: { ...COMMON_HEADERS, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    })
    apiLatency.add(Date.now() - start)
    check(res, {
      'chats API returns expected status': (r) => [200, 401, 403].includes(r.status),
    }) || errorRate.add(1)
    sleep(0.5)
  })

  group('API - Messages Page', function () {
    const start = Date.now()
    const res = http.get(`${SUPABASE_URL}/rest/v1/messages?select=id,content,created_at,sender_unique_id&chat_id=eq.00000000-0000-0000-0000-000000000000&limit=50&order=created_at.desc`, {
      headers: { ...COMMON_HEADERS, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    })
    apiLatency.add(Date.now() - start)
    check(res, {
      'messages API returns expected status': (r) => [200, 401, 403].includes(r.status),
    }) || errorRate.add(1)
    sleep(0.5)
  })

  group('API - Search Users', function () {
    const start = Date.now()
    const res = http.get(`${SUPABASE_URL}/rest/v1/users?select=unique_id,display_name&display_name=ilike.*test*&limit=20`, {
      headers: { ...COMMON_HEADERS, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    })
    apiLatency.add(Date.now() - start)
    check(res, {
      'search users API returns expected status': (r) => [200, 401, 403].includes(r.status),
    }) || errorRate.add(1)
    sleep(0.5)
  })

  group('Edge Function - Export Chat', function () {
    const start = Date.now()
    const res = http.post(
      `${SUPABASE_URL}/functions/v1/export-chat`,
      JSON.stringify({ chatId: '00000000-0000-0000-0000-000000000000', format: 'json' }),
      { headers: { ...COMMON_HEADERS, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    )
    functionLatency.add(Date.now() - start)
    check(res, {
      'export function returns expected status': (r) => [401, 403, 429].includes(r.status),
    }) || errorRate.add(1)
    sleep(0.5)
  })

  group('Edge Function - AI Analyze', function () {
    const start = Date.now()
    const res = http.post(
      `${SUPABASE_URL}/functions/v1/ai-threat-detection`,
      JSON.stringify({ message: 'Hello, this is a test message for load testing purposes' }),
      { headers: { ...COMMON_HEADERS, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    )
    functionLatency.add(Date.now() - start)
    check(res, {
      'AI function returns expected status': (r) => [401, 403, 429].includes(r.status),
    }) || errorRate.add(1)
    sleep(0.5)
  })

  group('API - Reports List', function () {
    const start = Date.now()
    const res = http.get(`${SUPABASE_URL}/rest/v1/reports?select=id,status,severity&limit=20`, {
      headers: { ...COMMON_HEADERS, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    })
    apiLatency.add(Date.now() - start)
    check(res, {
      'reports API returns expected status': (r) => [200, 401, 403].includes(r.status),
    }) || errorRate.add(1)
    sleep(0.5)
  })

  sleep(1)
}
