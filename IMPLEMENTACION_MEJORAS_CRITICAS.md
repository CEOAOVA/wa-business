# 🚀 IMPLEMENTACIÓN DE MEJORAS CRÍTICAS

## 1️⃣ REFRESH TOKEN AUTOMÁTICO

### **Archivo:** `frontend/src/services/auth-refresh.service.ts`

```typescript
import { supabase } from '../config/supabase';

class AuthRefreshService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<void> | null = null;

  /**
   * Inicia el servicio de refresh automático
   */
  start() {
    this.scheduleNextRefresh();
    
    // Verificar token al inicio
    this.checkAndRefreshIfNeeded();
    
    // Listener para cuando la app vuelve a estar activa
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndRefreshIfNeeded();
      }
    });
  }

  /**
   * Programa el próximo refresh basado en la expiración del token
   */
  private scheduleNextRefresh() {
    // Limpiar timer anterior
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      // Decodificar JWT para obtener expiración
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000; // Convertir a milliseconds
      const now = Date.now();
      
      // Refrescar 5 minutos antes de que expire
      const refreshIn = Math.max(0, expiresAt - now - (5 * 60 * 1000));
      
      console.log(`📅 Token expira en ${Math.round((expiresAt - now) / 60000)} minutos`);
      console.log(`🔄 Refresh programado en ${Math.round(refreshIn / 60000)} minutos`);
      
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, refreshIn);
      
    } catch (error) {
      console.error('❌ Error programando refresh:', error);
    }
  }

  /**
   * Verifica si el token necesita refresh y lo hace si es necesario
   */
  async checkAndRefreshIfNeeded() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      
      // Si expira en menos de 10 minutos, refrescar ahora
      if (expiresAt - now < 10 * 60 * 1000) {
        console.log('⚠️ Token próximo a expirar, refrescando...');
        await this.refreshToken();
      }
    } catch (error) {
      console.error('❌ Error verificando token:', error);
    }
  }

  /**
   * Refresca el token de autenticación
   */
  async refreshToken(): Promise<void> {
    // Evitar múltiples refresh simultáneos
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();
    
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Realiza el refresh del token
   */
  private async doRefresh(): Promise<void> {
    try {
      console.log('🔄 Refrescando token...');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      if (data?.session?.access_token) {
        // Actualizar token en localStorage
        localStorage.setItem('authToken', data.session.access_token);
        
        // Emitir evento para que otros componentes se actualicen
        window.dispatchEvent(new CustomEvent('authTokenRefreshed', {
          detail: { token: data.session.access_token }
        }));
        
        console.log('✅ Token refrescado exitosamente');
        
        // Programar siguiente refresh
        this.scheduleNextRefresh();
        
        // Reconectar WebSocket si es necesario
        this.reconnectWebSocket();
      }
    } catch (error) {
      console.error('❌ Error refrescando token:', error);
      
      // Si falla el refresh, limpiar y redirigir a login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
  }

  /**
   * Reconecta el WebSocket con el nuevo token
   */
  private reconnectWebSocket() {
    // Emitir evento para reconectar WebSocket
    window.dispatchEvent(new CustomEvent('reconnectWebSocket'));
  }

  /**
   * Detiene el servicio de refresh
   */
  stop() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const authRefreshService = new AuthRefreshService();
```

---

## 2️⃣ SISTEMA DE LOCKS PARA CONCURRENCIA

### **Archivo:** `backend/src/services/conversation-lock.service.ts`

