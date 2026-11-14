import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ehfafcnimmjusyvplbah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZmFmY25pbW1qdXN5dnBsYmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjM0MDksImV4cCI6MjEwNDA5OTQwOX0.cQC7lSHnvR8DDStZ-ZeHwTdrOr9Ib38EiOnn3jXi1jg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPost() {
  console.log('Testing Supabase connection...');
  console.log('Target URL:', SUPABASE_URL);

  try {
    const { data, error } = await supabase.from('posts').select('id').limit(1);
    if (error) {
      console.log('Query result:', error.message);
      if (error.message.includes('Could not find the table') || error.code === 'PGRST205') {
        console.log('\n[NOTE] The database tables have not been created yet in the live Supabase project.');
        console.log('Do not paste an old combined SQL file into a live project. The full migration history is not reconciled for this database; use the reviewed, project-specific forward-only migration procedure in RUNBOOK_BACKUP_RECOVERY.md.');
      }
    } else {
      console.log('Successfully queried posts table! Total rows retrieved:', data.length);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testPost();
