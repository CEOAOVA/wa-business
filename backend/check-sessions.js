// Script simple para verificar sesiones activas
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno manualmente
function loadEnvFile(filePath) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
                    process.env[key.trim()] = value.trim();
                }
            }
        });
    }
}

// Cargar archivo de entorno
loadEnvFile('./env.local');

console.log('🔍 Verificando sesiones activas...\n');

// Verificar variables de entorno
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📊 Configuración de Supabase:');
console.log(`• URL: ${supabaseUrl ? '✅ Configurada' : '❌ No configurada'}`);
console.log(`• Service Key: ${supabaseKey ? '✅ Configurada' : '❌ No configurada'}`);

if (!supabaseUrl || !supabaseKey) {
    console.log('\n❌ Configuración de Supabase incompleta');
    console.log('💡 Asegúrate de que las variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén configuradas en env.local');
    process.exit(1);
}

// Verificar archivos de log para sesiones recientes
console.log('\n📊 Verificando logs de aplicación...');

const logFiles = [
    './logs/application.log',
    './logs/combined.log',
    './logs/error.log'
];

logFiles.forEach(logFile => {
    if (fs.existsSync(logFile)) {
        try {
            const stats = fs.statSync(logFile);
            const content = fs.readFileSync(logFile, 'utf8');
            const lines = content.split('\n');
            
            console.log(`\n📄 ${logFile}:`);
            console.log(`• Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
            console.log(`• Líneas: ${lines.length}`);
            
            // Buscar líneas relacionadas con sesiones
            const sessionLines = lines.filter(line => 
                line.includes('login') || 
                line.includes('session') || 
                line.includes('auth') ||
                line.includes('user')
            ).slice(-5); // Últimas 5 líneas
            
            if (sessionLines.length > 0) {
                console.log(`• Actividad reciente:`);
                sessionLines.forEach(line => {
                    console.log(`  - ${line.substring(0, 100)}...`);
                });
            }
        } catch (error) {
            console.log(`❌ Error leyendo ${logFile}: ${error.message}`);
        }
    } else {
        console.log(`\n📄 ${logFile}: ❌ No encontrado`);
    }
});

// Verificar procesos Node.js activos
console.log('\n📊 Procesos Node.js activos:');
try {
    const { execSync } = require('child_process');
    const processes = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', { encoding: 'utf8' });
    const lines = processes.split('\n').filter(line => line.includes('node.exe'));
    
    console.log(`• Total de procesos Node.js: ${lines.length}`);
    
    if (lines.length > 0) {
        lines.forEach((line, index) => {
            const parts = line.split(',');
            if (parts.length >= 5) {
                const pid = parts[1].replace(/"/g, '');
                const memory = parts[4].replace(/"/g, '');
                console.log(`  ${index + 1}. PID: ${pid}, Memoria: ${memory}`);
            }
        });
    }
} catch (error) {
    console.log(`❌ Error obteniendo procesos: ${error.message}`);
}

// Verificar puertos en uso
console.log('\n📊 Puertos en uso:');
const ports = [3001, 5173, 3000];
ports.forEach(port => {
    try {
        const { execSync } = require('child_process');
        const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        if (result.trim()) {
            console.log(`• Puerto ${port}: ✅ En uso`);
            const lines = result.split('\n').filter(line => line.trim());
            lines.forEach(line => {
                console.log(`  - ${line.trim()}`);
            });
        } else {
            console.log(`• Puerto ${port}: ❌ No en uso`);
        }
    } catch (error) {
        console.log(`• Puerto ${port}: ❌ No en uso`);
    }
});

console.log('\n🎉 Verificación completada');
console.log('\n💡 Para verificar sesiones específicas de Supabase, ejecuta:');
console.log('   npm run dev (para iniciar el backend)');
console.log('   Luego abre: http://localhost:5173/check-active-session.html'); 