// ✅ CONFIGURACIÓN DE SUPABASE PARA FRONTEND - IMPLEMENTADO
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Configuración faltante. Auto-refresh de tokens no estará disponible.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false, // Lo manejamos manualmente con nuestro servicio
        persistSession: true,
        detectSessionInUrl: false
      }
    })
  : null;

export const isSupabaseConfigured = () => !!supabase;