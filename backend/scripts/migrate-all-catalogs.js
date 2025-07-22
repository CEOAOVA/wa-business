const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Configuración de archivos y tablas
 */
const MIGRATION_CONFIG = {
  basicCatalog: {
    file: 'c_embler.json',
    table: 'product_basic_catalog',
    description: 'Catálogo básico de productos',
    batchSize: 1000
  },
  concepts: {
    file: 'conceptos.json',
    table: 'concepts_mapping',
    description: 'Mapeo de conceptos mexicanos',
    batchSize: 50 // Archivo pequeño
  },
  catalogWithImages: {
    file: 'c_embler_ml.json',
    table: 'product_catalog_with_images',
    description: 'Catálogo con imágenes de MercadoLibre',
    batchSize: 500 // Archivo grande
  }
};

/**
 * Utilidades
 */
class MigrationUtils {
  static async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  static validatePhoneNumber(phone) {
    if (!phone) return null;
    const cleaned = phone.toString().replace(/\D/g, '');
    return cleaned.length >= 10 ? cleaned : null;
  }

  static normalizeText(text) {
    if (!text) return '';
    return text.toString().trim().toLowerCase();
  }
}

/**
 * Migración del catálogo básico (c_embler.json)
 */
class BasicCatalogMigrator {
  constructor() {
    this.config = MIGRATION_CONFIG.basicCatalog;
  }

  async migrate(clearExisting = false) {
    console.log(`\n🔧 === MIGRANDO ${this.config.description.toUpperCase()} ===\n`);
    
    try {
      // Verificar archivo
      const filePath = path.join(process.cwd(), '..', 'public', 'embler', 'inventario', this.config.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }

      // Leer datos
      console.log(`📂 Leyendo ${this.config.file}...`);
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`📊 Total de registros: ${rawData.length}`);

      // Limpiar tabla si se solicita
      if (clearExisting) {
        console.log(`🧹 Limpiando tabla ${this.config.table}...`);
        const { error } = await supabase.from(this.config.table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        console.log('✅ Tabla limpiada');
      }

      // Procesar en lotes
      let successCount = 0;
      let errorCount = 0;
      const totalBatches = Math.ceil(rawData.length / this.config.batchSize);

      for (let i = 0; i < rawData.length; i += this.config.batchSize) {
        const batch = rawData.slice(i, i + this.config.batchSize);
        const batchNumber = Math.floor(i / this.config.batchSize) + 1;

        console.log(`📦 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} productos)...`);

        // Transformar datos
        const transformedBatch = batch
          .map(item => this.transformItem(item))
          .filter(item => item !== null);

        if (transformedBatch.length === 0) {
          console.log('⚠️  Lote vacío después de filtrar');
          continue;
        }

        // Insertar en Supabase
        const { error } = await supabase.from(this.config.table).insert(transformedBatch);

        if (error) {
          console.error(`❌ Error en lote ${batchNumber}:`, error.message);
          errorCount += batch.length;
          
          if (error.message.includes('rate limit')) {
            console.log('⏳ Rate limit detectado, esperando...');
            await MigrationUtils.delay(5000);
            i -= this.config.batchSize; // Reintentar
            continue;
          }
        } else {
          successCount += transformedBatch.length;
          console.log(`✅ Lote ${batchNumber} completado`);
        }

        // Pausa entre lotes
        await MigrationUtils.delay(500);
      }

      console.log(`\n🎉 Migración de ${this.config.description} completada:`);
      console.log(`✅ Exitosos: ${successCount}`);
      console.log(`❌ Fallidos: ${errorCount}`);

      return { success: successCount, failed: errorCount };

    } catch (error) {
      console.error(`❌ Error en migración de ${this.config.description}:`, error);
      throw error;
    }
  }

  transformItem(item) {
    if (!item || !item.Nombre || typeof item.Nombre !== 'string' || item.Nombre.trim() === '') {
      return null;
    }

    return {
      clave: item.Clave ? item.Clave.toString() : null,
      nombre: item.Nombre.trim(),
      is_active: true
    };
  }
}

/**
 * Migración de conceptos (conceptos.json)
 */
class ConceptsMigrator {
  constructor() {
    this.config = MIGRATION_CONFIG.concepts;
  }

