/**
 * Servicio de caché inteligente para mensajes y conversaciones
 * Usa localStorage para datos pequeños e IndexedDB para datos grandes
 */

export interface CacheItem<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // Time to live en milisegundos
  version: string;
}

export interface CacheStats {
  totalItems: number;
  totalSize: number;
  oldestItem: number;
  newestItem: number;
  expiredItems: number;
}

export interface MessageCache {
  id: string;
  chatId: string;
  content: string;
  timestamp: number;
  senderId: string;
  type: string;
  metadata?: any;
}

export interface ChatCache {
  id: string;
  clientName: string;
  clientPhone: string;
  lastMessage?: string;
  unreadCount: number;
  updatedAt: number;
  metadata?: any;
}

class CacheService {
  private readonly VERSION = '1.0.0';
  private readonly STORAGE_PREFIX = 'whatsapp_cache_';
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 horas

  constructor() {
    this.initializeCache();
  }

  /**
   * Inicializar caché y limpiar elementos expirados
   */
  private async initializeCache(): Promise<void> {
    try {
      await this.cleanupExpiredItems();
      console.log('✅ Caché inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando caché:', error);
    }
  }

  /**
   * Generar clave de caché
   */
  private generateKey(prefix: string, id: string): string {
    return `${this.STORAGE_PREFIX}${prefix}_${id}`;
  }

  /**
   * Verificar si un elemento está expirado
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.timestamp + item.ttl;
  }

  /**
   * Obtener tamaño aproximado de un objeto en bytes
   */
  private getObjectSize(obj: any): number {
    return new Blob([JSON.stringify(obj)]).size;
  }

