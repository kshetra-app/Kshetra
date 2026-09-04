import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ehfafcnimmjusyvplbah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZmFmY25pbW1qdXN5dnBsYmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjM0MDksImV4cCI6MjEwNDA5OTQwOX0.cQC7lSHnvR8DDStZ-ZeHwTdrOr9Ib38EiOnn3jXi1jg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const email = `test_civic_${Date.now()}@kshetra.app`;
  const password = 'TestSecurePassword123!';

  console.log(`1. Signing up test user: ${email}...`);
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authErr) {
    console.error('Sign up error:', authErr.message);
    return;
  }

  const userId = authData.user?.id;
  console.log(`User created with ID: ${userId}`);

  // Create user_profile record
  console.log('2. Creating user profile...');
  const { error: profErr } = await supabase.from('user_profiles').upsert({
    user_id: userId,
    display_name: 'Kshetra Test Citizen',
    role: 'citizen',
    state_code: 'TS',
  });
  if (profErr) {
    console.warn('Profile note:', profErr.message);
  } else {
    console.log('Profile created successfully!');
  }

  // Create a test post via composePost pattern
  console.log('3. Inserting test post via composePost pattern...');
  const postPayload = {
    author_id: userId,
    content: 'TICKET 0.1 Verification: Test civic post from live Kshetra app! #civic #governance #telangana',
    type: 'discussion',
    state_code: 'TS',
    language: 'en',
  };

  const { data: postData, error: postErr } = await supabase
    .from('posts')
    .insert(postPayload)
    .select('*')
    .single();

  if (postErr) {
    console.error('Error inserting post:', postErr.message);
  } else {
    console.log('\n[SUCCESS] Test post written to Supabase table editor!');
    console.log('Post ID:', postData.id);
    console.log('Author ID:', postData.author_id);
    console.log('Content:', postData.content);
    console.log('State Code:', postData.state_code);
    console.log('Created At:', postData.created_at);
  }
}

run();
