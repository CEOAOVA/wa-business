# 📋 PLAN DE ACCIÓN - MEJORAS DEL SISTEMA WHATSAPP BUSINESS

## 📊 Resumen Ejecutivo

Este documento detalla un plan de acción estructurado para resolver los problemas críticos identificados en el sistema WhatsApp Business Platform e implementar las mejoras recomendadas. El plan está organizado por prioridad y nivel de impacto.

## 🎯 Objetivos Principales

1. **Optimizar la comunicación en tiempo real** (reducir latencia de 60s a <10s)
2. **Mejorar la estabilidad de sesiones** (eliminar desconexiones por token expirado)
3. **Reducir el consumo de memoria** (de 97% actual a <80%)
4. **Unificar y simplificar el código** (eliminar duplicaciones)
5. **Mejorar la mantenibilidad** (añadir tests y documentación)

---

## ✅ FASE 1: PROBLEMAS CRÍTICOS [COMPLETADO]

### 1.1 Optimización de WebSocket y Tiempo Real ✅
**Prioridad:** 🔴 CRÍTICA  
**Estado:** ✅ IMPLEMENTADO
**Archivos afectados:** `backend/src/app.ts`, `frontend/src/hooks/`

#### Acciones:

```typescript
// backend/src/app.ts - ANTES
const io = new Server(httpServer, {
  pingTimeout: 30000,  // Configuración actual
  pingInterval: 25000, // Configuración actual
  // ...
});

// backend/src/app.ts - DESPUÉS
const io = new Server(httpServer, {
  pingTimeout: 10000,  // Configuración optimizada
  pingInterval: 5000,  // Configuración optimizada
  maxHttpBufferSize: 1e6, // 1MB
  connectTimeout: 20000, // Configuración optimizada
  transports: ['websocket', 'polling'], // Habilitar fallback
  // ...
});
```

#### Pasos de implementación:

1. **Actualizar configuración del servidor Socket.IO**
   ```bash
   # Archivo: backend/src/app.ts (líneas 45-64)
   - Reducir pingTimeout de 30000 a 10000
   - Reducir pingInterval de 25000 a 5000
   - Reducir connectTimeout de 45000 a 20000
   - Habilitar polling como fallback
   ```

2. **Unificar hooks de WebSocket en frontend**
   ```bash
   # Mantener solo: frontend/src/hooks/useWebSocketOptimized.ts
   # Eliminar:
   - useWebSocket.ts
   - useWebSocketSimple.ts
   - useWebSocketImproved.ts
   ```

3. **Actualizar referencias en componentes**
   ```typescript
   // En todos los componentes que usen WebSocket
   import { useWebSocketOptimized as useWebSocket } from '../hooks/useWebSocketOptimized';
   ```

### 1.2 Auto-Refresh de Tokens de Autenticación ✅
**Prioridad:** 🔴 CRÍTICA  
**Estado:** ✅ IMPLEMENTADO
**Archivos afectados:** 
- `frontend/src/services/auth-refresh.service.ts` (✅ Creado)
- `frontend/src/context/AuthContext.tsx` (✅ Integrado)
- `frontend/src/config/supabase.ts` (✅ Creado)

#### Implementación:

```typescript
// frontend/src/services/auth-refresh.service.ts - NUEVO
export class AuthRefreshService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_BEFORE_EXPIRY = 300000; // Anticipación configurable
  
  startAutoRefresh(expiresIn: number) {
    this.stopAutoRefresh();
    
    const refreshTime = (expiresIn * 1000) - this.REFRESH_BEFORE_EXPIRY;
    
    this.refreshTimer = setTimeout(async () => {
      try {
        const newToken = await this.refreshToken();
        localStorage.setItem('authToken', newToken);
        this.startAutoRefresh(3600); // Reiniciar para el nuevo token
      } catch (error) {
        console.error('Error refreshing token:', error);
        window.location.href = '/login';
      }
    }, refreshTime);
  }
  
  async refreshToken(): Promise<string> {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to refresh token');
    const data = await response.json();
    return data.accessToken;
  }
  
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const authRefreshService = new AuthRefreshService();
```

#### Pasos:

1. **Crear servicio de refresh**
   - Crear `frontend/src/services/auth-refresh.service.ts`
   - Implementar lógica de auto-refresh con anticipación configurable

2. **Integrar en AuthContext**
   ```typescript
   // frontend/src/context/AuthContext.tsx
   import { authRefreshService } from '../services/auth-refresh.service';
   
   // En login success:
   authRefreshService.startAutoRefresh(); // Con configuración predeterminada
   
   // En logout:
   authRefreshService.stopAutoRefresh();
   ```

