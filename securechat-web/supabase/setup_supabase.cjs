const fs = require('fs');
const path = require('path');

const supabaseDir = __dirname;
const functionsDir = path.join(supabaseDir, 'functions');
const sharedDir = path.join(functionsDir, '_shared');
const policiesDir = path.join(supabaseDir, 'policies');
const migrationsDir = path.join(supabaseDir, 'migrations');

const dirs = [
    functionsDir,
    sharedDir,
    path.join(functionsDir, 'ai-analyze'),
    path.join(functionsDir, 'auto-delete'),
    path.join(functionsDir, 'push-notification'),
    path.join(functionsDir, 'payment-webhook'),
    path.join(functionsDir, 'scheduled-messages'),
    path.join(functionsDir, 'export-chat'),
    policiesDir,
    migrationsDir
];

dirs.forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const sharedFiles = {
    'cors.ts': "export const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };\n",
    'supabase.ts': "import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';\nexport const createSupabaseAdmin = () => createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');\n",
    'auth.ts': "import { createSupabaseAdmin } from './supabase.ts';\nexport const verifyAuth = async (req: Request) => { const authHeader = req.headers.get('Authorization'); if (!authHeader) throw new Error('No authorization header'); const token = authHeader.replace('Bearer ', ''); const supabase = createSupabaseAdmin(); const { data: { user }, error } = await supabase.auth.getUser(token); if (error || !user) throw new Error('Invalid token'); return user; };\n",
    'errors.ts': "export const handleError = (err: any) => { console.error(err); return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }); };\n"
};

Object.entries(sharedFiles).forEach(([name, content]) => {
    fs.writeFileSync(path.join(sharedDir, name), content);
});

const fns = ['ai-analyze', 'auto-delete', 'push-notification', 'payment-webhook', 'scheduled-messages', 'export-chat'];
fns.forEach(fn => {
    const dir = path.join(functionsDir, fn);
    fs.writeFileSync(path.join(dir, 'index.ts'), "import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';\nimport { corsHeaders } from '../_shared/cors.ts';\nimport { handleError } from '../_shared/errors.ts';\n\nserve(async (req) => {\n  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });\n  try {\n    const data = await req.json().catch(() => ({}));\n    return new Response(JSON.stringify({ message: 'Hello from " + fn + "!', data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });\n  } catch (error) {\n    return handleError(error);\n  }\n});\n");
    fs.writeFileSync(path.join(dir, 'config.toml'), "[functions." + fn + "]\nverify_jwt = false\n");
});

const policies = ['users.sql', 'chats.sql', 'messages.sql', 'reports.sql', 'payments.sql'];
policies.forEach(p => {
    fs.writeFileSync(path.join(policiesDir, p), "-- Policies for " + p.replace('.sql', '') + "\n");
});

fs.writeFileSync(path.join(migrationsDir, "20260703000012_setup_cron.sql"), "-- Setup cron jobs\nCREATE EXTENSION IF NOT EXISTS pg_cron;\n-- Example: schedule auto-delete every hour\n-- SELECT cron.schedule('invoke_auto_delete', '0 * * * *', 'SELECT net.http_post(''https://project.supabase.co/functions/v1/auto-delete'')');\n");

console.log('Successfully generated Supabase structure.');
