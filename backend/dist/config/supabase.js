"use strict";
/**
 * Configuración de Supabase - Database Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const env_loader_1 = require("./env-loader");
const supabase_js_1 = require("@supabase/supabase-js");
// Cargar variables de entorno con soporte Unicode
(0, env_loader_1.loadEnvWithUnicodeSupport)();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Database operations will be disabled.');
}
exports.supabase = supabaseUrl && supabaseAnonKey
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
        },
    })
    : null;