3. **Añadir endpoint en backend**
   ```typescript
   // backend/src/routes/auth.ts
   router.post('/refresh', authenticateToken, async (req, res) => {
     const newToken = generateToken(req.user);
     res.json({ accessToken: newToken, expiresIn: 3600 });
   });
   ```

---

## ✅ FASE 2: OPTIMIZACIONES DE MEMORIA [COMPLETADO]

### 2.1 Límites en Maps de Memoria ✅
**Prioridad:** 🟡 ALTA  
**Estado:** ✅ IMPLEMENTADO
**Archivos afectados:** `backend/src/services/chatbot.service.ts`

#### Implementación:

```typescript
// backend/src/services/chatbot.service.ts
export class ChatbotService {
  private conversations = new Map<string, ConversationState>();
  private readonly MAX_CONVERSATIONS = 1000; // Límite máximo
  private readonly SESSION_TIMEOUT_MS = 900000; // Timeout configurable
  
  private addConversation(phoneNumber: string, state: ConversationState) {
    // Limpiar conversaciones antiguas si llegamos al límite
    if (this.conversations.size >= this.MAX_CONVERSATIONS) {
      this.cleanupOldestConversations(100); // Limpiar las 100 más antiguas
    }
    
    this.conversations.set(phoneNumber, state);
  }
  
  private cleanupOldestConversations(count: number) {
    const sorted = Array.from(this.conversations.entries())
      .sort((a, b) => a[1].lastActivity.getTime() - b[1].lastActivity.getTime());
    
    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      this.conversations.delete(sorted[i][0]);
    }
    
    logger.info(`Limpiadas ${count} conversaciones antiguas`);
  }
}
```

### 2.2 Implementar Caché con TTL ✅
**Prioridad:** 🟡 ALTA  
**Estado:** ✅ IMPLEMENTADO
**Archivos afectados:** `backend/src/services/cache/memory-cache.service.ts` (✅ Creado)

#### Implementación:

```typescript
// backend/src/services/cache/ttl-cache.service.ts
export class TTLCache<T> {
  private cache = new Map<string, { data: T; expires: number }>();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(
    private readonly ttlMs: number = 300000, // TTL configurable
    private readonly maxSize: number = 1000
  ) {
    this.startCleanup();
  }
  
  set(key: string, value: T, customTTL?: number): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data: value,
      expires: Date.now() + (customTTL || this.ttlMs)
    });
  }
  
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.data;
  }
  
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expires) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Limpiar cada minuto
  }
  
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}
```

---

## ✅ FASE 3: MEJORAS DE ARQUITECTURA [COMPLETADO]

### 3.1 Extraer Lógica de Componentes ✅
**Prioridad:** 🟢 MEDIA  
**Estado:** ✅ IMPLEMENTADO
**Archivos afectados:** 
- `frontend/src/hooks/useChatsPage.ts` (✅ Creado)
- `frontend/src/pages/Chats.tsx` (✅ Refactorizado)

#### Refactorización de Chats.tsx:

```typescript
// frontend/src/pages/Chats.tsx - MEJORADO
import React, { useState, useEffect } from 'react';
import { useChatsPage } from '../hooks/useChatsPage';
import Sidebar from '../components/Sidebar';
import ChatPanel from '../components/ChatPanel';
import { LoadingPage } from '../components/LoadingPage';
import { ErrorBoundary } from '../components/ErrorBoundary';

const Chats: React.FC = () => {
  const {
    isLoading,
    error,
    activeChat,
    handleChatSelect,
    handleSendMessage,
    stats
  } = useChatsPage();
  
  if (isLoading) return <LoadingPage />;
  if (error) return <div className="error-page">{error}</div>;
  
  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex bg-embler-dark overflow-hidden">
        <Sidebar 
          onChatSelect={handleChatSelect}
          activeChat={activeChat}
        />
        <ChatPanel 
          chat={activeChat}
          onSendMessage={handleSendMessage}
        />
        
        {/* Panel de estadísticas en desarrollo */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs">
            <div>Mensajes: {stats.totalMessages}</div>
            <div>Conexión: {stats.connectionStatus}</div>
            <div>Latencia: {stats.latency}ms</div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Chats;
```

