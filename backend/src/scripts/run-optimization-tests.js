#!/usr/bin/env node

/**
 * Script Maestro para Testing de Optimizaciones
 * Ejecuta todos los tests de optimización y genera un reporte completo
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class OptimizationTestRunner {
  constructor() {
    this.results = {
      tests: [],
      benchmarks: [],
      thresholds: [],
      summary: {}
    };
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    const colors = {
      green: '\x1b[32m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      reset: '\x1b[0m',
      bold: '\x1b[1m'
    };
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runScript(scriptPath, description) {
    return new Promise((resolve, reject) => {
      this.log(`\n🚀 Ejecutando: ${description}`, 'blue');
      
      const child = spawn('node', [scriptPath], {
        stdio: 'pipe',
        cwd: path.dirname(scriptPath)
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(data);
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.log(`✅ ${description} completado exitosamente`, 'green');
          resolve({ success: true, output, errorOutput });
        } else {
          this.log(`❌ ${description} falló con código ${code}`, 'red');
          resolve({ success: false, output, errorOutput, code });
        }
      });

      child.on('error', (error) => {
        this.log(`❌ Error ejecutando ${description}: ${error.message}`, 'red');
        reject(error);
      });
    });
  }

  async runAllTests() {
    this.log('\n' + '='.repeat(60), 'bold');
    this.log('🧪 INICIANDO TESTING COMPLETO DE OPTIMIZACIONES', 'bold');
    this.log('='.repeat(60), 'bold');

    const scripts = [
      {
        path: path.join(__dirname, 'test-optimizations.js'),
        description: 'Testing de Optimizaciones Implementadas'
      },
      {
        path: path.join(__dirname, 'performance-benchmark.js'),
        description: 'Benchmark de Rendimiento'
      },
      {
        path: path.join(__dirname, 'adjust-thresholds.js'),
        description: 'Análisis y Ajuste de Thresholds'
      }
    ];

    for (const script of scripts) {
      try {
        const result = await this.runScript(script.path, script.description);
        
        if (script.description.includes('Testing')) {
          this.results.tests.push({ script: script.description, ...result });
        } else if (script.description.includes('Benchmark')) {
          this.results.benchmarks.push({ script: script.description, ...result });
        } else if (script.description.includes('Thresholds')) {
          this.results.thresholds.push({ script: script.description, ...result });
        }
      } catch (error) {
        this.log(`❌ Error ejecutando ${script.description}: ${error.message}`, 'red');
      }
    }

    this.generateFinalReport();
  }

  generateFinalReport() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    this.log('\n' + '='.repeat(60), 'blue');
    this.log('📊 REPORTE FINAL DE TESTING DE OPTIMIZACIONES', 'bold');
    this.log('='.repeat(60), 'blue');

    // Estadísticas generales
    const totalTests = this.results.tests.length;
    const passedTests = this.results.tests.filter(t => t.success).length;
    const totalBenchmarks = this.results.benchmarks.length;
    const successfulBenchmarks = this.results.benchmarks.filter(b => b.success).length;
    const totalThresholds = this.results.thresholds.length;
    const successfulThresholds = this.results.thresholds.filter(t => t.success).length;

    this.log(`\n⏱️  Duración Total: ${duration} segundos`);
    this.log(`📋 Tests de Optimización: ${passedTests}/${totalTests} exitosos`);
    this.log(`📊 Benchmarks: ${successfulBenchmarks}/${totalBenchmarks} exitosos`);
    this.log(`⚙️  Análisis de Thresholds: ${successfulThresholds}/${totalThresholds} exitosos`);

    // Detalles por categoría
    this.log('\n📋 DETALLES POR CATEGORÍA:', 'bold');

    // Tests de optimización
    this.log('\n🔍 Tests de Optimización:');
    this.results.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      const color = test.success ? 'green' : 'red';
      this.log(`   ${status} ${test.script}`, color);
    });

    // Benchmarks
    this.log('\n📊 Benchmarks de Rendimiento:');
    this.results.benchmarks.forEach(benchmark => {
      const status = benchmark.success ? '✅' : '❌';
      const color = benchmark.success ? 'green' : 'red';
      this.log(`   ${status} ${benchmark.script}`, color);
    });

    // Thresholds
    this.log('\n⚙️  Análisis de Thresholds:');
    this.results.thresholds.forEach(threshold => {
      const status = threshold.success ? '✅' : '❌';
      const color = threshold.success ? 'green' : 'red';
      this.log(`   ${status} ${threshold.script}`, color);
    });

    // Resumen de estado
    this.log('\n📈 RESUMEN DE ESTADO:', 'bold');
    
    const overallSuccess = passedTests === totalTests && 
                          successfulBenchmarks === totalBenchmarks && 
                          successfulThresholds === totalThresholds;

    if (overallSuccess) {
      this.log('🎉 ¡TODAS LAS OPTIMIZACIONES ESTÁN FUNCIONANDO CORRECTAMENTE!', 'green');
      this.log('✅ Sistema listo para producción', 'green');
    } else {
      this.log('⚠️  Algunas optimizaciones requieren atención', 'yellow');
      
      if (passedTests < totalTests) {
        this.log('   - Revisar tests de optimización fallidos', 'yellow');
      }
      if (successfulBenchmarks < totalBenchmarks) {
        this.log('   - Revisar benchmarks de rendimiento', 'yellow');
      }
      if (successfulThresholds < totalThresholds) {
        this.log('   - Revisar análisis de thresholds', 'yellow');
      }
    }

    // Guardar reporte
    this.saveReport();
  }

  saveReport() {
    const reportPath = path.join(__dirname, '../data/optimization-test-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      duration: ((Date.now() - this.startTime) / 1000).toFixed(2),
      results: this.results,
      summary: {
        totalTests: this.results.tests.length,
        passedTests: this.results.tests.filter(t => t.success).length,
        totalBenchmarks: this.results.benchmarks.length,
        successfulBenchmarks: this.results.benchmarks.filter(b => b.success).length,
        totalThresholds: this.results.thresholds.length,
        successfulThresholds: this.results.thresholds.filter(t => t.success).length
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`\n📄 Reporte guardado en: ${reportPath}`, 'blue');
  }

  // Método para verificar archivos de configuración
  async verifyConfiguration() {
    this.log('\n🔍 Verificando archivos de configuración...', 'blue');

    const requiredFiles = [
      '../config/logger.ts',
      '../services/monitoring/memory-monitor.ts',
      '../services/monitoring/performance-metrics.ts',
      '../services/cache/lru-cache.ts',
      '../routes/monitoring.ts',
      '../../frontend/src/services/logger.ts',
      '../../frontend/src/utils/auth-cleanup.ts',
      '../../frontend/src/services/whatsapp-api.ts',
      '../../frontend/src/components/PerformanceMetrics.tsx'
    ];

    let missingFiles = [];
    let existingFiles = [];

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        existingFiles.push(file);
      } else {
        missingFiles.push(file);
      }
    }

    this.log(`\n📁 Archivos encontrados: ${existingFiles.length}/${requiredFiles.length}`, 'green');
    
    if (missingFiles.length > 0) {
      this.log('\n❌ Archivos faltantes:', 'red');
      missingFiles.forEach(file => {
        this.log(`   - ${file}`, 'red');
      });
    } else {
      this.log('✅ Todos los archivos de configuración están presentes', 'green');
    }

    return { existingFiles, missingFiles };
  }
}

// Ejecutar testing completo
const runner = new OptimizationTestRunner();

async function main() {
  try {
    // Verificar configuración primero
    await runner.verifyConfiguration();
    
    // Ejecutar todos los tests
    await runner.runAllTests();
    
    this.log('\n' + '='.repeat(60), 'blue');
    this.log('✅ TESTING COMPLETO FINALIZADO', 'bold');
    this.log('='.repeat(60), 'blue');
  } catch (error) {
    console.error('Error ejecutando testing completo:', error);
    process.exit(1);
  }
}

main(); 