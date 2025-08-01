#!/usr/bin/env node

/**
 * Script para Ajustar Thresholds Automáticamente
 * Analiza datos reales del sistema y ajusta los thresholds de monitoreo
 */

const fs = require('fs');
const path = require('path');

class ThresholdAdjuster {
  constructor() {
    this.thresholds = {
      memory: {
        warning: 80,
        critical: 90
      },
      cpu: {
        warning: 70,
        critical: 85
      },
      response_time: {
        warning: 1000,
        critical: 3000
      },
      websocket_latency: {
        warning: 100,
        critical: 300
      }
    };
  }

  // Analizar datos históricos para calcular thresholds óptimos
  analyzeHistoricalData(data) {
    const analysis = {
      memory: this.analyzeMemoryData(data.memory || []),
      cpu: this.analyzeCpuData(data.cpu || []),
      response_time: this.analyzeResponseTimeData(data.response_time || []),
      websocket_latency: this.analyzeWebSocketData(data.websocket_latency || [])
    };

    return analysis;
  }

  analyzeMemoryData(memoryData) {
    if (memoryData.length === 0) return this.thresholds.memory;

    const values = memoryData.map(d => d.value);
    const sorted = values.sort((a, b) => a - b);
    
    // Calcular percentiles
    const p80 = sorted[Math.floor(sorted.length * 0.8)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    // Calcular promedio y desviación estándar
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      current: {
        warning: this.thresholds.memory.warning,
        critical: this.thresholds.memory.critical
      },
      suggested: {
        warning: Math.min(85, Math.max(70, p80)),
        critical: Math.min(95, Math.max(80, p95))
      },
      statistics: {
        average: avg,
        stdDev,
        p80,
        p90,
        p95,
        min: Math.min(...values),
        max: Math.max(...values)
      }
    };
  }

  analyzeCpuData(cpuData) {
    if (cpuData.length === 0) return this.thresholds.cpu;

    const values = cpuData.map(d => d.value);
    const sorted = values.sort((a, b) => a - b);
    
    const p80 = sorted[Math.floor(sorted.length * 0.8)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      current: {
        warning: this.thresholds.cpu.warning,
        critical: this.thresholds.cpu.critical
      },
      suggested: {
        warning: Math.min(80, Math.max(60, p80)),
        critical: Math.min(90, Math.max(75, p95))
      },
      statistics: {
        average: avg,
        stdDev,
        p80,
        p90,
        p95,
        min: Math.min(...values),
        max: Math.max(...values)
      }
    };
  }

  analyzeResponseTimeData(responseData) {
    if (responseData.length === 0) return this.thresholds.response_time;

    const values = responseData.map(d => d.value);
    const sorted = values.sort((a, b) => a - b);
    
    const p80 = sorted[Math.floor(sorted.length * 0.8)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      current: {
        warning: this.thresholds.response_time.warning,
        critical: this.thresholds.response_time.critical
      },
      suggested: {
        warning: Math.min(2000, Math.max(500, p80)),
        critical: Math.min(5000, Math.max(1000, p95))
      },
      statistics: {
        average: avg,
        p80,
        p90,
        p95,
        min: Math.min(...values),
        max: Math.max(...values)
      }
    };
  }

  analyzeWebSocketData(wsData) {
    if (wsData.length === 0) return this.thresholds.websocket_latency;

    const values = wsData.map(d => d.value);
    const sorted = values.sort((a, b) => a - b);
    
    const p80 = sorted[Math.floor(sorted.length * 0.8)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      current: {
        warning: this.thresholds.websocket_latency.warning,
        critical: this.thresholds.websocket_latency.critical
      },
      suggested: {
        warning: Math.min(200, Math.max(50, p80)),
        critical: Math.min(500, Math.max(100, p95))
      },
      statistics: {
        average: avg,
        p80,
        p90,
        p95,
        min: Math.min(...values),
        max: Math.max(...values)
      }
    };
  }

  // Generar recomendaciones de thresholds
  generateRecommendations(analysis) {
    const recommendations = {
      memory: this.generateMemoryRecommendations(analysis.memory),
      cpu: this.generateCpuRecommendations(analysis.cpu),
      response_time: this.generateResponseTimeRecommendations(analysis.response_time),
      websocket_latency: this.generateWebSocketRecommendations(analysis.websocket_latency)
    };

    return recommendations;
  }