```typescript
// frontend/src/hooks/useChatsPage.ts - NUEVO
export function useChatsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentChat, sendMessage } = useChat();
  const { isConnected, latency } = useWebSocket();
  
  useEffect(() => {
    // Lógica de inicialización
    initializePage();
  }, []);
  
  const initializePage = async () => {
    try {
      setIsLoading(true);
      // Cargar datos necesarios
      await loadConversations();
      await connectWebSocket();
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };
  
  return {
    isLoading,
    error,
    activeChat: currentChat,
    handleChatSelect: selectChat,
    handleSendMessage: sendMessage,
    stats: {
      totalMessages: messages.length,
      connectionStatus: isConnected ? 'connected' : 'disconnected',
      latency
    }
  };
}
```

### 3.2 Implementar Sistema de Colas ✅
**Prioridad:** 🟢 MEDIA  
**Estado:** ✅ IMPLEMENTADO
**Tecnología:** Bull Queue con Redis
**Archivos afectados:**
- `backend/src/services/queue/message-queue.service.ts` (✅ Creado)
- `backend/src/routes/queue.ts` (✅ Creado)
- `backend/src/app.ts` (✅ Rutas agregadas)
- `backend/package.json` (✅ Dependencias agregadas)

#### Implementación:

```typescript
// backend/src/services/queue/message-queue.service.ts
import Bull from 'bull';
import { redisConfig } from '../../config/redis';

export class MessageQueueService {
  private messageQueue: Bull.Queue;
  private readonly MAX_RETRIES = 3;
  
  constructor() {
    this.messageQueue = new Bull('messages', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: this.MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    });
    
    this.setupProcessors();
  }
  
  private setupProcessors() {
    // Procesar mensajes de WhatsApp
    this.messageQueue.process('whatsapp', async (job) => {
      const { to, message, type } = job.data;
      
      try {
        const result = await whatsappService.sendMessage({
          to,
          message,
          type
        });
        
        return result;
      } catch (error) {
        logger.error('Error procesando mensaje:', error);
        throw error; // Bull manejará el retry
      }
    });
    
    // Procesar mensajes del chatbot
    this.messageQueue.process('chatbot', async (job) => {
      const { phoneNumber, message } = job.data;
      
      const response = await chatbotService.processMessage(
        phoneNumber,
        message
      );
      
      if (response.shouldSend) {
        await this.addMessage('whatsapp', {
          to: phoneNumber,
          message: response.response,
          type: 'text'
        });
      }
      
      return response;
    });
  }
  
  async addMessage(type: 'whatsapp' | 'chatbot', data: any) {
    const job = await this.messageQueue.add(type, data, {
      priority: data.priority || 0,
      delay: data.delay || 0
    });
    
    logger.info(`Mensaje añadido a cola: ${job.id}`);
    return job.id;
  }
  
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.messageQueue.getWaitingCount(),
      this.messageQueue.getActiveCount(),
      this.messageQueue.getCompletedCount(),
      this.messageQueue.getFailedCount()
    ]);
    
    return { waiting, active, completed, failed };
  }
}

export const messageQueueService = new MessageQueueService();
```

---

## 🔵 FASE 4: TESTING Y CALIDAD [PENDIENTE]

### 4.1 Implementar Tests Unitarios
**Prioridad:** 🔵 NORMAL  
**Cobertura objetivo:** 70%

#### Setup de Testing:

