import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://umchxdjwypdwqpkwfwth.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtY2h4ZGp3eXBkd3Fwa3dmd3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMzM2MzcsImV4cCI6MjA5ODYwOTYzN30.pVLWCwPPrfB53UXdu_1fRNgrNLoqcrttO8K1Z_iuWB4',
  { auth: { flowType: 'pkce' } }
);

async function main() {
  console.log('=== User A Login ===');
  const { data: aData, error: aErr } = await supabase.auth.signInWithPassword({
    email: 'testuser.a@example.com',
    password: 'TestPass123!@#'
  });
  if (aErr) {
    console.log('FAIL:', aErr.message, aErr.status, aErr.code);
  } else {
    console.log('OK: User A session active, user_id:', aData.user?.id);
  }

  console.log('\n=== User B Login ===');
  const { data: bData, error: bErr } = await supabase.auth.signInWithPassword({
    email: 'testuser.b@example.com',
    password: 'TestPass456!@#'
  });
  if (bErr) {
    console.log('FAIL:', bErr.message, bErr.status, bErr.code);
  } else {
    console.log('OK: User B session active, user_id:', bData.user?.id);
  }
}
main().catch(console.error);
