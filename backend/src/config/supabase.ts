/**
 * Configuración de Supabase - Database Service
 */

import { loadEnvWithUnicodeSupport } from './env-loader';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno con soporte Unicode
loadEnvWithUnicodeSupport();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Database operations will be disabled.'
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
        },
      })
    : null; 