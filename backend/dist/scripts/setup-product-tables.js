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
exports.setupProductTables = setupProductTables;
exports.loadProductData = loadProductData;
const supabase_1 = require("../config/supabase");
/**
 * Script para configurar las tablas de productos en Supabase
 */
function setupProductTables() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔧 Configurando tablas de productos en Supabase...');
        try {
            // Verificar conexión a Supabase
            if (!supabase_1.supabase) {
                throw new Error('Supabase client no está inicializado');
            }
            // 1. Verificar si existe la tabla conceptos_json
            console.log('📋 Verificando tabla conceptos_json...');
            const { data: conceptosData, error: conceptosError } = yield supabase_1.supabase
                .from('conceptos_json')
                .select('count')
                .limit(1);
            if (conceptosError) {
                console.log('⚠️ Tabla conceptos_json no existe, creando...');
                yield createConceptosTable();
            }
            else {
                console.log('✅ Tabla conceptos_json ya existe');
            }
            // 2. Verificar si existe la tabla c_embler_json
            console.log('📋 Verificando tabla c_embler_json...');
            const { data: emblerData, error: emblerError } = yield supabase_1.supabase
                .from('c_embler_json')
                .select('count')
                .limit(1);
            if (emblerError) {
                console.log('⚠️ Tabla c_embler_json no existe, creando...');
                yield createEmblerTable();
            }
            else {
                console.log('✅ Tabla c_embler_json ya existe');
            }
            // 3. Verificar si existe la tabla c_embler_ml_json
            console.log('📋 Verificando tabla c_embler_ml_json...');
            const { data: emblerMlData, error: emblerMlError } = yield supabase_1.supabase
                .from('c_embler_ml_json')
                .select('count')
                .limit(1);
            if (emblerMlError) {
                console.log('⚠️ Tabla c_embler_ml_json no existe, creando...');
                yield createEmblerMlTable();
            }
            else {
                console.log('✅ Tabla c_embler_ml_json ya existe');
            }
            console.log('🎉 Configuración de tablas completada exitosamente');
        }
        catch (error) {
            console.error('❌ Error configurando tablas:', error);
            throw error;
        }
    });
}
/**
 * Crear tabla conceptos_json
 */
function createConceptosTable() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!supabase_1.supabase) {
            throw new Error('Supabase client no está inicializado');
        }
        const { error } = yield supabase_1.supabase.rpc('exec_sql', {
            sql: `
      CREATE TABLE IF NOT EXISTS conceptos_json (
        id SERIAL PRIMARY KEY,
        catalogo JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_conceptos_json_catalogo 
      ON conceptos_json USING GIN (catalogo);
    `
        });
        if (error) {
            console.error('❌ Error creando tabla conceptos_json:', error);
            throw error;
        }
        console.log('✅ Tabla conceptos_json creada');
    });
}
/**
 * Crear tabla c_embler_json
 */
function createEmblerTable() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!supabase_1.supabase) {
            throw new Error('Supabase client no está inicializado');
        }
        const { error } = yield supabase_1.supabase.rpc('exec_sql', {
            sql: `
      CREATE TABLE IF NOT EXISTS c_embler_json (
        id SERIAL PRIMARY KEY,
        catalogo JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_c_embler_json_catalogo 
      ON c_embler_json USING GIN (catalogo);
      
      CREATE INDEX IF NOT EXISTS idx_c_embler_json_nombre 
      ON c_embler_json USING GIN ((catalogo->>'Nombre'));
    `
        });
        if (error) {
            console.error('❌ Error creando tabla c_embler_json:', error);
            throw error;
        }
        console.log('✅ Tabla c_embler_json creada');
    });
}
/**
 * Crear tabla c_embler_ml_json
 */
function createEmblerMlTable() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!supabase_1.supabase) {
            throw new Error('Supabase client no está inicializado');
        }
        const { error } = yield supabase_1.supabase.rpc('exec_sql', {
            sql: `
      CREATE TABLE IF NOT EXISTS c_embler_ml_json (
        id SERIAL PRIMARY KEY,
        catalogo JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_c_embler_ml_json_catalogo 
      ON c_embler_ml_json USING GIN (catalogo);
      
      CREATE INDEX IF NOT EXISTS idx_c_embler_ml_json_pieza 
      ON c_embler_ml_json USING GIN ((catalogo->>'Pieza'));
    `
        });
        if (error) {
            console.error('❌ Error creando tabla c_embler_ml_json:', error);
            throw error;
        }
        console.log('✅ Tabla c_embler_ml_json creada');
    });
}
/**
 * Cargar datos desde archivos JSON locales
 */
function loadProductData() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('📦 Cargando datos de productos...');
        try {
            // Verificar conexión a Supabase
            if (!supabase_1.supabase) {
                throw new Error('Supabase client no está inicializado');
            }
            // Cargar conceptos.json
            yield loadConceptosData();
            // Cargar c_embler.json
            yield loadEmblerData();
            // Cargar c_embler_ml.json
            yield loadEmblerMlData();
            console.log('🎉 Datos de productos cargados exitosamente');
        }
        catch (error) {
            console.error('❌ Error cargando datos:', error);
            throw error;
        }
    });
}
/**
 * Cargar datos de conceptos.json
 */
