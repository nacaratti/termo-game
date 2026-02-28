import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Retorna null se as variáveis de ambiente não estiverem configuradas (ex: dev local)
export const supabase = url && key ? createClient(url, key) : null;
