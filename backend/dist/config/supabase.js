"use strict";
/**
 * Configuración de Supabase - Database Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.supabase = void 0;
const env_loader_1 = require("./env-loader");
const supabase_js_1 = require("@supabase/supabase-js");
// Cargar variables de entorno con soporte Unicode
(0, env_loader_1.loadEnvWithUnicodeSupport)();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
// FIX: Check both possible environment variable names for service role
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
// Enhanced logging for production debugging
console.log(' [Supabase] Environment check:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey,
    urlLength: (supabaseUrl === null || supabaseUrl === void 0 ? void 0 : supabaseUrl.length) || 0,
    anonKeyLength: (supabaseAnonKey === null || supabaseAnonKey === void 0 ? void 0 : supabaseAnonKey.length) || 0,
    serviceKeyLength: (supabaseServiceKey === null || supabaseServiceKey === void 0 ? void 0 : supabaseServiceKey.length) || 0
});
if (!supabaseUrl || !supabaseAnonKey) {
    console.error(' [Supabase] CRITICAL: Supabase URL or Anon Key is missing. Database operations will be disabled.', {
        SUPABASE_URL: supabaseUrl ? 'Present' : 'Missing',
        SUPABASE_ANON_KEY: supabaseAnonKey ? 'Present' : 'Missing'
    });
}
else {
    console.log(' [Supabase] Configuration loaded successfully');
}
exports.supabase = supabaseUrl && supabaseAnonKey
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
        },
    })
    : null;
// Cliente de Supabase con clave de servicio para operaciones administrativas
exports.supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
        },
    })
    : null;
