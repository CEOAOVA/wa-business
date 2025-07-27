const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configura tu Supabase
const supabaseUrl = 'https://cjigdlbgxssydcvyjwpc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqaWdkbGJneHNzeWRjdnlqd3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDgwNDksImV4cCI6MjA2ODE4NDA0OX0.rCgXUFlV9Y4SC9mZl6bPPO8Z6RK5UF1kYv40fcx-FyQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Ruta del archivo JSON
const archivoJson = path.join(__dirname, 'public', 'embler', 'inventario', 'conceptos.json');

// Insertar datos desde archivo
async function insertarDatos() {
  try {
    const datos = JSON.parse(fs.readFileSync(archivoJson, 'utf8'));

    for (const item of datos) {
      const { error } = await supabase
        .from('conceptos_json')
        .insert([{ catalogo: item }]);

      if (error) {
        console.error('❌ Error insertando objeto:', error.message);
      } else {
        console.log('✅ Objeto insertado:', item);
      }
    }
  } catch (err) {
    console.error('Error leyendo archivo JSON:', err.message);
  }
}

// Ejecutar proceso
insertarDatos();