```typescript
import { supabase } from '../config/supabase';

interface ConversationLock {
  conversation_id: string;
  agent_id: string;
  agent_email: string;
  locked_at: string;
  expires_at: string;
}

export class ConversationLockService {
  private readonly LOCK_TTL_MINUTES = 5;
  private lockCleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpiar locks expirados cada minuto
    this.lockCleanupInterval = setInterval(() => {
      this.cleanExpiredLocks();
    }, 60000);
  }

  /**
   * Intenta adquirir un lock para una conversación
   */
  async acquireLock(
    conversationId: string, 
    agentId: string,
    agentEmail: string
  ): Promise<{ success: boolean; lockedBy?: string; expiresAt?: Date }> {
    try {
      // Primero verificar si ya existe un lock activo
      const existingLock = await this.getLock(conversationId);
      
      if (existingLock && new Date(existingLock.expires_at) > new Date()) {
        // Lock activo por otro agente
        if (existingLock.agent_id !== agentId) {
          return {
            success: false,
            lockedBy: existingLock.agent_email,
            expiresAt: new Date(existingLock.expires_at)
          };
        }
        
        // Es el mismo agente, renovar el lock
        return await this.renewLock(conversationId, agentId);
      }

      // No hay lock activo o está expirado, crear uno nuevo
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.LOCK_TTL_MINUTES);

      const { data, error } = await supabase
        .from('conversation_locks')
        .upsert({
          conversation_id: conversationId,
          agent_id: agentId,
          agent_email: agentEmail,
          locked_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'conversation_id'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error adquiriendo lock:', error);
        return { success: false };
      }

      console.log(`🔒 Lock adquirido: ${conversationId} por ${agentEmail}`);
      
      // Emitir evento de lock adquirido
      this.emitLockEvent('acquired', conversationId, agentId, agentEmail);

      return {
        success: true,
        expiresAt
      };

    } catch (error) {
      console.error('❌ Error en acquireLock:', error);
      return { success: false };
    }
  }

  /**
   * Libera el lock de una conversación
   */
  async releaseLock(conversationId: string, agentId: string): Promise<boolean> {
    try {
      // Verificar que el agente tiene el lock
      const lock = await this.getLock(conversationId);
      
      if (!lock || lock.agent_id !== agentId) {
        console.warn(`⚠️ Agente ${agentId} intentó liberar lock que no posee`);
        return false;
      }

      const { error } = await supabase
        .from('conversation_locks')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('agent_id', agentId);

      if (error) {
        console.error('❌ Error liberando lock:', error);
        return false;
      }

      console.log(`🔓 Lock liberado: ${conversationId}`);
      
      // Emitir evento de lock liberado
      this.emitLockEvent('released', conversationId, agentId);

      return true;

    } catch (error) {
      console.error('❌ Error en releaseLock:', error);
      return false;
    }
  }

  /**
   * Renueva el lock de una conversación
   */
  async renewLock(
    conversationId: string, 
    agentId: string
  ): Promise<{ success: boolean; expiresAt?: Date }> {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.LOCK_TTL_MINUTES);

      const { data, error } = await supabase
        .from('conversation_locks')
        .update({
          expires_at: expiresAt.toISOString()
        })
        .eq('conversation_id', conversationId)
        .eq('agent_id', agentId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error renovando lock:', error);
        return { success: false };
      }

      console.log(`🔄 Lock renovado: ${conversationId} hasta ${expiresAt.toISOString()}`);

      return {
        success: true,
        expiresAt
      };

    } catch (error) {
      console.error('❌ Error en renewLock:', error);
      return { success: false };
    }
  }

  /**
   * Obtiene información del lock actual
   */
  async getLock(conversationId: string): Promise<ConversationLock | null> {
    try {
      const { data, error } = await supabase
        .from('conversation_locks')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('❌ Error obteniendo lock:', error);
      }

      return data;

    } catch (error) {
      console.error('❌ Error en getLock:', error);
      return null;
    }
  }

  /**
   * Limpia locks expirados
   */
  async cleanExpiredLocks(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('conversation_locks')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) {
        console.error('❌ Error limpiando locks expirados:', error);
        return 0;
      }

      if (data && data.length > 0) {
        console.log(`🧹 Limpiados ${data.length} locks expirados`);
        
        // Emitir eventos para cada lock expirado
        data.forEach(lock => {
          this.emitLockEvent('expired', lock.conversation_id, lock.agent_id);
        });
      }

      return data?.length || 0;

    } catch (error) {
      console.error('❌ Error en cleanExpiredLocks:', error);
      return 0;
    }
  }

  /**
   * Emite evento de cambio de lock
   */
  private emitLockEvent(
    type: 'acquired' | 'released' | 'expired',
    conversationId: string,
    agentId: string,
    agentEmail?: string
  ) {
    // Emitir a través de Socket.IO si está disponible
    const io = (global as any).io;
    if (io) {
      io.emit('conversation_lock_changed', {
        type,
        conversationId,
        agentId,
        agentEmail,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Destructor - limpiar interval
   */
  destroy() {
    if (this.lockCleanupInterval) {
      clearInterval(this.lockCleanupInterval);
    }
  }
}

export const conversationLockService = new ConversationLockService();
```

---

## 3️⃣ MIGRATION SQL PARA LOCKS

### **Archivo:** `backend/migrations/create_conversation_locks.sql`

