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
 * 🧠 MIGRACIÓN OPTIMIZADA PARA IA
 * 
 * Esta migración está diseñada para que la IA entienda los datos semiestructurados:
 * - Extrae automáticamente marcas de vehículos
 * - Identifica tipos de autopartes
 * - Genera keywords inteligentes
 * - Crea descripciones semánticas
 * - Categoriza para búsqueda IA
 */

class AIOptimizedMigrator {
  constructor() {
    this.stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      withBrand: 0,
      withPartType: 0,
      startTime: Date.now()
    };
  }

  /**
   * Migrar catálogo básico con procesamiento IA
   */
  async migrateBasicCatalog(batchSize = 500, maxProducts = null) {
    console.log('\n🧠 === MIGRACIÓN IA: CATÁLOGO BÁSICO ===\n');
    
    try {
      // Leer archivo JSON
             const filePath = path.join(process.cwd(), '..', '..', 'public', 'embler', 'inventario', 'c_embler.json');
      console.log(`📂 Leyendo: ${filePath}`);
      
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const totalProducts = maxProducts ? Math.min(rawData.length, maxProducts) : rawData.length;
      
      console.log(`📊 Total productos a procesar: ${totalProducts}`);
      console.log(`🧠 Cada producto será procesado automáticamente por IA`);
      console.log(`   • Extracción de marca de vehículo`);
      console.log(`   • Identificación de tipo de autoparte`);
      console.log(`   • Generación de keywords inteligentes`);
      console.log(`   • Descripción semántica para IA\n`);

      // Limpiar datos existentes de prueba
      await this.cleanTestData();

      // Procesar en lotes
      const totalBatches = Math.ceil(totalProducts / batchSize);
      
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const startIdx = batchNum * batchSize;
        const endIdx = Math.min(startIdx + batchSize, totalProducts);
        const batch = rawData.slice(startIdx, endIdx);

        console.log(`📦 Lote ${batchNum + 1}/${totalBatches}: Procesando ${batch.length} productos...`);

        const success = await this.processBatchBasic(batch, batchNum + 1);
        
        if (success) {
          console.log(`✅ Lote ${batchNum + 1} completado exitosamente`);
        } else {
          console.log(`⚠️  Lote ${batchNum + 1} tuvo errores`);
        }

        // Pausa para evitar rate limits
        await this.delay(500);
        
        // Mostrar progreso cada 5 lotes
        if ((batchNum + 1) % 5 === 0) {
          await this.showProgress();
        }
      }

      await this.showFinalStats('CATÁLOGO BÁSICO');
      return this.stats;

    } catch (error) {
      console.error('❌ Error en migración del catálogo básico:', error);
      throw error;
    }
  }

  /**
   * Migrar catálogo con imágenes con procesamiento IA
   */
  async migrateImagesCatalog(batchSize = 300, maxProducts = null) {
    console.log('\n🖼️ === MIGRACIÓN IA: CATÁLOGO CON IMÁGENES ===\n');
    
    try {
      // Leer archivo JSON  
             const filePath = path.join(process.cwd(), '..', '..', 'public', 'embler', 'inventario', 'c_embler_ml.json');
      console.log(`📂 Leyendo: ${filePath}`);
      
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const totalProducts = maxProducts ? Math.min(rawData.length, maxProducts) : rawData.length;
      
      console.log(`📊 Total productos con imágenes: ${totalProducts}`);
      console.log(`🧠 Procesamiento IA incluye análisis de imágenes:\n`);

      // Procesar en lotes más pequeños (imágenes son más pesadas)
      const totalBatches = Math.ceil(totalProducts / batchSize);
      
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const startIdx = batchNum * batchSize;
        const endIdx = Math.min(startIdx + batchSize, totalProducts);
        const batch = rawData.slice(startIdx, endIdx);

        console.log(`📦 Lote ${batchNum + 1}/${totalBatches}: Procesando ${batch.length} productos con imágenes...`);

        const success = await this.processBatchImages(batch, batchNum + 1);
        
        if (success) {
          console.log(`✅ Lote ${batchNum + 1} completado exitosamente`);
        } else {
          console.log(`⚠️  Lote ${batchNum + 1} tuvo errores`);
        }

        // Pausa más larga para imágenes
        await this.delay(1000);
        
        // Mostrar progreso cada 3 lotes
        if ((batchNum + 1) % 3 === 0) {
          await this.showProgress();
        }
      }

      await this.showFinalStats('CATÁLOGO CON IMÁGENES');
      return this.stats;

    } catch (error) {
      console.error('❌ Error en migración del catálogo con imágenes:', error);
      throw error;
    }
  }

  /**
   * Procesar lote de productos básicos
   */
  async processBatchBasic(batch, batchNumber) {
    try {
      // Filtrar y transformar productos válidos
      const validProducts = batch
        .filter(item => item && item.Nombre && item.Nombre.trim() !== '')
        .map(item => ({
          clave: item.Clave && item.Clave.toString().trim() !== '' ? item.Clave.toString() : null,
          nombre: item.Nombre.trim(),
          is_active: true
        }));

      if (validProducts.length === 0) {
        console.log(`⚠️  Lote ${batchNumber}: Sin productos válidos`);
        return true;
      }

      // Insertar usando las funciones IA (triggers automáticos)
      const { data, error } = await supabase
        .from('product_basic_catalog')
        .insert(validProducts)
        .select('extracted_brand, extracted_part_type');

      if (error) {
        console.error(`❌ Error en lote ${batchNumber}:`, error.message);
        this.stats.failed += validProducts.length;
        return false;
      }

      // Actualizar estadísticas IA
      this.stats.processed += validProducts.length;
      this.stats.successful += validProducts.length;
      
      if (data) {
        this.stats.withBrand += data.filter(item => item.extracted_brand).length;
        this.stats.withPartType += data.filter(item => item.extracted_part_type).length;
      }

      return true;

    } catch (error) {
      console.error(`❌ Error procesando lote ${batchNumber}:`, error);
      this.stats.failed += batch.length;
      return false;
    }
  }

  /**
   * Procesar lote de productos con imágenes
   */
  async processBatchImages(batch, batchNumber) {
    try {
      // Filtrar y transformar productos válidos
      const validProducts = batch
        .filter(item => item && item.titulo && item.titulo.trim() !== '')
        .map(item => ({
          titulo: item.titulo.trim(),
          categoria: item.categoria || null,
          imagen_1: this.validateImageUrl(item.imagen_1),
          imagen_2: this.validateImageUrl(item.imagen_2),
          imagen_3: this.validateImageUrl(item.imagen_3),
          imagen_4: this.validateImageUrl(item.imagen_4),
          imagen_5: this.validateImageUrl(item.imagen_5),
          imagen_6: this.validateImageUrl(item.imagen_6),
          imagen_7: this.validateImageUrl(item.imagen_7),
          imagen_8: this.validateImageUrl(item.imagen_8),
          imagen_9: this.validateImageUrl(item.imagen_9),
          imagen_10: this.validateImageUrl(item.imagen_10),
          is_active: true
        }));

      if (validProducts.length === 0) {
        console.log(`⚠️  Lote ${batchNumber}: Sin productos válidos`);
        return true;
      }

      // Insertar usando las funciones IA (triggers automáticos)
      const { data, error } = await supabase
        .from('product_catalog_with_images')
        .insert(validProducts)
        .select('extracted_brand, extracted_part_type, total_images');

      if (error) {
        console.error(`❌ Error en lote ${batchNumber}:`, error.message);
        this.stats.failed += validProducts.length;
        return false;
      }

      // Actualizar estadísticas IA
      this.stats.processed += validProducts.length;
      this.stats.successful += validProducts.length;
      
      if (data) {
        this.stats.withBrand += data.filter(item => item.extracted_brand).length;
        this.stats.withPartType += data.filter(item => item.extracted_part_type).length;
      }

      return true;

    } catch (error) {
      console.error(`❌ Error procesando lote ${batchNumber}:`, error);
      this.stats.failed += batch.length;
      return false;
    }
  }

  /**
   * Validar URL de imagen
   */
  validateImageUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    return trimmed.startsWith('http') ? trimmed : null;
  }

  /**
   * Limpiar datos de prueba
   */
  async cleanTestData() {
    try {
      console.log('🧹 Limpiando datos de prueba...');
      await supabase.from('product_basic_catalog').delete().like('clave', 'TEST%');
      console.log('✅ Datos de prueba limpiados\n');
    } catch (error) {
      console.log('⚠️  Error limpiando datos de prueba (continuar anyway)');
    }
  }

  /**
   * Mostrar progreso actual
   */
  async showProgress() {
    try {
      const { count: totalBasic } = await supabase
        .from('product_basic_catalog')
        .select('*', { count: 'exact', head: true });

      const { count: totalImages } = await supabase
        .from('product_catalog_with_images')
        .select('*', { count: 'exact', head: true });

      const elapsedTime = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
      const successRate = this.stats.processed > 0 ? ((this.stats.successful / this.stats.processed) * 100).toFixed(1) : 0;
      const brandDetectionRate = this.stats.successful > 0 ? ((this.stats.withBrand / this.stats.successful) * 100).toFixed(1) : 0;
      const partTypeDetectionRate = this.stats.successful > 0 ? ((this.stats.withPartType / this.stats.successful) * 100).toFixed(1) : 0;

      console.log(`\n📊 PROGRESO ACTUAL:`);
      console.log(`   ⏱️  Tiempo transcurrido: ${elapsedTime}s`);
      console.log(`   📦 Productos procesados: ${this.stats.processed}`);
      console.log(`   ✅ Éxito: ${this.stats.successful} (${successRate}%)`);
      console.log(`   ❌ Fallos: ${this.stats.failed}`);
      console.log(`   🧠 IA - Marcas detectadas: ${this.stats.withBrand} (${brandDetectionRate}%)`);
      console.log(`   🧠 IA - Tipos detectados: ${this.stats.withPartType} (${partTypeDetectionRate}%)`);
      console.log(`   📚 Total en DB básico: ${totalBasic || 0}`);
      console.log(`   🖼️  Total en DB imágenes: ${totalImages || 0}\n`);

    } catch (error) {
      console.log('⚠️  Error mostrando progreso');
    }
  }

  /**
   * Mostrar estadísticas finales
   */
  async showFinalStats(catalogType) {
    const totalTime = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);
    const productsPerSecond = this.stats.successful > 0 ? (this.stats.successful / (totalTime / 1000)).toFixed(1) : 0;

    console.log(`\n🎉 === MIGRACIÓN ${catalogType} COMPLETADA ===`);
    console.log(`⏱️  Tiempo total: ${totalTime} segundos`);
    console.log(`📦 Productos procesados: ${this.stats.processed}`);
    console.log(`✅ Exitosos: ${this.stats.successful}`);
    console.log(`❌ Fallidos: ${this.stats.failed}`);
    console.log(`⚡ Velocidad: ${productsPerSecond} productos/segundo`);
    console.log(`\n🧠 ANÁLISIS IA:`);
    console.log(`🏷️  Marcas detectadas: ${this.stats.withBrand} (${((this.stats.withBrand / this.stats.successful) * 100).toFixed(1)}%)`);
    console.log(`🔧 Tipos detectados: ${this.stats.withPartType} (${((this.stats.withPartType / this.stats.successful) * 100).toFixed(1)}%)`);

    // Verificar base de datos
    await this.verifyDatabase();
  }

  /**
   * Verificar estado de la base de datos
   */
  async verifyDatabase() {
    try {
      console.log(`\n🔍 VERIFICACIÓN BASE DE DATOS:`);

      const tables = [
        { name: 'concepts_mapping', desc: 'Conceptos mexicanos' },
        { name: 'product_basic_catalog', desc: 'Catálogo básico' },
        { name: 'product_catalog_with_images', desc: 'Catálogo con imágenes' },
        { name: 'vehicle_brands', desc: 'Marcas de vehículos' },
        { name: 'autopart_types', desc: 'Tipos de autopartes' }
      ];

      for (const table of tables) {
        const { count, error } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table.desc}: Error - ${error.message}`);
        } else {
          console.log(`📊 ${table.desc}: ${count} registros`);
        }
      }

    } catch (error) {
      console.error('❌ Error verificando base de datos:', error);
    }
  }

  /**
   * Delay utility
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Función principal
 */
async function runAIOptimizedMigration() {
  console.log('🚀 ========================================');
  console.log('    MIGRACIÓN OPTIMIZADA PARA IA');
  console.log('========================================\n');
  console.log('🧠 Esta migración procesa datos semiestructurados');
  console.log('   para que la IA los entienda perfectamente:\n');
  console.log('   ✅ Extracción automática de marcas');
  console.log('   ✅ Identificación de tipos de autopartes');
  console.log('   ✅ Generación de keywords inteligentes');
  console.log('   ✅ Descripciones semánticas para IA');
  console.log('   ✅ Categorización automática\n');

  const migrator = new AIOptimizedMigrator();

  try {
    // Argumentos de línea de comandos
    const args = process.argv.slice(2);
    const catalogType = args[0] || 'basic';
    const maxProducts = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

    if (catalogType === 'basic' || catalogType === 'all') {
      await migrator.migrateBasicCatalog(500, maxProducts);
    }

    if (catalogType === 'images' || catalogType === 'all') {
      await migrator.migrateImagesCatalog(300, maxProducts);
    }

    console.log('\n🎉 ¡MIGRACIÓN IA COMPLETADA EXITOSAMENTE!');
    console.log('🧠 Los datos están optimizados para comprensión de IA');

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO EN MIGRACIÓN IA:', error.message);
    process.exit(1);
  }
}

// Mostrar ayuda si se ejecuta sin argumentos
if (require.main === module) {
  const command = process.argv[2];
  
  if (!command || command === 'help') {
    console.log('🧠 MIGRACIÓN OPTIMIZADA PARA IA - USO:');
    console.log('');
    console.log('  node ai-optimized-migration.js basic          # Migrar catálogo básico');
    console.log('  node ai-optimized-migration.js images         # Migrar catálogo con imágenes');
    console.log('  node ai-optimized-migration.js all            # Migrar ambos catálogos');
    console.log('  node ai-optimized-migration.js basic --limit 1000  # Limitar productos');
    console.log('');
    console.log('🧠 CARACTERÍSTICAS IA:');
    console.log('  • Extracción automática de marcas de vehículos');
    console.log('  • Identificación inteligente de tipos de autopartes');
    console.log('  • Generación de keywords para búsqueda semántica');
    console.log('  • Descripciones estructuradas para IA');
    console.log('  • Categorización automática por contexto');
    console.log('');
    console.log('📋 REQUERIDO: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  } else {
    runAIOptimizedMigration();
  }
}

module.exports = { AIOptimizedMigrator }; 