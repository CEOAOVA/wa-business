#!/usr/bin/env node

/**
 * Script de Benchmark de Rendimiento
 * Mide métricas del sistema antes y después de las optimizaciones
 */

const { performance } = require('perf_hooks');
const os = require('os');
const fs = require('fs');
const path = require('path');

class PerformanceBenchmark {
  constructor() {
    this.baselineMetrics = null;
    this.currentMetrics = null;
    this.results = [];
  }

  // Obtener métricas del sistema
  getSystemMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;

    const cpuUsage = os.loadavg()[0]; // 1 minuto promedio
    const uptime = os.uptime();

    return {
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usage: memoryUsage
      },
      cpu: {
        loadAverage: cpuUsage,
        cores: os.cpus().length
      },
      system: {
        uptime,
        platform: os.platform(),
        arch: os.arch()
      },
      timestamp: Date.now()
    };
  }

  // Medir tiempo de respuesta de una función
  async measureFunctionTime(fn, iterations = 100) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
      p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)],
      p99: times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)]
    };
  }

  // Simular carga de trabajo
  async simulateWorkload() {
    // Simular operaciones de base de datos
    const dbOperations = async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    };

    // Simular operaciones de cache
    const cacheOperations = async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
    };

    // Simular operaciones de logging
    const loggingOperations = async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2));
    };

    return {
      db: await this.measureFunctionTime(dbOperations, 50),
      cache: await this.measureFunctionTime(cacheOperations, 100),
      logging: await this.measureFunctionTime(loggingOperations, 200)
    };
  }

  // Ejecutar benchmark completo
  async runBenchmark() {
    console.log('🚀 Iniciando Benchmark de Rendimiento...\n');

    // Métricas del sistema
    console.log('📊 Obteniendo métricas del sistema...');
    this.currentMetrics = this.getSystemMetrics();

    // Simular carga de trabajo
    console.log('⚡ Simulando carga de trabajo...');
    const workloadMetrics = await this.simulateWorkload();

    // Combinar métricas
    const benchmarkResults = {
      system: this.currentMetrics,
      workload: workloadMetrics,
      timestamp: new Date().toISOString()
    };

    // Guardar resultados
    const resultsPath = path.join(__dirname, '../data/benchmark-results.json');
    const resultsDir = path.dirname(resultsPath);
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    fs.writeFileSync(resultsPath, JSON.stringify(benchmarkResults, null, 2));

    // Mostrar resultados
    this.displayResults(benchmarkResults);

    return benchmarkResults;
  }

  // Mostrar resultados del benchmark
  displayResults(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADOS DEL BENCHMARK DE RENDIMIENTO');
    console.log('='.repeat(60));

    // Métricas del sistema
    console.log('\n🖥️  MÉTRICAS DEL SISTEMA:');
    console.log(`   Memoria Total: ${(results.system.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   Memoria Usada: ${(results.system.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   Uso de Memoria: ${results.system.memory.usage.toFixed(2)}%`);
    console.log(`   CPU Load Average: ${results.system.cpu.loadAverage.toFixed(2)}`);
    console.log(`   Cores CPU: ${results.system.cpu.cores}`);
    console.log(`   Uptime: ${(results.system.system.uptime / 3600).toFixed(2)} horas`);

    // Métricas de carga de trabajo
    console.log('\n⚡ MÉTRICAS DE CARGA DE TRABAJO:');
    
    console.log('\n   📊 Operaciones de Base de Datos:');
    console.log(`      Promedio: ${results.workload.db.avg.toFixed(2)}ms`);
    console.log(`      P95: ${results.workload.db.p95.toFixed(2)}ms`);
    console.log(`      P99: ${results.workload.db.p99.toFixed(2)}ms`);

    console.log('\n   📊 Operaciones de Cache:');
    console.log(`      Promedio: ${results.workload.cache.avg.toFixed(2)}ms`);
    console.log(`      P95: ${results.workload.cache.p95.toFixed(2)}ms`);
    console.log(`      P99: ${results.workload.cache.p99.toFixed(2)}ms`);

    console.log('\n   📊 Operaciones de Logging:');
    console.log(`      Promedio: ${results.workload.logging.avg.toFixed(2)}ms`);
    console.log(`      P95: ${results.workload.logging.p95.toFixed(2)}ms`);
    console.log(`      P99: ${results.workload.logging.p99.toFixed(2)}ms`);

    // Análisis de rendimiento
    console.log('\n📈 ANÁLISIS DE RENDIMIENTO:');
    
    const memoryStatus = results.system.memory.usage > 90 ? '🔴 CRÍTICO' :
                        results.system.memory.usage > 80 ? '🟡 ADVERTENCIA' : '🟢 NORMAL';
    
    const cpuStatus = results.system.cpu.loadAverage > 2 ? '🔴 CRÍTICO' :
                     results.system.cpu.loadAverage > 1 ? '🟡 ADVERTENCIA' : '🟢 NORMAL';

    console.log(`   Memoria: ${memoryStatus} (${results.system.memory.usage.toFixed(2)}%)`);
    console.log(`   CPU: ${cpuStatus} (${results.system.cpu.loadAverage.toFixed(2)})`);

    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    if (results.system.memory.usage > 80) {
      console.log('   ⚠️  Considera aumentar la memoria o optimizar el uso de cache');
    }
    if (results.system.cpu.loadAverage > 1) {
      console.log('   ⚠️  Considera optimizar operaciones CPU-intensivas');
    }
    if (results.workload.db.p95 > 50) {
      console.log('   ⚠️  Considera optimizar consultas de base de datos');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Benchmark completado. Resultados guardados en:');
    console.log(`   ${path.join(__dirname, '../data/benchmark-results.json')}`);
    console.log('='.repeat(60));
  }

  // Comparar con baseline (si existe)
  async compareWithBaseline() {
    const baselinePath = path.join(__dirname, '../data/baseline-metrics.json');
    
    if (fs.existsSync(baselinePath)) {
      console.log('\n📊 COMPARANDO CON BASELINE...');
      
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      const current = this.currentMetrics;

      const memoryImprovement = ((baseline.system.memory.usage - current.memory.usage) / baseline.system.memory.usage) * 100;
      const cpuImprovement = ((baseline.system.cpu.loadAverage - current.cpu.loadAverage) / baseline.system.cpu.loadAverage) * 100;

      console.log(`\n   Memoria: ${memoryImprovement > 0 ? '✅' : '❌'} ${Math.abs(memoryImprovement).toFixed(2)}% ${memoryImprovement > 0 ? 'mejorado' : 'empeorado'}`);
      console.log(`   CPU: ${cpuImprovement > 0 ? '✅' : '❌'} ${Math.abs(cpuImprovement).toFixed(2)}% ${cpuImprovement > 0 ? 'mejorado' : 'empeorado'}`);
    }
  }
}

// Ejecutar benchmark
const benchmark = new PerformanceBenchmark();
benchmark.runBenchmark()
  .then(() => benchmark.compareWithBaseline())
  .catch(error => {
    console.error('Error ejecutando benchmark:', error);
    process.exit(1);
  }); 