  generateMemoryRecommendations(analysis) {
    const { current, suggested, statistics } = analysis;
    
    let recommendation = {
      action: 'maintain',
      reason: '',
      newThresholds: current
    };

    if (suggested.warning < current.warning) {
      recommendation.action = 'decrease';
      recommendation.reason = `El uso promedio de memoria (${statistics.average.toFixed(2)}%) está por debajo del threshold actual. Se recomienda reducir el threshold de warning a ${suggested.warning}%`;
      recommendation.newThresholds = suggested;
    } else if (suggested.warning > current.warning + 5) {
      recommendation.action = 'increase';
      recommendation.reason = `El uso de memoria frecuentemente excede el threshold actual. Se recomienda aumentar el threshold de warning a ${suggested.warning}%`;
      recommendation.newThresholds = suggested;
    } else {
      recommendation.reason = 'Los thresholds actuales están bien calibrados para el patrón de uso observado';
    }

    return recommendation;
  }

  generateCpuRecommendations(analysis) {
    const { current, suggested, statistics } = analysis;
    
    let recommendation = {
      action: 'maintain',
      reason: '',
      newThresholds: current
    };

    if (suggested.warning < current.warning) {
      recommendation.action = 'decrease';
      recommendation.reason = `El uso promedio de CPU (${statistics.average.toFixed(2)}%) está por debajo del threshold actual. Se recomienda reducir el threshold de warning a ${suggested.warning}%`;
      recommendation.newThresholds = suggested;
    } else if (suggested.warning > current.warning + 10) {
      recommendation.action = 'increase';
      recommendation.reason = `El uso de CPU frecuentemente excede el threshold actual. Se recomienda aumentar el threshold de warning a ${suggested.warning}%`;
      recommendation.newThresholds = suggested;
    } else {
      recommendation.reason = 'Los thresholds actuales están bien calibrados para el patrón de uso observado';
    }

    return recommendation;
  }

  generateResponseTimeRecommendations(analysis) {
    const { current, suggested, statistics } = analysis;
    
    let recommendation = {
      action: 'maintain',
      reason: '',
      newThresholds: current
    };

    if (suggested.warning < current.warning) {
      recommendation.action = 'decrease';
      recommendation.reason = `El tiempo de respuesta promedio (${statistics.average.toFixed(2)}ms) está por debajo del threshold actual. Se recomienda reducir el threshold de warning a ${suggested.warning}ms`;
      recommendation.newThresholds = suggested;
    } else if (suggested.warning > current.warning + 500) {
      recommendation.action = 'increase';
      recommendation.reason = `Los tiempos de respuesta frecuentemente exceden el threshold actual. Se recomienda aumentar el threshold de warning a ${suggested.warning}ms`;
      recommendation.newThresholds = suggested;
    } else {
      recommendation.reason = 'Los thresholds actuales están bien calibrados para el patrón de uso observado';
    }

    return recommendation;
  }

  generateWebSocketRecommendations(analysis) {
    const { current, suggested, statistics } = analysis;
    
    let recommendation = {
      action: 'maintain',
      reason: '',
      newThresholds: current
    };

    if (suggested.warning < current.warning) {
      recommendation.action = 'decrease';
      recommendation.reason = `La latencia promedio de WebSocket (${statistics.average.toFixed(2)}ms) está por debajo del threshold actual. Se recomienda reducir el threshold de warning a ${suggested.warning}ms`;
      recommendation.newThresholds = suggested;
    } else if (suggested.warning > current.warning + 50) {
      recommendation.action = 'increase';
      recommendation.reason = `La latencia de WebSocket frecuentemente excede el threshold actual. Se recomienda aumentar el threshold de warning a ${suggested.warning}ms`;
      recommendation.newThresholds = suggested;
    } else {
      recommendation.reason = 'Los thresholds actuales están bien calibrados para el patrón de uso observado';
    }

    return recommendation;
  }

