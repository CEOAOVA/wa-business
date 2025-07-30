"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../config/supabase");
function testConversations() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 [Test] Verificando tabla conversations...');
        if (!supabase_1.supabaseAdmin) {
            console.error('❌ [Test] SupabaseAdmin no está disponible');
            return;
        }
        try {
            // Verificar si la tabla existe
            const { data: tables, error: tablesError } = yield supabase_1.supabaseAdmin
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public')
                .eq('table_name', 'conversations');
            if (tablesError) {
                console.error('❌ [Test] Error verificando tabla:', tablesError);
                return;
            }
            console.log('🔍 [Test] Tabla conversations existe:', tables.length > 0);
            if (tables.length === 0) {
                console.log('❌ [Test] La tabla conversations NO existe');
                return;
            }
            // Obtener todas las conversaciones
            const { data: conversations, error: convError } = yield supabase_1.supabaseAdmin
                .from('conversations')
                .select('*')
                .limit(10);
            if (convError) {
                console.error('❌ [Test] Error obteniendo conversaciones:', convError);
                return;
            }
            console.log('🔍 [Test] Conversaciones encontradas:', (conversations === null || conversations === void 0 ? void 0 : conversations.length) || 0);
            if (conversations && conversations.length > 0) {
                console.log('🔍 [Test] Primera conversación:', conversations[0]);
                console.log('🔍 [Test] Estructura de la conversación:', Object.keys(conversations[0]));
            }
            else {
                console.log('🔍 [Test] No hay conversaciones en la base de datos');
            }
            // Verificar estructura de la tabla
            const { data: columns, error: columnsError } = yield supabase_1.supabaseAdmin
                .from('information_schema.columns')
                .select('column_name, data_type')
                .eq('table_schema', 'public')
                .eq('table_name', 'conversations');
            if (columnsError) {
                console.error('❌ [Test] Error obteniendo columnas:', columnsError);
                return;
            }
            console.log('🔍 [Test] Columnas de la tabla conversations:');
            columns === null || columns === void 0 ? void 0 : columns.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type}`);
            });
        }
        catch (error) {
            console.error('❌ [Test] Error general:', error);
        }
    });
}
// Ejecutar el test
testConversations().then(() => {
    console.log('✅ [Test] Completado');
    process.exit(0);
}).catch(error => {
    console.error('❌ [Test] Error:', error);
    process.exit(1);
});