function loadConceptosData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!supabase_1.supabase) {
                throw new Error('Supabase client no está inicializado');
            }
            const fs = require('fs');
            const path = require('path');
            const conceptosPath = path.join(process.cwd(), 'public', 'embler', 'inventario', 'conceptos.json');
            if (!fs.existsSync(conceptosPath)) {
                console.log('⚠️ Archivo conceptos.json no encontrado, saltando...');
                return;
            }
            const conceptosData = JSON.parse(fs.readFileSync(conceptosPath, 'utf8'));
            // Verificar si ya hay datos
            const { count } = yield supabase_1.supabase
                .from('conceptos_json')
                .select('*', { count: 'exact', head: true });
            if (count && count > 0) {
                console.log('✅ Datos de conceptos ya existen, saltando...');
                return;
            }
            // Insertar datos
            for (const concepto of conceptosData) {
                const { error } = yield supabase_1.supabase
                    .from('conceptos_json')
                    .insert([{ catalogo: concepto }]);
                if (error) {
                    console.error('❌ Error insertando concepto:', error);
                }
            }
            console.log(`✅ ${conceptosData.length} conceptos cargados`);
        }
        catch (error) {
            console.error('❌ Error cargando conceptos:', error);
        }
    });
}
/**
 * Cargar datos de c_embler.json
 */
function loadEmblerData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!supabase_1.supabase) {
                throw new Error('Supabase client no está inicializado');
            }
            const fs = require('fs');
            const path = require('path');
            const emblerPath = path.join(process.cwd(), 'public', 'embler', 'inventario', 'c_embler.json');
            if (!fs.existsSync(emblerPath)) {
                console.log('⚠️ Archivo c_embler.json no encontrado, saltando...');
                return;
            }
            const emblerData = JSON.parse(fs.readFileSync(emblerPath, 'utf8'));
            // Verificar si ya hay datos
            const { count } = yield supabase_1.supabase
                .from('c_embler_json')
                .select('*', { count: 'exact', head: true });
            if (count && count > 0) {
                console.log('✅ Datos de c_embler ya existen, saltando...');
                return;
            }
            // Insertar datos en lotes para evitar timeouts
            const batchSize = 100;
            for (let i = 0; i < emblerData.length; i += batchSize) {
                const batch = emblerData.slice(i, i + batchSize);
                const { error } = yield supabase_1.supabase
                    .from('c_embler_json')
                    .insert(batch.map((item) => ({ catalogo: item })));
                if (error) {
                    console.error('❌ Error insertando lote de c_embler:', error);
                }
                else {
                    console.log(`📦 Lote ${Math.floor(i / batchSize) + 1} insertado`);
                }
            }
            console.log(`✅ ${emblerData.length} productos de c_embler cargados`);
        }
        catch (error) {
            console.error('❌ Error cargando c_embler:', error);
        }
    });
}
/**
 * Cargar datos de c_embler_ml.json
 */
function loadEmblerMlData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!supabase_1.supabase) {
                throw new Error('Supabase client no está inicializado');
            }
            const fs = require('fs');
            const path = require('path');
            const emblerMlPath = path.join(process.cwd(), 'public', 'embler', 'inventario', 'c_embler_ml.json');
            if (!fs.existsSync(emblerMlPath)) {
                console.log('⚠️ Archivo c_embler_ml.json no encontrado, saltando...');
                return;
            }
            const emblerMlData = JSON.parse(fs.readFileSync(emblerMlPath, 'utf8'));
            // Verificar si ya hay datos
            const { count } = yield supabase_1.supabase
                .from('c_embler_ml_json')
                .select('*', { count: 'exact', head: true });
            if (count && count > 0) {
                console.log('✅ Datos de c_embler_ml ya existen, saltando...');
                return;
            }
            // Insertar datos en lotes para evitar timeouts
            const batchSize = 100;
            for (let i = 0; i < emblerMlData.length; i += batchSize) {
                const batch = emblerMlData.slice(i, i + batchSize);
                const { error } = yield supabase_1.supabase
                    .from('c_embler_ml_json')
                    .insert(batch.map((item) => ({ catalogo: item })));
                if (error) {
                    console.error('❌ Error insertando lote de c_embler_ml:', error);
                }
                else {
                    console.log(`📦 Lote ${Math.floor(i / batchSize) + 1} insertado`);
                }
            }
            console.log(`✅ ${emblerMlData.length} productos de c_embler_ml cargados`);
        }
        catch (error) {
            console.error('❌ Error cargando c_embler_ml:', error);
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    setupProductTables()
        .then(() => loadProductData())
        .then(() => {
        console.log('🎉 Configuración completada exitosamente');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error en configuración:', error);
        process.exit(1);
    });
}