  /**
   * Guardar elemento en localStorage
   */
  private setLocalStorageItem<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    try {
      const item: CacheItem<T> = {
        key,
        data,
        timestamp: Date.now(),
        ttl,
        version: this.VERSION,
      };

      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('❌ Error guardando en localStorage:', error);
      // Si localStorage está lleno, limpiar elementos antiguos
      this.cleanupStorage();
    }
  }

  /**
   * Obtener elemento de localStorage
   */
  private getLocalStorageItem<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);
      
      // Verificar versión
      if (item.version !== this.VERSION) {
        localStorage.removeItem(key);
        return null;
      }

      // Verificar si está expirado
      if (this.isExpired(item)) {
        localStorage.removeItem(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error('❌ Error leyendo de localStorage:', error);
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Limpiar almacenamiento cuando está lleno
   */
  private cleanupStorage(): void {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      
      // Ordenar por timestamp (más antiguos primero)
      const items = cacheKeys.map(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, timestamp: item.timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      }).sort((a, b) => a.timestamp - b.timestamp);

      // Eliminar elementos más antiguos hasta liberar espacio
      const itemsToRemove = Math.ceil(items.length * 0.3); // Eliminar 30%
      items.slice(0, itemsToRemove).forEach(item => {
        localStorage.removeItem(item.key);
      });

      console.log(`🗑️ Limpiados ${itemsToRemove} elementos del caché`);
    } catch (error) {
      console.error('❌ Error limpiando almacenamiento:', error);
    }
  }

  /**
   * Limpiar elementos expirados
   */
  private async cleanupExpiredItems(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      
      let removedCount = 0;
      cacheKeys.forEach(key => {
        try {
          const itemStr = localStorage.getItem(key);
          if (itemStr) {
            const item: CacheItem = JSON.parse(itemStr);
            if (this.isExpired(item)) {
              localStorage.removeItem(key);
              removedCount++;
            }
          }
        } catch {
          localStorage.removeItem(key);
          removedCount++;
        }
      });

      if (removedCount > 0) {
        console.log(`🗑️ Limpiados ${removedCount} elementos expirados del caché`);
      }
    } catch (error) {
      console.error('❌ Error limpiando elementos expirados:', error);
    }
  }

  // === API PÚBLICA ===

  /**
   * Guardar mensaje en caché
   */
  async cacheMessage(message: MessageCache, ttl?: number): Promise<void> {
    const key = this.generateKey('message', message.id);
    this.setLocalStorageItem(key, message, ttl);
  }

  /**
   * Obtener mensaje del caché
   */
  async getCachedMessage(messageId: string): Promise<MessageCache | null> {
    const key = this.generateKey('message', messageId);
    return this.getLocalStorageItem<MessageCache>(key);
  }

  /**
   * Guardar chat en caché
   */
  async cacheChat(chat: ChatCache, ttl?: number): Promise<void> {
    const key = this.generateKey('chat', chat.id);
    this.setLocalStorageItem(key, chat, ttl);
  }

  /**
   * Obtener chat del caché
   */
  async getCachedChat(chatId: string): Promise<ChatCache | null> {
    const key = this.generateKey('chat', chatId);
    return this.getLocalStorageItem<ChatCache>(key);
  }

  /**
   * Guardar múltiples mensajes
   */
  async cacheMessages(messages: MessageCache[], ttl?: number): Promise<void> {
    messages.forEach(message => {
      this.cacheMessage(message, ttl);
    });
  }

  /**
   * Obtener mensajes de un chat
   */
  async getCachedMessages(chatId: string): Promise<MessageCache[]> {
    try {
      const keys = Object.keys(localStorage);
      const messageKeys = keys.filter(key => 
        key.startsWith(this.generateKey('message', '')) &&
        key.includes(chatId)
      );

      const messages: MessageCache[] = [];
      messageKeys.forEach(key => {
        const message = this.getLocalStorageItem<MessageCache>(key);
        if (message) {
          messages.push(message);
        }
      });

      // Ordenar por timestamp
      return messages.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('❌ Error obteniendo mensajes del caché:', error);
      return [];
    }
  }

  /**
   * Guardar datos genéricos
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const fullKey = this.generateKey('custom', key);
    this.setLocalStorageItem(fullKey, data, ttl);
  }

  /**
   * Obtener datos genéricos
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.generateKey('custom', key);
    return this.getLocalStorageItem<T>(fullKey);
  }

  /**
   * Eliminar elemento del caché
   */
  async remove(key: string): Promise<void> {
    const fullKey = this.generateKey('custom', key);
    localStorage.removeItem(fullKey);
  }

  /**
   * Eliminar mensaje del caché
   */
  async removeMessage(messageId: string): Promise<void> {
    const key = this.generateKey('message', messageId);
    localStorage.removeItem(key);
  }

  /**
   * Eliminar chat del caché
   */
  async removeChat(chatId: string): Promise<void> {
    const key = this.generateKey('chat', chatId);
    localStorage.removeItem(key);
  }

  /**
   * Limpiar todo el caché
   */
  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log('🗑️ Caché limpiado completamente');
    } catch (error) {
      console.error('❌ Error limpiando caché:', error);
    }
  }

  /**
   * Obtener estadísticas del caché
   */
  async getStats(): Promise<CacheStats> {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      
      let totalSize = 0;
      let oldestItem = Date.now();
      let newestItem = 0;
      let expiredItems = 0;

      cacheKeys.forEach(key => {
        try {
          const itemStr = localStorage.getItem(key);
          if (itemStr) {
            const item: CacheItem = JSON.parse(itemStr);
            totalSize += this.getObjectSize(itemStr);
            
            if (item.timestamp < oldestItem) {
              oldestItem = item.timestamp;
            }
            if (item.timestamp > newestItem) {
              newestItem = item.timestamp;
            }
            
            if (this.isExpired(item)) {
              expiredItems++;
            }
          }
        } catch {
          expiredItems++;
        }
      });

      return {
        totalItems: cacheKeys.length,
        totalSize,
        oldestItem,
        newestItem,
        expiredItems,
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del caché:', error);
      return {
        totalItems: 0,
        totalSize: 0,
        oldestItem: 0,
        newestItem: 0,
        expiredItems: 0,
      };
    }
  }

  /**
   * Verificar si hay conexión a internet
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Sincronizar datos offline cuando vuelve la conexión
   */
  async syncOfflineData(): Promise<void> {
    if (!this.isOnline()) {
      console.log('📱 Sin conexión - datos guardados localmente');
      return;
    }

    try {
      // Aquí se implementaría la sincronización con el servidor
      console.log('🔄 Sincronizando datos offline...');
      
      // Por ahora solo limpiar elementos expirados
      await this.cleanupExpiredItems();
    } catch (error) {
      console.error('❌ Error sincronizando datos offline:', error);
    }
  }
}

// Instancia singleton
export const cacheService = new CacheService();

// Hook para usar el caché en componentes
export const useCache = () => {
  return {
    cacheMessage: cacheService.cacheMessage.bind(cacheService),
    getCachedMessage: cacheService.getCachedMessage.bind(cacheService),
    cacheChat: cacheService.cacheChat.bind(cacheService),
    getCachedChat: cacheService.getCachedChat.bind(cacheService),
    cacheMessages: cacheService.cacheMessages.bind(cacheService),
    getCachedMessages: cacheService.getCachedMessages.bind(cacheService),
    set: cacheService.set.bind(cacheService),
    get: cacheService.get.bind(cacheService),
    remove: cacheService.remove.bind(cacheService),
    clear: cacheService.clear.bind(cacheService),
    getStats: cacheService.getStats.bind(cacheService),
    isOnline: cacheService.isOnline.bind(cacheService),
    syncOfflineData: cacheService.syncOfflineData.bind(cacheService),
  };
}; 