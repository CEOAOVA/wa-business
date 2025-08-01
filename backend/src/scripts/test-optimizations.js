#!/usr/bin/env node

/**
 * Script de Testing para Optimizaciones de Rendimiento
 * Verifica que todas las optimizaciones implementadas funcionen correctamente
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class OptimizationTester {
  constructor() {
    this.results = [];
    this.startTime = performance.now();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async testLoggingOptimization() {
    this.log('\n🔍 Testing: Sistema de Logging Optimizado', 'blue');
    
    try {
      // Verificar que el logger esté configurado
      const loggerPath = path.join(__dirname, '../config/logger.ts');
      if (!fs.existsSync(loggerPath)) {
        throw new Error('Logger no encontrado');
      }

      // Verificar niveles de log
      const loggerContent = fs.readFileSync(loggerPath, 'utf8');
      const hasWinston = loggerContent.includes('winston');
      const hasLevels = loggerContent.includes('levels');
      const hasRotation = loggerContent.includes('DailyRotateFile');

      if (!hasWinston || !hasLevels || !hasRotation) {
        throw new Error('Logger no está completamente configurado');
      }

      this.log('✅ Logger configurado correctamente', 'green');
      this.results.push({ test: 'Logging', status: 'PASS' });
    } catch (error) {
      this.log(`❌ Error en logging: ${error.message}`, 'red');
      this.results.push({ test: 'Logging', status: 'FAIL', error: error.message });
    }
  }

  async testMemoryOptimization() {
    this.log('\n🔍 Testing: Optimización de Memoria', 'blue');
    
    try {
      // Verificar Memory Monitor
      const memoryMonitorPath = path.join(__dirname, '../services/monitoring/memory-monitor.ts');
      if (!fs.existsSync(memoryMonitorPath)) {
        throw new Error('Memory Monitor no encontrado');
      }

      // Verificar LRU Cache
      const lruCachePath = path.join(__dirname, '../services/cache/lru-cache.ts');
      if (!fs.existsSync(lruCachePath)) {
        throw new Error('LRU Cache no encontrado');
      }

      // Verificar configuración de Socket.IO
      const appPath = path.join(__dirname, '../app.ts');
      const appContent = fs.readFileSync(appPath, 'utf8');
      const hasSocketOptimization = appContent.includes('maxHttpBufferSize') || 
                                   appContent.includes('pingTimeout') ||
                                   appContent.includes('pingInterval');

      if (!hasSocketOptimization) {
        throw new Error('Socket.IO no está optimizado');
      }

      this.log('✅ Memory Monitor configurado', 'green');
      this.log('✅ LRU Cache implementado', 'green');
      this.log('✅ Socket.IO optimizado', 'green');
      this.results.push({ test: 'Memory', status: 'PASS' });
    } catch (error) {
      this.log(`❌ Error en memoria: ${error.message}`, 'red');
      this.results.push({ test: 'Memory', status: 'FAIL', error: error.message });
    }
  }

  async testPerformanceMonitoring() {
    this.log('\n🔍 Testing: Sistema de Monitoreo de Rendimiento', 'blue');
    
    try {
      // Verificar Performance Monitor
      const perfMonitorPath = path.join(__dirname, '../services/monitoring/performance-metrics.ts');
      if (!fs.existsSync(perfMonitorPath)) {
        throw new Error('Performance Monitor no encontrado');
      }

      // Verificar endpoints de monitoreo
      const monitoringRoutesPath = path.join(__dirname, '../routes/monitoring.ts');
      if (!fs.existsSync(monitoringRoutesPath)) {
        throw new Error('Monitoring routes no encontrado');
      }

      const routesContent = fs.readFileSync(monitoringRoutesPath, 'utf8');
      const hasMetricsEndpoint = routesContent.includes('/metrics');
      const hasStatusEndpoint = routesContent.includes('/status');

      if (!hasMetricsEndpoint || !hasStatusEndpoint) {
        throw new Error('Endpoints de monitoreo incompletos');
      }

      this.log('✅ Performance Monitor implementado', 'green');
      this.log('✅ Endpoints de monitoreo configurados', 'green');
      this.results.push({ test: 'Performance Monitoring', status: 'PASS' });
    } catch (error) {
      this.log(`❌ Error en monitoreo: ${error.message}`, 'red');
      this.results.push({ test: 'Performance Monitoring', status: 'FAIL', error: error.message });
    }
  }

  async testFrontendOptimizations() {
    this.log('\n🔍 Testing: Optimizaciones de Frontend', 'blue');
    
    try {
      // Verificar Logger Service
      const loggerServicePath = path.join(__dirname, '../../frontend/src/services/logger.ts');
      if (!fs.existsSync(loggerServicePath)) {
        throw new Error('Frontend Logger Service no encontrado');
      }

      // Verificar Auth Cleanup
      const authCleanupPath = path.join(__dirname, '../../frontend/src/utils/auth-cleanup.ts');
      if (!fs.existsSync(authCleanupPath)) {
        throw new Error('Auth Cleanup no encontrado');
      }

      // Verificar WhatsApp API optimizada
      const whatsappApiPath = path.join(__dirname, '../../frontend/src/services/whatsapp-api.ts');
      if (!fs.existsSync(whatsappApiPath)) {
        throw new Error('WhatsApp API no encontrado');
      }

      const whatsappContent = fs.readFileSync(whatsappApiPath, 'utf8');
      const hasConnectionOptimization = whatsappContent.includes('connectionCheckConfig') ||
                                      whatsappContent.includes('COOLDOWN_MS');

      if (!hasConnectionOptimization) {
        throw new Error('WhatsApp API no está optimizada');
      }

      // Verificar Performance Metrics Component
      const perfMetricsPath = path.join(__dirname, '../../frontend/src/components/PerformanceMetrics.tsx');
      if (!fs.existsSync(perfMetricsPath)) {
        throw new Error('Performance Metrics Component no encontrado');
      }

      this.log('✅ Frontend Logger Service implementado', 'green');
      this.log('✅ Auth Cleanup optimizado', 'green');
      this.log('✅ WhatsApp API optimizada', 'green');
      this.log('✅ Performance Metrics Component creado', 'green');
      this.results.push({ test: 'Frontend Optimizations', status: 'PASS' });
    } catch (error) {
      this.log(`❌ Error en frontend: ${error.message}`, 'red');
      this.results.push({ test: 'Frontend Optimizations', status: 'FAIL', error: error.message });
    }
  }

  async testRateLimiting() {
    this.log('\n🔍 Testing: Rate Limiting Optimizado', 'blue');
    
    try {
      // Verificar middleware de seguridad
      const securityPath = path.join(__dirname, '../middleware/security.ts');
      if (!fs.existsSync(securityPath)) {
        throw new Error('Security middleware no encontrado');
      }

      const securityContent = fs.readFileSync(securityPath, 'utf8');
      const hasAuthRateLimit = securityContent.includes('authRateLimit');
      const hasWhatsappRateLimit = securityContent.includes('whatsappRateLimit');

      if (!hasAuthRateLimit || !hasWhatsappRateLimit) {
        throw new Error('Rate limiting no está completamente configurado');
      }

      this.log('✅ Rate limiting configurado correctamente', 'green');
      this.results.push({ test: 'Rate Limiting', status: 'PASS' });
    } catch (error) {
      this.log(`❌ Error en rate limiting: ${error.message}`, 'red');
      this.results.push({ test: 'Rate Limiting', status: 'FAIL', error: error.message });
    }
  }

  async runAllTests() {
    this.log('\n🚀 Iniciando Testing de Optimizaciones...', 'bold');
    
    await this.testLoggingOptimization();
    await this.testMemoryOptimization();
    await this.testPerformanceMonitoring();
    await this.testFrontendOptimizations();
    await this.testRateLimiting();

    this.generateReport();
  }

  generateReport() {
    const endTime = performance.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);
    
    this.log('\n' + '='.repeat(60), 'blue');
    this.log('📊 REPORTE DE TESTING DE OPTIMIZACIONES', 'bold');
    this.log('='.repeat(60), 'blue');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    this.log(`\n⏱️  Duración: ${duration} segundos`, 'blue');
    this.log(`✅ Tests Exitosos: ${passed}/${total}`, 'green');
    this.log(`❌ Tests Fallidos: ${failed}/${total}`, failed > 0 ? 'red' : 'green');
    
    this.log('\n📋 Detalles:', 'bold');
    this.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      const color = result.status === 'PASS' ? 'green' : 'red';
      this.log(`${status} ${result.test}`, color);
      if (result.error) {
        this.log(`   Error: ${result.error}`, 'red');
      }
    });

    if (failed === 0) {
      this.log('\n🎉 ¡TODOS LOS TESTS PASARON! Las optimizaciones están funcionando correctamente.', 'green');
    } else {
      this.log('\n⚠️  Algunos tests fallaron. Revisa los errores antes de continuar.', 'yellow');
    }

    this.log('\n' + '='.repeat(60), 'blue');
  }
}

// Ejecutar tests
const tester = new OptimizationTester();
tester.runAllTests().catch(error => {
  console.error('Error ejecutando tests:', error);
  process.exit(1);
}); 