  async migrate(clearExisting = false) {
    console.log(`\n🗣️  === MIGRANDO ${this.config.description.toUpperCase()} ===\n`);
    
    try {
      // Verificar archivo
      const filePath = path.join(process.cwd(), '..', 'public', 'embler', 'inventario', this.config.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }

      // Leer datos
      console.log(`📂 Leyendo ${this.config.file}...`);
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`📊 Total de conceptos: ${rawData.length}`);

      // Limpiar tabla si se solicita
      if (clearExisting) {
        console.log(`🧹 Limpiando tabla ${this.config.table}...`);
        const { error } = await supabase.from(this.config.table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        console.log('✅ Tabla limpiada');
      }

      // Transformar todos los datos
      const transformedData = rawData
        .map(item => this.transformItem(item))
        .filter(item => item !== null);

      console.log(`📝 Conceptos válidos a insertar: ${transformedData.length}`);

      // Insertar todos de una vez (archivo pequeño)
      const { error } = await supabase.from(this.config.table).insert(transformedData);

      if (error) {
        console.error(`❌ Error insertando conceptos:`, error.message);
        throw error;
      }

      console.log(`\n🎉 Migración de ${this.config.description} completada:`);
      console.log(`✅ Conceptos insertados: ${transformedData.length}`);

      return { success: transformedData.length, failed: 0 };

    } catch (error) {
      console.error(`❌ Error en migración de ${this.config.description}:`, error);
      throw error;
    }
  }

  transformItem(item) {
    if (!item || !item.pieza || !Array.isArray(item.variantes) || item.variantes.length === 0) {
      return null;
    }

    return {
      pieza: item.pieza.trim(),
      variantes: item.variantes.filter(v => v && v.trim()),
      is_active: true
    };
  }
}

/**
 * Migración del catálogo con imágenes (c_embler_ml.json)
 */
class CatalogWithImagesMigrator {
  constructor() {
    this.config = MIGRATION_CONFIG.catalogWithImages;
  }

  async migrate(clearExisting = false) {
    console.log(`\n🖼️  === MIGRANDO ${this.config.description.toUpperCase()} ===\n`);
    
    try {
      // Verificar archivo
      const filePath = path.join(process.cwd(), '..', 'public', 'embler', 'inventario', this.config.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }

      const fileStats = fs.statSync(filePath);
      console.log(`📂 Leyendo ${this.config.file} (${MigrationUtils.formatFileSize(fileStats.size)})...`);
      
      // Leer datos
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`📊 Total de productos con imágenes: ${rawData.length}`);

      // Limpiar tabla si se solicita
      if (clearExisting) {
        console.log(`🧹 Limpiando tabla ${this.config.table}...`);
        const { error } = await supabase.from(this.config.table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        console.log('✅ Tabla limpiada');
      }

      // Procesar en lotes
      let successCount = 0;
      let errorCount = 0;
      const totalBatches = Math.ceil(rawData.length / this.config.batchSize);

      for (let i = 0; i < rawData.length; i += this.config.batchSize) {
        const batch = rawData.slice(i, i + this.config.batchSize);
        const batchNumber = Math.floor(i / this.config.batchSize) + 1;

        console.log(`📦 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} productos)...`);

        // Transformar datos
        const transformedBatch = batch
          .map(item => this.transformItem(item))
          .filter(item => item !== null);

        if (transformedBatch.length === 0) {
          console.log('⚠️  Lote vacío después de filtrar');
          continue;
        }

        // Insertar en Supabase
        const { error } = await supabase.from(this.config.table).insert(transformedBatch);

        if (error) {
          console.error(`❌ Error en lote ${batchNumber}:`, error.message);
          errorCount += batch.length;
          
          if (error.message.includes('rate limit')) {
            console.log('⏳ Rate limit detectado, esperando...');
            await MigrationUtils.delay(5000);
            i -= this.config.batchSize; // Reintentar
            continue;
          }
        } else {
          successCount += transformedBatch.length;
          console.log(`✅ Lote ${batchNumber} completado`);
        }

        // Pausa entre lotes (archivo grande)
        await MigrationUtils.delay(1000);
      }

      console.log(`\n🎉 Migración de ${this.config.description} completada:`);
      console.log(`✅ Exitosos: ${successCount}`);
      console.log(`❌ Fallidos: ${errorCount}`);

      return { success: successCount, failed: errorCount };

    } catch (error) {
      console.error(`❌ Error en migración de ${this.config.description}:`, error);
      throw error;
    }
  }

  transformItem(item) {
    if (!item || !item.titulo || typeof item.titulo !== 'string' || item.titulo.trim() === '') {
      return null;
    }

    return {
      titulo: item.titulo.trim(),
      categoria: item.categoria || null,
      imagen_1: this.cleanImageUrl(item.imagen_1),
      imagen_2: this.cleanImageUrl(item.imagen_2),
      imagen_3: this.cleanImageUrl(item.imagen_3),
      imagen_4: this.cleanImageUrl(item.imagen_4),
      imagen_5: this.cleanImageUrl(item.imagen_5),
      imagen_6: this.cleanImageUrl(item.imagen_6),
      imagen_7: this.cleanImageUrl(item.imagen_7),
      imagen_8: this.cleanImageUrl(item.imagen_8),
      imagen_9: this.cleanImageUrl(item.imagen_9),
      imagen_10: this.cleanImageUrl(item.imagen_10),
      is_active: true
    };
  }

  cleanImageUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    return trimmed.startsWith('http') ? trimmed : null;
  }
}

