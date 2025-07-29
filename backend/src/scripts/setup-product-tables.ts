import { supabase } from '../config/supabase';

/**
 * Script para configurar las tablas de productos en Supabase
 */
export async function setupProductTables(): Promise<void> {
  console.log('🔧 Configurando tablas de productos en Supabase...');

  try {
    // Verificar conexión a Supabase
    if (!supabase) {
      throw new Error('Supabase client no está inicializado');
    }

    // 1. Verificar si existe la tabla conceptos_json
    console.log('📋 Verificando tabla conceptos_json...');
    const { data: conceptosData, error: conceptosError } = await supabase
      .from('conceptos_json')
      .select('count')
      .limit(1);

    if (conceptosError) {
      console.log('⚠️ Tabla conceptos_json no existe, creando...');
      await createConceptosTable();
    } else {
      console.log('✅ Tabla conceptos_json ya existe');
    }

    // 2. Verificar si existe la tabla c_embler_json
    console.log('📋 Verificando tabla c_embler_json...');
    const { data: emblerData, error: emblerError } = await supabase
      .from('c_embler_json')
      .select('count')
      .limit(1);

    if (emblerError) {
      console.log('⚠️ Tabla c_embler_json no existe, creando...');
      await createEmblerTable();
    } else {
      console.log('✅ Tabla c_embler_json ya existe');
    }

    // 3. Verificar si existe la tabla c_embler_ml_json
    console.log('📋 Verificando tabla c_embler_ml_json...');
    const { data: emblerMlData, error: emblerMlError } = await supabase
      .from('c_embler_ml_json')
      .select('count')
      .limit(1);

    if (emblerMlError) {
      console.log('⚠️ Tabla c_embler_ml_json no existe, creando...');
      await createEmblerMlTable();
    } else {
      console.log('✅ Tabla c_embler_ml_json ya existe');
    }

    console.log('🎉 Configuración de tablas completada exitosamente');

  } catch (error) {
    console.error('❌ Error configurando tablas:', error);
    throw error;
  }
}

/**
 * Crear tabla conceptos_json
 */
async function createConceptosTable(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client no está inicializado');
  }

  const { error } = await supabase.rpc('exec_sql', {
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
}

/**
 * Crear tabla c_embler_json
 */
async function createEmblerTable(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client no está inicializado');
  }

  const { error } = await supabase.rpc('exec_sql', {
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
}

/**
 * Crear tabla c_embler_ml_json
 */
async function createEmblerMlTable(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client no está inicializado');
  }

  const { error } = await supabase.rpc('exec_sql', {
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
}

/**
 * Cargar datos desde archivos JSON locales
 */
export async function loadProductData(): Promise<void> {
  console.log('📦 Cargando datos de productos...');

  try {
    // Verificar conexión a Supabase
    if (!supabase) {
      throw new Error('Supabase client no está inicializado');
    }

    // Cargar conceptos.json
    await loadConceptosData();
    
    // Cargar c_embler.json
    await loadEmblerData();
    
    // Cargar c_embler_ml.json
    await loadEmblerMlData();

    console.log('🎉 Datos de productos cargados exitosamente');

  } catch (error) {
    console.error('❌ Error cargando datos:', error);
    throw error;
  }
}

/**
 * Cargar datos de conceptos.json
 */
async function loadConceptosData(): Promise<void> {
  try {
    if (!supabase) {
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
    const { count } = await supabase
      .from('conceptos_json')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      console.log('✅ Datos de conceptos ya existen, saltando...');
      return;
    }

    // Insertar datos
    for (const concepto of conceptosData) {
      const { error } = await supabase
        .from('conceptos_json')
        .insert([{ catalogo: concepto }]);

      if (error) {
        console.error('❌ Error insertando concepto:', error);
      }
    }

    console.log(`✅ ${conceptosData.length} conceptos cargados`);

  } catch (error) {
    console.error('❌ Error cargando conceptos:', error);
  }
}

/**
 * Cargar datos de c_embler.json
 */
async function loadEmblerData(): Promise<void> {
  try {
    if (!supabase) {
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
    const { count } = await supabase
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
      
      const { error } = await supabase
        .from('c_embler_json')
        .insert(batch.map((item: any) => ({ catalogo: item })));

      if (error) {
        console.error('❌ Error insertando lote de c_embler:', error);
      } else {
        console.log(`📦 Lote ${Math.floor(i / batchSize) + 1} insertado`);
      }
    }

    console.log(`✅ ${emblerData.length} productos de c_embler cargados`);

  } catch (error) {
    console.error('❌ Error cargando c_embler:', error);
  }
}

/**
 * Cargar datos de c_embler_ml.json
 */
async function loadEmblerMlData(): Promise<void> {
  try {
    if (!supabase) {
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
    const { count } = await supabase
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
      
      const { error } = await supabase
        .from('c_embler_ml_json')
        .insert(batch.map((item: any) => ({ catalogo: item })));

      if (error) {
        console.error('❌ Error insertando lote de c_embler_ml:', error);
      } else {
        console.log(`📦 Lote ${Math.floor(i / batchSize) + 1} insertado`);
      }
    }

    console.log(`✅ ${emblerMlData.length} productos de c_embler_ml cargados`);

  } catch (error) {
    console.error('❌ Error cargando c_embler_ml:', error);
  }
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