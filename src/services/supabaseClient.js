import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xofbnrepyqasucbnwjv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZmJucmVweXFhc3VjYm53bmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDE1NzEsImV4cCI6MjEwNTkxNzU3MX0.9cJprwdXMxIcwo-r7_BhfRNFsEQWqfFH0jx7ZnuJpVI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