  // Aplicar thresholds ajustados
  async applyThresholds(recommendations) {
    console.log('\n🔧 APLICANDO THRESHOLDS AJUSTADOS...\n');

    for (const [metric, recommendation] of Object.entries(recommendations)) {
      if (recommendation.action !== 'maintain') {
        console.log(`📊 ${metric.toUpperCase()}:`);
        console.log(`   Acción: ${recommendation.action === 'increase' ? '🔺 AUMENTAR' : '🔻 REDUCIR'}`);
        console.log(`   Razón: ${recommendation.reason}`);
        console.log(`   Nuevos thresholds: Warning=${recommendation.newThresholds.warning}, Critical=${recommendation.newThresholds.critical}`);
        console.log('');
      }
    }

    // Guardar configuración actualizada
    const configPath = path.join(__dirname, '../config/thresholds.json');
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const updatedConfig = {
      thresholds: {},
      lastUpdated: new Date().toISOString(),
      recommendations
    };

    for (const [metric, recommendation] of Object.entries(recommendations)) {
      updatedConfig.thresholds[metric] = recommendation.newThresholds;
    }

    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
    console.log(`✅ Configuración guardada en: ${configPath}`);
  }

  // Ejecutar análisis completo
  async runAnalysis() {
    console.log('🔍 Iniciando Análisis de Thresholds...\n');

    // Cargar datos históricos (simulado por ahora)
    const historicalData = this.loadHistoricalData();
    
    // Analizar datos
    console.log('📊 Analizando datos históricos...');
    const analysis = this.analyzeHistoricalData(historicalData);
    
    // Generar recomendaciones
    console.log('💡 Generando recomendaciones...');
    const recommendations = this.generateRecommendations(analysis);
    
    // Mostrar resultados
    this.displayAnalysis(analysis, recommendations);
    
    // Aplicar thresholds
    await this.applyThresholds(recommendations);
  }

  // Cargar datos históricos (simulado)
  loadHistoricalData() {
    // En un entorno real, esto cargaría datos de la base de datos o archivos
    return {
      memory: [
        { value: 75, timestamp: Date.now() - 3600000 },
        { value: 82, timestamp: Date.now() - 1800000 },
        { value: 78, timestamp: Date.now() - 900000 },
        { value: 85, timestamp: Date.now() - 450000 },
        { value: 79, timestamp: Date.now() }
      ],
      cpu: [
        { value: 65, timestamp: Date.now() - 3600000 },
        { value: 72, timestamp: Date.now() - 1800000 },
        { value: 68, timestamp: Date.now() - 900000 },
        { value: 75, timestamp: Date.now() - 450000 },
        { value: 70, timestamp: Date.now() }
      ],
      response_time: [
        { value: 800, timestamp: Date.now() - 3600000 },
        { value: 950, timestamp: Date.now() - 1800000 },
        { value: 850, timestamp: Date.now() - 900000 },
        { value: 1100, timestamp: Date.now() - 450000 },
        { value: 900, timestamp: Date.now() }
      ],
      websocket_latency: [
        { value: 80, timestamp: Date.now() - 3600000 },
        { value: 95, timestamp: Date.now() - 1800000 },
        { value: 85, timestamp: Date.now() - 900000 },
        { value: 110, timestamp: Date.now() - 450000 },
        { value: 90, timestamp: Date.now() }
      ]
    };
  }

  // Mostrar análisis
  displayAnalysis(analysis, recommendations) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ANÁLISIS DE THRESHOLDS');
    console.log('='.repeat(60));

    for (const [metric, data] of Object.entries(analysis)) {
      console.log(`\n📈 ${metric.toUpperCase()}:`);
      console.log(`   Estadísticas:`);
      console.log(`     Promedio: ${data.statistics.average.toFixed(2)}`);
      console.log(`     P80: ${data.statistics.p80.toFixed(2)}`);
      console.log(`     P95: ${data.statistics.p95.toFixed(2)}`);
      console.log(`     Min: ${data.statistics.min.toFixed(2)}`);
      console.log(`     Max: ${data.statistics.max.toFixed(2)}`);
      
      const rec = recommendations[metric];
      console.log(`   Recomendación: ${rec.action.toUpperCase()}`);
      console.log(`   Razón: ${rec.reason}`);
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Ejecutar análisis
const adjuster = new ThresholdAdjuster();
adjuster.runAnalysis().catch(error => {
  console.error('Error ejecutando análisis:', error);
  process.exit(1);
}); 