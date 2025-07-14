/**
 * Script para crear directorios necesarios para multimedia
 */

const fs = require('fs');
const path = require('path');

// Crear directorios para uploads multimedia
const uploadDirs = [
  'uploads',
  'uploads/media',
  'uploads/thumbnails',
  'uploads/temp',
  'uploads/images',
  'uploads/documents',
  'uploads/audio',
  'uploads/video',
  'uploads/stickers'
];

console.log('📁 Creando estructura de directorios para uploads...');

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Creado directorio: ${dir}`);
  } else {
    console.log(`⚠️  Directorio ya existe: ${dir}`);
  }
});

// Crear archivo .gitkeep para mantener directorios vacíos en git
uploadDirs.forEach(dir => {
  const gitkeepPath = path.join(__dirname, dir, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '# Mantener directorio en git\n');
    console.log(`✅ Creado .gitkeep en: ${dir}`);
  }
});

console.log('🎉 Estructura de directorios creada exitosamente!');

// Mostrar estadísticas
const stats = {
  totalDirs: uploadDirs.length,
  newDirs: 0,
  existingDirs: 0
};

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    stats.existingDirs++;
  } else {
    stats.newDirs++;
  }
});

console.log('\n📊 Estadísticas:');
console.log(`   Total directorios: ${stats.totalDirs}`);
console.log(`   Nuevos directorios: ${stats.newDirs}`);
console.log(`   Directorios existentes: ${stats.existingDirs}`); 