```sql
-- Crear tabla de locks para conversaciones
CREATE TABLE IF NOT EXISTS conversation_locks (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_email VARCHAR(255) NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Índices para búsquedas rápidas
  INDEX idx_conversation_locks_expires_at (expires_at),
  INDEX idx_conversation_locks_agent_id (agent_id)
);

-- Función para limpiar locks expirados automáticamente
CREATE OR REPLACE FUNCTION clean_expired_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM conversation_locks
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Crear un job que ejecute la limpieza cada 5 minutos
SELECT cron.schedule(
  'clean-expired-locks',
  '*/5 * * * *',
  'SELECT clean_expired_locks();'
);

-- Función RPC para adquirir lock atómicamente
CREATE OR REPLACE FUNCTION acquire_conversation_lock(
  p_conversation_id UUID,
  p_agent_id UUID,
  p_agent_email VARCHAR(255),
  p_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
  success BOOLEAN,
  locked_by VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_existing_lock RECORD;
BEGIN
  -- Intentar obtener lock existente
  SELECT * INTO v_existing_lock
  FROM conversation_locks
  WHERE conversation_id = p_conversation_id
  FOR UPDATE SKIP LOCKED;
  
  -- Si existe y no ha expirado
  IF v_existing_lock.conversation_id IS NOT NULL 
     AND v_existing_lock.expires_at > NOW() THEN
    -- Si es el mismo agente, renovar
    IF v_existing_lock.agent_id = p_agent_id THEN
      UPDATE conversation_locks
      SET expires_at = p_expires_at
      WHERE conversation_id = p_conversation_id;
      
      RETURN QUERY SELECT true, NULL::VARCHAR(255), p_expires_at;
    ELSE
      -- Lock tomado por otro agente
      RETURN QUERY SELECT false, v_existing_lock.agent_email, v_existing_lock.expires_at;
    END IF;
  ELSE
    -- No hay lock o expiró, crear nuevo
    INSERT INTO conversation_locks (
      conversation_id, 
      agent_id, 
      agent_email, 
      expires_at
    ) VALUES (
      p_conversation_id, 
      p_agent_id, 
      p_agent_email, 
      p_expires_at
    )
    ON CONFLICT (conversation_id) DO UPDATE
    SET agent_id = p_agent_id,
        agent_email = p_agent_email,
        locked_at = NOW(),
        expires_at = p_expires_at;
    
    RETURN QUERY SELECT true, NULL::VARCHAR(255), p_expires_at;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Políticas RLS para conversation_locks
ALTER TABLE conversation_locks ENABLE ROW LEVEL SECURITY;

-- Los agentes solo pueden ver y modificar sus propios locks
CREATE POLICY "Agents can view all locks"
  ON conversation_locks FOR SELECT
  USING (true);

CREATE POLICY "Agents can only manage their own locks"
  ON conversation_locks FOR ALL
  USING (agent_id = auth.uid());
```

---

## 4️⃣ INTEGRACIÓN EN EL FRONTEND

### **Archivo:** `frontend/src/hooks/useConversationLock.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { dashboardApiService } from '../services/dashboard-api';

interface LockStatus {
  isLocked: boolean;
  lockedBy?: string;
  expiresAt?: Date;
  canEdit: boolean;
}

