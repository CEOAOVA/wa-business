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
exports.debugTables = debugTables;
const supabase_1 = require("../config/supabase");
/**
 * Script para debuggear las tablas de productos
 */
function debugTables() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Debuggeando tablas de productos...\n');
        try {
            // Verificar conexión a Supabase
            if (!supabase_1.supabase) {
                throw new Error('Supabase client no está inicializado');
            }
            // 1. Verificar conceptos_json
            console.log('📋 Verificando conceptos_json...');
            const { data: conceptosData, error: conceptosError } = yield supabase_1.supabase
                .from('conceptos_json')
                .select('catalogo')
                .limit(3);
            if (conceptosError) {
                console.log('❌ Error en conceptos_json:', conceptosError);
            }
            else {
                console.log(`✅ conceptos_json: ${(conceptosData === null || conceptosData === void 0 ? void 0 : conceptosData.length) || 0} registros`);
                if (conceptosData && conceptosData.length > 0) {
                    console.log('  Estructura del primer registro:');
                    console.log('  ', JSON.stringify(conceptosData[0].catalogo, null, 2).substring(0, 200) + '...');
                }
            }
            // 2. Verificar c_embler_json
            console.log('\n📦 Verificando c_embler_json...');
            const { data: emblerData, error: emblerError } = yield supabase_1.supabase
                .from('c_embler_json')
                .select('catalogo')
                .limit(3);
            if (emblerError) {
                console.log('❌ Error en c_embler_json:', emblerError);
            }
            else {
                console.log(`✅ c_embler_json: ${(emblerData === null || emblerData === void 0 ? void 0 : emblerData.length) || 0} registros`);
                if (emblerData && emblerData.length > 0) {
                    console.log('  Estructura del primer registro:');
                    console.log('  ', JSON.stringify(emblerData[0].catalogo, null, 2).substring(0, 200) + '...');
                    // Buscar un producto específico
                    const { data: balatasData, error: balatasError } = yield supabase_1.supabase
                        .from('c_embler_json')
                        .select('catalogo')
                        .ilike('catalogo->>Nombre', '%balatas%')
                        .limit(1);
                    if (!balatasError && balatasData && balatasData.length > 0) {
                        console.log('\n  Ejemplo de producto "balatas":');
                        const producto = balatasData[0].catalogo;
                        console.log('  Clave:', producto.Clave);
                        console.log('  Nombre:', producto.Nombre);
                    }
                }
            }
            // 3. Verificar c_embler_ml_json
            console.log('\n🔧 Verificando c_embler_ml_json...');
            const { data: emblerMlData, error: emblerMlError } = yield supabase_1.supabase
                .from('c_embler_ml_json')
                .select('catalogo')
                .limit(3);
            if (emblerMlError) {
                console.log('❌ Error en c_embler_ml_json:', emblerMlError);
            }
            else {
                console.log(`✅ c_embler_ml_json: ${(emblerMlData === null || emblerMlData === void 0 ? void 0 : emblerMlData.length) || 0} registros`);
                if (emblerMlData && emblerMlData.length > 0) {
                    console.log('  Estructura del primer registro:');
                    console.log('  ', JSON.stringify(emblerMlData[0].catalogo, null, 2).substring(0, 200) + '...');
                    // Buscar por la clave que no se encontró
                    const { data: claveData, error: claveError } = yield supabase_1.supabase
                        .from('c_embler_ml_json')
                        .select('catalogo')
                        .eq('catalogo->>Pieza', '0004202902 *1');
                    if (!claveError && claveData && claveData.length > 0) {
                        console.log('\n  ✅ Encontrado producto con clave "0004202902 *1":');
                        const producto = claveData[0].catalogo;
                        console.log('  Pieza:', producto.Pieza);
                        console.log('  Nombre:', producto.Nombre);
                    }
                    else {
                        console.log('\n  ❌ No se encontró producto con clave "0004202902 *1"');
                        // Buscar productos similares
                        const { data: similarData, error: similarError } = yield supabase_1.supabase
                            .from('c_embler_ml_json')
                            .select('catalogo')
                            .ilike('catalogo->>Pieza', '%0004202902%')
                            .limit(3);
                        if (!similarError && similarData && similarData.length > 0) {
                            console.log('  Productos similares encontrados:');
                            similarData.forEach((item, index) => {
                                console.log(`    ${index + 1}. ${item.catalogo.Pieza} - ${item.catalogo.Nombre || 'Sin nombre'}`);
                                // Mostrar estructura completa del primer producto
                                if (index === 0) {
                                    console.log('    Estructura completa:');
                                    console.log('    ', JSON.stringify(item.catalogo, null, 2));
                                }
                            });
                        }
                    }
                }
            }
            console.log('\n🎉 Debug completado!');
        }
        catch (error) {
            console.error('❌ Error en debug:', error);
            throw error;
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    debugTables()
        .then(() => {
        console.log('✅ Debug completado');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error en debug:', error);
        process.exit(1);
    });
}
