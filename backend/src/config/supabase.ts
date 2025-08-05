/**
 * Configuración de Supabase - Database Service
 */

import { loadEnvWithUnicodeSupport } from './env-loader';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno con soporte Unicode
loadEnvWithUnicodeSupport();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
// FIX: Check both possible environment variable names for service role
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Enhanced logging for production debugging
console.log(' [Supabase] Environment check:', {
  hasUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  hasServiceKey: !!supabaseServiceKey,
  urlLength: supabaseUrl?.length || 0,
  anonKeyLength: supabaseAnonKey?.length || 0,
  serviceKeyLength: supabaseServiceKey?.length || 0
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    ' [Supabase] CRITICAL: Supabase URL or Anon Key is missing. Database operations will be disabled.',
    {
      SUPABASE_URL: supabaseUrl ? 'Present' : 'Missing',
      SUPABASE_ANON_KEY: supabaseAnonKey ? 'Present' : 'Missing'
    }
  );
} else {
  console.log(' [Supabase] Configuration loaded successfully');
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
        },
      })
    : null;

// Cliente de Supabase con clave de servicio para operaciones administrativas
export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
        },
      })
    : null; 