export function useConversationLock(conversationId: string | null) {
  const [lockStatus, setLockStatus] = useState<LockStatus>({
    isLocked: false,
    canEdit: false
  });
  const [isAcquiring, setIsAcquiring] = useState(false);
  
  // Auto-renovar lock cada 2 minutos si lo tenemos
  useEffect(() => {
    if (!conversationId || !lockStatus.canEdit) return;
    
    const interval = setInterval(async () => {
      try {
        await dashboardApiService.renewConversationLock(conversationId);
        console.log('🔄 Lock renovado automáticamente');
      } catch (error) {
        console.error('❌ Error renovando lock:', error);
      }
    }, 2 * 60 * 1000); // Cada 2 minutos
    
    return () => clearInterval(interval);
  }, [conversationId, lockStatus.canEdit]);
  
  // Verificar estado del lock
  const checkLockStatus = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      const status = await dashboardApiService.getConversationLockStatus(conversationId);
      setLockStatus(status);
    } catch (error) {
      console.error('❌ Error verificando lock:', error);
    }
  }, [conversationId]);
  
  // Adquirir lock
  const acquireLock = useCallback(async () => {
    if (!conversationId || isAcquiring) return false;
    
    setIsAcquiring(true);
    
    try {
      const result = await dashboardApiService.acquireConversationLock(conversationId);
      
      if (result.success) {
        setLockStatus({
          isLocked: true,
          canEdit: true,
          expiresAt: result.expiresAt
        });
        
        // Notificar éxito
        window.dispatchEvent(new CustomEvent('notification', {
          detail: {
            type: 'success',
            message: 'Conversación bloqueada para edición'
          }
        }));
        
        return true;
      } else {
        setLockStatus({
          isLocked: true,
          lockedBy: result.lockedBy,
          expiresAt: result.expiresAt,
          canEdit: false
        });
        
        // Notificar que está bloqueada
        window.dispatchEvent(new CustomEvent('notification', {
          detail: {
            type: 'warning',
            message: `Conversación en uso por ${result.lockedBy}`
          }
        }));
        
        return false;
      }
    } catch (error) {
      console.error('❌ Error adquiriendo lock:', error);
      return false;
    } finally {
      setIsAcquiring(false);
    }
  }, [conversationId, isAcquiring]);
  
  // Liberar lock
  const releaseLock = useCallback(async () => {
    if (!conversationId || !lockStatus.canEdit) return;
    
    try {
      await dashboardApiService.releaseConversationLock(conversationId);
      
      setLockStatus({
        isLocked: false,
        canEdit: false
      });
      
      console.log('🔓 Lock liberado');
    } catch (error) {
      console.error('❌ Error liberando lock:', error);
    }
  }, [conversationId, lockStatus.canEdit]);
  
  // Verificar lock al montar y escuchar cambios
  useEffect(() => {
    if (!conversationId) return;
    
    checkLockStatus();
    
    // Escuchar cambios de lock via WebSocket
    const handleLockChange = (event: CustomEvent) => {
      if (event.detail.conversationId === conversationId) {
        checkLockStatus();
      }
    };
    
    window.addEventListener('conversation_lock_changed', handleLockChange as any);
    
    return () => {
      window.removeEventListener('conversation_lock_changed', handleLockChange as any);
      
      // Liberar lock al desmontar si lo tenemos
      if (lockStatus.canEdit) {
        releaseLock();
      }
    };
  }, [conversationId]);
  
  return {
    lockStatus,
    acquireLock,
    releaseLock,
    isAcquiring
  };
}
```

---

## 5️⃣ USO EN COMPONENTES

### **Ejemplo de uso en ChatWindow.tsx:**

```typescript
import { useConversationLock } from '../hooks/useConversationLock';

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const { lockStatus, acquireLock, releaseLock } = useConversationLock(conversationId);
  
  // Intentar tomar control cuando el agente quiere responder
  const handleTakeControl = async () => {
    const acquired = await acquireLock();
    
    if (acquired) {
      // Cambiar a modo takeover
      await chatbotService.setTakeoverMode(conversationId, 'takeover');
    }
  };
  
  return (
    <div>
      {/* Indicador de estado del lock */}
      {lockStatus.isLocked && !lockStatus.canEdit && (
        <div className="bg-yellow-100 p-2 text-sm">
          🔒 {lockStatus.lockedBy} está atendiendo esta conversación
        </div>
      )}
      
      {/* Botón para tomar control */}
      {!lockStatus.canEdit && (
        <button 
          onClick={handleTakeControl}
          disabled={lockStatus.isLocked}
          className="btn btn-primary"
        >
          Tomar Control
        </button>
      )}
      
      {/* Input de mensaje - solo si tenemos el lock */}
      <MessageInput 
        disabled={!lockStatus.canEdit}
        placeholder={
          lockStatus.canEdit 
            ? "Escribe un mensaje..." 
            : "Toma control para responder"
        }
      />
    </div>
  );
}
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### **Backend:**
- [ ] Crear migration para tabla `conversation_locks`
- [ ] Implementar `ConversationLockService`
- [ ] Agregar endpoints en `/api/conversations/:id/lock`
- [ ] Integrar con Socket.IO para eventos en tiempo real
- [ ] Agregar logs y métricas

### **Frontend:**
- [ ] Implementar `AuthRefreshService`
- [ ] Crear hook `useConversationLock`
- [ ] Actualizar `ChatWindow` con indicadores de lock
- [ ] Agregar notificaciones visuales
- [ ] Testing de concurrencia

### **Testing:**
- [ ] Test de adquisición de lock simultánea
- [ ] Test de renovación automática
- [ ] Test de liberación al desconectar
- [ ] Test de limpieza de locks expirados
- [ ] Test de refresh token automático

---

## 🎯 RESULTADO ESPERADO

Con estas mejoras implementadas:

1. ✅ **No más conflictos de edición**: Solo un agente puede editar a la vez
2. ✅ **Sesiones persistentes**: Token se renueva automáticamente
3. ✅ **Feedback visual claro**: Usuarios ven quién está atendiendo
4. ✅ **Sin pérdida de trabajo**: Locks se renuevan automáticamente
5. ✅ **Limpieza automática**: Locks expirados se limpian solos