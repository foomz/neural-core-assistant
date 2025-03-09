import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kgunksczwacjlcunpnzc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtndW5rc2N6d2FjamxjdW5wbnpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTUyNzg0NSwiZXhwIjoyMDU1MTAzODQ1fQ.zBYJmJQTPEIO_5hV-aTj_JWQRYX9i0DjHtGAWfHBPas';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storageKey: 'neural-core-auth',
    storage: window.localStorage
  }
});