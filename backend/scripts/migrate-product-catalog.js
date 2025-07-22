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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Migra el catálogo de productos desde c_embler_ml.json a Supabase
 */
async function migrateProductCatalog() {
  console.log('🚀 Iniciando migración del catálogo de productos...\n');
  
  try {
    // Verificar si el archivo existe
    const catalogPath = path.join(process.cwd(), 'public', 'embler', 'inventario', 'c_embler_ml.json');
    
    if (!fs.existsSync(catalogPath)) {
      console.error(`❌ Archivo no encontrado: ${catalogPath}`);
      console.log('💡 Asegúrate de que el archivo c_embler_ml.json existe en public/embler/inventario/');
      process.exit(1);
    }
    
    console.log(`📂 Leyendo archivo: ${catalogPath}`);
    
    // Leer el archivo JSON
    const catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    console.log(`📦 Total de productos a migrar: ${catalogData.length}\n`);
    
    // Limpiar tabla existente (opcional)
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      console.log('🧹 Limpiando tabla product_catalog...');
      const { error: deleteError } = await supabase
        .from('product_catalog')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos
      
      if (deleteError) {
        console.error('❌ Error limpiando tabla:', deleteError);
      } else {
        console.log('✅ Tabla limpiada\n');
      }
    }
    
    // Procesar en lotes para evitar timeouts
    const BATCH_SIZE = 500; // Lotes de 500 productos
    let successfulInserts = 0;
    let failedInserts = 0;
    
    for (let i = 0; i < catalogData.length; i += BATCH_SIZE) {
      const batch = catalogData.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(catalogData.length / BATCH_SIZE);
      
      console.log(`📊 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} productos)...`);
      
      // Transformar datos al formato de Supabase
      const transformedBatch = batch.map(product => ({
        titulo: product.titulo || 'Sin título',
        categoria: product.categoria || null,
        imagen_1: product.imagen_1 || null,
        imagen_2: product.imagen_2 || null,
        imagen_3: product.imagen_3 || null,
        imagen_4: product.imagen_4 || null,
        imagen_5: product.imagen_5 || null,
        imagen_6: product.imagen_6 || null,
        imagen_7: product.imagen_7 || null,
        imagen_8: product.imagen_8 || null,
        imagen_9: product.imagen_9 || null,
        imagen_10: product.imagen_10 || null,
        is_active: true
      })).filter(product => product.titulo && product.titulo.trim() !== ''); // Filtrar productos sin título
      
      if (transformedBatch.length === 0) {
        console.log('⚠️  Lote vacío después de filtrar, saltando...\n');
        continue;
      }
      
      // Insertar en Supabase
      const { data, error } = await supabase
        .from('product_catalog')
        .insert(transformedBatch);
      
      if (error) {
        console.error(`❌ Error en lote ${batchNumber}:`, error.message);
        failedInserts += batch.length;
        
        // Si hay error de rate limit, esperar y reintentar
        if (error.message.includes('rate limit') || error.message.includes('timeout')) {
          console.log('⏳ Esperando 5 segundos antes de reintentar...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          i -= BATCH_SIZE; // Reintentar el mismo lote
          continue;
        }
      } else {
        successfulInserts += transformedBatch.length;
        console.log(`✅ Lote ${batchNumber} completado (${transformedBatch.length} productos)`);
      }
      
      // Pequeña pausa entre lotes para no sobrecargar
      if (i + BATCH_SIZE < catalogData.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(''); // Línea en blanco para separar lotes
    }
    
    // Resumen final
    console.log('🎉 Migración completada!\n');
    console.log('📊 RESUMEN:');
    console.log(`✅ Productos insertados exitosamente: ${successfulInserts}`);
    console.log(`❌ Productos fallidos: ${failedInserts}`);
    console.log(`📦 Total procesados: ${successfulInserts + failedInserts}`);
    
    // Verificar conteo en base de datos
    const { count, error: countError } = await supabase
      .from('product_catalog')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`🗄️  Total en base de datos: ${count}`);
    }
    
    console.log('\n✨ ¡Catálogo migrado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

/**
 * Función para verificar el estado actual
 */
async function checkCurrentState() {
  console.log('🔍 Verificando estado actual del catálogo...\n');
  
  // Contar productos actuales
  const { count, error } = await supabase
    .from('product_catalog')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Error consultando base de datos:', error);
    return;
  }
  
  console.log(`📊 Productos actuales en Supabase: ${count}`);
  
  // Verificar archivo JSON
  const catalogPath = path.join(process.cwd(), 'public', 'embler', 'inventario', 'c_embler_ml.json');
  
  if (fs.existsSync(catalogPath)) {
    const catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    console.log(`📂 Productos en archivo JSON: ${catalogData.length}`);
    console.log(`📏 Tamaño del archivo: ${(fs.statSync(catalogPath).size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.log('❌ Archivo c_embler_ml.json no encontrado');
  }
  
  console.log('');
}

// Ejecutar según los argumentos
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      checkCurrentState();
      break;
    case 'migrate':
      migrateProductCatalog();
      break;
    default:
      console.log('📋 USO:');
      console.log('  node migrate-product-catalog.js check     # Verificar estado actual');
      console.log('  node migrate-product-catalog.js migrate   # Migrar catálogo');
      console.log('  node migrate-product-catalog.js migrate --clear   # Limpiar y migrar');
      console.log('');
      console.log('💡 REQUERIDO: Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  }
}

module.exports = { migrateProductCatalog, checkCurrentState }; 