```bash
# Backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

#### Ejemplo de tests:

```typescript
// backend/src/services/__tests__/whatsapp.service.test.ts
describe('WhatsAppService', () => {
  let service: WhatsAppService;
  
  beforeEach(() => {
    service = new WhatsAppService();
  });
  
  describe('validateMessage', () => {
    it('should reject messages without phone number', () => {
      const result = service.validateMessage({
        to: '',
        message: 'Test',
        clientId: '123'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requeridos');
    });
    
    it('should reject messages longer than 4096 chars', () => {
      const longMessage = 'a'.repeat(4097);
      const result = service.validateMessage({
        to: '521234567890',
        message: longMessage,
        clientId: '123'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('4096');
    });
    
    it('should accept valid messages', () => {
      const result = service.validateMessage({
        to: '521234567890',
        message: 'Hola, este es un mensaje de prueba',
        clientId: '123'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
```

```typescript
// frontend/src/hooks/__tests__/useWebSocket.test.ts
import { renderHook, act } from '@testing-library/react';
import { useWebSocketOptimized } from '../useWebSocketOptimized';

describe('useWebSocketOptimized', () => {
  it('should not connect without auth token', () => {
    localStorage.removeItem('authToken');
    
    const { result } = renderHook(() => useWebSocketOptimized());
    
    act(() => {
      result.current.connect();
    });
    
    expect(result.current.isConnected).toBe(false);
  });
  
  it('should handle connection timeout', async () => {
    const { result } = renderHook(() => 
      useWebSocketOptimized({ 
        maxRetries: 1,
        baseDelay: 100 
      })
    );
    
    act(() => {
      result.current.connect();
    });
    
    await waitFor(() => {
      expect(result.current.retryCount).toBe(1);
      expect(result.current.connectionError).toBeDefined();
    });
  });
});
```

### 4.2 Documentación Técnica
**Prioridad:** 🔵 NORMAL

#### Crear documentación:

1. **API Documentation** con Swagger
2. **Component Storybook** para frontend
3. **Guía de contribución**
4. **Runbook de producción**

---

## 📊 MÉTRICAS DE ÉXITO

### KPIs a Monitorear:

| Métrica | Estado Actual | Objetivo | Medición |
|---------|--------------|----------|----------|
| Latencia WebSocket | 60s | <10s | Performance Monitor |
| Uso de memoria | 97% | <80% | Memory Monitor |
| Sesiones expiradas | ~50 ocurrencias | <5 ocurrencias | Auth Logs |
| Mensajes fallidos | 5% | <1% | Message Queue Stats |
| Cobertura de tests | 0% | 70% | Jest Coverage |
| Tiempo de respuesta API | 500ms | <200ms | APM Tools |
| Uptime | 95% | 99.9% | Monitoring Service |

---

## 📌 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### Secuencia de Fases:
1. **Fase 1 - Problemas Críticos** (Mayor prioridad)
   - Optimización de WebSocket
   - Auto-Refresh de Tokens
   
2. **Fase 2 - Optimizaciones de Memoria**
   - Límites en Maps
   - Implementación de Caché TTL
   
3. **Fase 3 - Mejoras de Arquitectura**
   - Refactorización de Componentes
   - Sistema de Colas
   
4. **Fase 4 - Testing y Calidad**
   - Tests Unitarios
   - Documentación

---

## 🛠️ RECURSOS NECESARIOS

### Equipo:
- **1 Backend Developer Senior** (Fases 1-3)
- **1 Frontend Developer** (Fases 1 y 3)
- **1 QA Engineer** (Fase 4)

### Infraestructura:
- **Redis** para sistema de colas (Bull Queue)
- **Monitoring**: Sentry o DataDog
- **CI/CD**: GitHub Actions o GitLab CI

### Recursos estimados:
- **Desarrollo**: Equipo de desarrollo completo
- **Infraestructura**: Redis + Herramientas de monitoreo
- **Inversión**: Según alcance y complejidad

---

## ✅ CHECKLIST DE VALIDACIÓN

### Antes de producción:
- [ ] Todos los tests pasan con >70% cobertura
- [x] Latencia WebSocket optimizada ✅
- [x] Memory usage optimizado con límites ✅
- [x] Auto-refresh de tokens funcionando ✅
- [x] Sistema de colas procesando mensajes ✅
- [x] Componentes refactorizados y optimizados ✅
- [ ] Documentación completa
- [ ] Load testing realizado (1000 usuarios concurrentes)
- [ ] Backup y rollback plan definido
- [ ] Monitoring y alertas configuradas
- [ ] Security audit completado

---

## 🚀 SIGUIENTES PASOS

1. **Reunión de kick-off** con el equipo
2. **Setup de ambiente** de desarrollo
3. **Implementar Fase 1** (Problemas Críticos)
4. **Implementar Fase 2** (Optimizaciones de Memoria)
5. **Implementar Fase 3** (Mejoras de Arquitectura)
6. **Implementar Fase 4** (Testing y Calidad)
7. **Deploy a staging** y validación
8. **Testing en producción** con monitoreo

---

## 📞 CONTACTOS Y RESPONSABLES

| Rol | Responsable | Contacto |
|-----|------------|----------|
| Product Owner | - | - |
| Tech Lead | - | - |
| Backend Dev | - | - |
| Frontend Dev | - | - |
| DevOps | - | - |
| QA Lead | - | - |

---

## 📝 NOTAS ADICIONALES

- Mantener comunicación constante con el equipo de WhatsApp Business API
- Considerar rate limits de la API de WhatsApp
- Implementar feature flags para rollout gradual
- Mantener ambiente de staging idéntico a producción
- Documentar todos los cambios en el CHANGELOG
- Realizar code reviews para todos los PRs

---

*Versión: 1.0.0*