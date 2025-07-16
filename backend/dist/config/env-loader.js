"use strict";
/**
 * Utilitario para cargar variables de entorno con soporte Unicode
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnvWithUnicodeSupport = loadEnvWithUnicodeSupport;
exports.getEnvDebugInfo = getEnvDebugInfo;
exports.resetEnvLoader = resetEnvLoader;
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Variable global para evitar múltiples cargas
let envLoaded = false;
/**
 * Cargar variables de entorno con soporte para archivos Unicode
 */
function loadEnvWithUnicodeSupport() {
    // Evitar múltiples cargas
    if (envLoaded) {
        return;
    }
    try {
        console.log('🔄 Iniciando carga de variables de entorno...');
        const envPath = path_1.default.join(process.cwd(), '.env');
        if (!fs_1.default.existsSync(envPath)) {
            console.warn('⚠️ Archivo .env no encontrado en:', envPath);
            envLoaded = true;
            return;
        }
        // Primero intentar con dotenv estándar (para archivos UTF-8 normales)
        const preLoadVars = Object.keys(process.env).length;
        dotenv_1.default.config();
        const postLoadVars = Object.keys(process.env).length;
        console.log(`📊 dotenv estándar cargó ${postLoadVars - preLoadVars} variables`);
        // Verificar si las variables críticas están cargadas
        const criticalVars = ['WEBHOOK_VERIFY_TOKEN', 'PORT', 'NODE_ENV'];
        const missingVars = criticalVars.filter(varName => !process.env[varName]);
        if (missingVars.length === 0) {
            console.log('✅ Variables de entorno cargadas exitosamente con dotenv estándar');
            envLoaded = true;
            return;
        }
        // Si faltan variables críticas, intentar lectura manual con diferentes encodings
        console.log(`🔄 Variables críticas no encontradas (${missingVars.join(', ')}), intentando lectura manual del .env...`);
        // Intentar diferentes encodings
        const encodings = ['utf16le', 'utf8', 'ascii', 'latin1'];
        let envContent = '';
        let usedEncoding = '';
        for (const encoding of encodings) {
            try {
                const content = fs_1.default.readFileSync(envPath, encoding);
                // Verificar si el contenido parece válido buscando al menos una variable conocida
                if (content.includes('WEBHOOK_VERIFY_TOKEN') || content.includes('PORT') || content.includes('=')) {
                    envContent = content;
                    usedEncoding = encoding;
                    console.log(`✅ Archivo .env leído correctamente con encoding: ${encoding}`);
                    break;
                }
            }
            catch (e) {
                // Continuar con el siguiente encoding
                continue;
            }
        }
        if (!envContent) {
            console.error('❌ No se pudo leer el archivo .env con ningún encoding');
            envLoaded = true;
            return;
        }
        // Parsear manualmente las variables
        const envLines = envContent.split(/\r?\n/);
        let loadedCount = 0;
        const loadedVars = [];
        envLines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
                const equalIndex = trimmedLine.indexOf('=');
                if (equalIndex > 0) {
                    const key = trimmedLine.substring(0, equalIndex).trim();
                    let value = trimmedLine.substring(equalIndex + 1).trim();
                    // Remover comillas si las hay (tanto simples como dobles)
                    value = value.replace(/^(['"])(.*?)\1$/, '$2');
                    if (key && value !== undefined) {
                        const oldValue = process.env[key];
                        process.env[key] = value;
                        loadedCount++;
                        loadedVars.push(key);
                        // Log detallado para variables críticas
                        if (criticalVars.includes(key)) {
                            console.log(`🔐 Variable crítica cargada: ${key} = ${key === 'WEBHOOK_VERIFY_TOKEN' ? `${value.substring(0, 10)}...` : value}`);
                        }
                    }
                }
            }
        });
        console.log(`✅ ${loadedCount} variables de entorno cargadas manualmente desde .env (${usedEncoding})`);
        console.log('🔐 Variables críticas ahora cargadas:', {
            WEBHOOK_VERIFY_TOKEN: !!process.env.WEBHOOK_VERIFY_TOKEN,
            PORT: !!process.env.PORT,
            NODE_ENV: !!process.env.NODE_ENV
        });
        // Log de variables cargadas en modo desarrollo
        if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DETAILED_LOGS === 'true') {
            console.log('📝 Variables cargadas:', loadedVars.sort().join(', '));
        }
    }
    catch (error) {
        console.error('❌ Error cargando variables de entorno:', error);
    }
    finally {
        envLoaded = true;
    }
}
/**
 * Obtener información de debug sobre las variables de entorno
 */
function getEnvDebugInfo() {
    var _a;
    return {
        NODE_ENV: process.env.NODE_ENV || 'undefined',
        PORT: process.env.PORT || 'undefined',
        WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN ? `${process.env.WEBHOOK_VERIFY_TOKEN.substring(0, 10)}...` : 'undefined',
        WEBHOOK_VERIFY_TOKEN_LENGTH: ((_a = process.env.WEBHOOK_VERIFY_TOKEN) === null || _a === void 0 ? void 0 : _a.length) || 0,
        WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? `${process.env.WHATSAPP_ACCESS_TOKEN.substring(0, 15)}...` : 'undefined',
        SUPABASE_URL: process.env.SUPABASE_URL ? 'configured' : 'undefined',
        totalEnvVars: Object.keys(process.env).length,
        envLoaded
    };
}
/**
 * Reiniciar el estado de carga (para tests)
 */
function resetEnvLoader() {
    envLoaded = false;
}