/**
 * Función principal de migración
 */
async function migrateAllCatalogs() {
  console.log('🚀 ========================================');
  console.log('   MIGRACIÓN COMPLETA DE CATÁLOGOS');
  console.log('========================================\n');
  
  const startTime = Date.now();
  const results = {};
  
  try {
    const clearExisting = process.argv.includes('--clear');
    
    if (clearExisting) {
      console.log('⚠️  MODO LIMPIEZA ACTIVADO: Se limpiarán todas las tablas\n');
    }

    // 1. Migrar conceptos (pequeño, rápido)
    const conceptsMigrator = new ConceptsMigrator();
    results.concepts = await conceptsMigrator.migrate(clearExisting);
    
    // 2. Migrar catálogo básico
    const basicCatalogMigrator = new BasicCatalogMigrator();
    results.basicCatalog = await basicCatalogMigrator.migrate(clearExisting);
    
    // 3. Migrar catálogo con imágenes (grande, lento)
    const catalogWithImagesMigrator = new CatalogWithImagesMigrator();
    results.catalogWithImages = await catalogWithImagesMigrator.migrate(clearExisting);

    // Resumen final
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 ========================================');
    console.log('      MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('========================================\n');
    
    console.log('📊 RESUMEN POR CATÁLOGO:');
    console.log(`🗣️  Conceptos: ${results.concepts.success} insertados`);
    console.log(`🔧 Catálogo básico: ${results.basicCatalog.success} insertados`);
    console.log(`🖼️  Catálogo con imágenes: ${results.catalogWithImages.success} insertados`);
    
    const totalSuccess = results.concepts.success + results.basicCatalog.success + results.catalogWithImages.success;
    const totalFailed = results.concepts.failed + results.basicCatalog.failed + results.catalogWithImages.failed;
    
    console.log(`\n📈 TOTALES:`);
    console.log(`✅ Total exitosos: ${totalSuccess}`);
    console.log(`❌ Total fallidos: ${totalFailed}`);
    console.log(`⏱️  Tiempo total: ${totalTime} segundos`);

    // Verificar conteos en base de datos
    await verifyMigration();

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO EN MIGRACIÓN:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Verificar estado de la migración
 */
async function verifyMigration() {
  console.log('\n🔍 Verificando estado de las tablas...\n');
  
  try {
    const tables = [
      { name: 'concepts_mapping', description: 'Conceptos mexicanos' },
      { name: 'product_basic_catalog', description: 'Catálogo básico' },
      { name: 'product_catalog_with_images', description: 'Catálogo con imágenes' }
    ];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Error consultando ${table.name}: ${error.message}`);
      } else {
        console.log(`📊 ${table.description}: ${count} registros`);
      }
    }

  } catch (error) {
    console.error('❌ Error verificando migración:', error);
  }
}

/**
 * Función para verificar archivos sin migrar
 */
async function checkFiles() {
  console.log('🔍 Verificando archivos de catálogo...\n');
  
      const basePath = path.join(process.cwd(), '..', 'public', 'embler', 'inventario');
  
  for (const [key, config] of Object.entries(MIGRATION_CONFIG)) {
    const filePath = path.join(basePath, config.file);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      console.log(`📂 ${config.file}:`);
      console.log(`   📏 Tamaño: ${MigrationUtils.formatFileSize(stats.size)}`);
      console.log(`   📊 Registros: ${data.length}`);
      console.log(`   📋 Descripción: ${config.description}`);
      console.log('');
    } else {
      console.log(`❌ ${config.file}: No encontrado`);
    }
  }
  
  await verifyMigration();
}

// Ejecutar según argumentos
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      checkFiles();
      break;
    case 'migrate':
      migrateAllCatalogs();
      break;
    case 'verify':
      verifyMigration();
      break;
    default:
      console.log('📋 USO DEL SCRIPT DE MIGRACIÓN COMPLETO:');
      console.log('');
      console.log('  node migrate-all-catalogs.js check           # Verificar archivos');
      console.log('  node migrate-all-catalogs.js migrate         # Migrar todos los catálogos');
      console.log('  node migrate-all-catalogs.js migrate --clear # Limpiar y migrar');
      console.log('  node migrate-all-catalogs.js verify          # Verificar estado de BD');
      console.log('');
      console.log('📂 ARCHIVOS QUE SE MIGRARÁN:');
      console.log('  • c_embler.json         → product_basic_catalog');
      console.log('  • conceptos.json        → concepts_mapping');
      console.log('  • c_embler_ml.json      → product_catalog_with_images');
      console.log('');
      console.log('💡 REQUERIDO: Variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  }
}

module.exports = {
  migrateAllCatalogs,
  checkFiles,
  verifyMigration,
  BasicCatalogMigrator,
  ConceptsMigrator,
  CatalogWithImagesMigrator
}; 
