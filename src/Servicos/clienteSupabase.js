import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('As variáveis de ambiente do Supabase não foram configuradas corretamente no arquivo .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);