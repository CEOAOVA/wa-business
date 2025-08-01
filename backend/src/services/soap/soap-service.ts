/**
 * Servicio SOAP para consultas de inventario y transacciones
 * Migrado desde Backend-Embler para WhatsApp Business
 */
import * as soap from 'soap';
import * as Sentry from '../../utils/sentry-stub';
import { getConfig } from '../../config';
import { tokenManager } from './token-manager';
import { inventoryCache } from './inventory-cache';
import { soapCircuitBreaker } from '../circuit-breaker/circuit-breaker.service';

// Tiempo de espera para peticiones SOAP (ms) - OPTIMIZADO
const SOAP_TIMEOUT = 10000; // REDUCIDO de 30s a 10s

/**
 * Cliente SOAP para servicios web
 */
export class SoapService {
  private client: any;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private lastInit = 0;
  private readonly connectionRetries = 5; // AUMENTADO de 3 a 5

  /**
   * Inicializa el cliente SOAP cargando el WSDL y fijando el endpoint
   */
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    const now = Date.now();
    if (this.initialized && now - this.lastInit < 30 * 60 * 1000) {
      return Promise.resolve();
    }

    this.initPromise = (async () => {
      try {
        const config = getConfig();
        if (!config.soapWsdlUrl || !config.soapEndpoint) {
          throw new Error('URLs de WSDL o endpoint SOAP no configuradas');
        }

        console.log(`[SOAP] Cargando WSDL desde: ${config.soapWsdlUrl}`);
        console.log(`[SOAP] Endpoint configurado: ${config.soapEndpoint}`);

        const options = {
          disableCache: true,
          wsdl_options: {
            headers: {
              'Content-Type': 'text/xml; charset=utf-8',
              'Accept': 'text/xml',
              'User-Agent': 'whatsapp-soap-client/1.0'
            }
          }
        };

        let lastErr: any;
        for (let attempt = 1; attempt <= this.connectionRetries; attempt++) {
          try {
            console.log(`[SOAP] Intento ${attempt}/${this.connectionRetries} de createClient`);
            const client = await soap.createClientAsync(config.soapWsdlUrl, options);

            // Log available methods
            const methods = Object.keys(client).filter(k => typeof client[k] === 'function');
            console.log(`[SOAP] Métodos disponibles: ${methods.join(', ')}`);
            
            if (typeof client.Login !== 'function') {
              throw new Error('Método Login no disponible en cliente SOAP');
            }
            
            client.setEndpoint(config.soapEndpoint);
            this.client = client;
            this.initialized = true;
            this.lastInit = now;
            console.log('[SOAP] Cliente SOAP inicializado correctamente');
            return;
          } catch (err: any) {
            lastErr = err;
            console.warn(`[SOAP] Falló intento ${attempt}: ${err.message}`);
            if (attempt < this.connectionRetries) await new Promise(r => setTimeout(r, 1000));
          }
        }
        throw new Error(`No se pudo cargar WSDL: ${lastErr?.message}`);
      } catch (error) {
        this.initialized = false;
        this.initPromise = null;
        console.error('[SOAP] Error inicializando cliente SOAP:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Obtiene token de autenticación, usando cache si está disponible
   */
  private async getAuthToken(posId: string): Promise<string> {
    const cachedToken = tokenManager.getToken(posId);
    if (cachedToken) return cachedToken;

    const token = await this.login(posId);
    tokenManager.setToken(posId, token);
    return token;
  }

  /**
   * Ejecuta login para obtener token de autenticación
   */
  async login(posId: string): Promise<string> {
    await this.initialize();
    if (!this.client) throw new Error('Cliente SOAP no inicializado');

    const config = getConfig();
    const creds = config.posCredentials?.[posId];
    if (!creds) throw new Error(`No hay credenciales configuradas para punto de venta ${posId}`);

    console.log(`[SOAP] Login en ${posId} con usuario ${creds.user}`);
    console.log(`[SOAP] Estableciendo SOAPAction para Login`);
    
    this.client.wsdl.options.wsdl_options.headers = {
      ...this.client.wsdl.options.wsdl_options.headers,
      'SOAPAction': 'http://tempuri.org/EmblerWs/Login'
    };

    const params = { user: creds.user, pwd: creds.pwd };
    console.log(`[SOAP] Enviando parámetros de login: ${JSON.stringify({ user: creds.user, pwd: '***MASKED***' })}`);
    
    try {
      const [response] = await this.client.LoginAsync(params);
      console.log(`[SOAP] Respuesta login recibida:`, response);
      
      const result = response?.LoginResult;
      if (!result?.TokenAutenticacion) {
        throw new Error('No se recibió TokenAutenticacion en login SOAP');
      }

      console.log(`[SOAP] LOGIN EXITOSO, token obtenido: ${result.TokenAutenticacion.substring(0, 10)}...${result.TokenAutenticacion.substring(result.TokenAutenticacion.length - 5)}`);
      return result.TokenAutenticacion;
    } catch (error) {
      console.error(`[SOAP] Error en login:`, error);
      throw error;
    }
  }

  /**
   * Consulta inventario general (todas sucursales)
   */
  async consultarInventarioGeneral(
    productCode: string,
    pointOfSaleId: string
  ): Promise<any> {
    const cacheKey = { productCode, type: 'general' as const };
    const cached = inventoryCache.get(cacheKey);
    if (cached) return cached;

    await this.initialize();
    const token = await this.getAuthToken(pointOfSaleId);
    this.client.wsdl.options.wsdl_options.headers = {
      ...this.client.wsdl.options.wsdl_options.headers,
      'SOAPAction': 'http://tempuri.org/EmblerWs/ConsultarInventarioGeneral'
    };
    const params = { CodigoPieza: productCode, TokenAutenticacion: token };
    const [response] = await this.client.ConsultarInventarioGeneralAsync(params);
    const result = response.ConsultarInventarioGeneralResult;
    if (result.Estatus !== 0) {
      throw new Error(`Error SOAP InventarioGeneral: ${result.Mensaje}`);
    }
    inventoryCache.set(cacheKey, result);
    return result;
  }

  /**
   * Consulta inventario en punto específico
   */
  async consultarInventarioPorPunto(
    productCode: string,
    pointOfSaleId: string
  ): Promise<any> {
    return await soapCircuitBreaker.execute(
      async () => {
        console.log(`[SOAP] consultarInventarioPorPunto - Código: ${productCode}, POS: ${pointOfSaleId}`);
        
        const cacheKey = { productCode, pointOfSaleId, type: 'local' as const };
        const cached = inventoryCache.get(cacheKey);
        if (cached) {
          console.log(`[SOAP] Usando inventario en caché para ${productCode}`);
          return cached;
        }

        console.log(`[SOAP] Inventario no en caché, consultando API SOAP`);
        await this.initialize();
        console.log(`[SOAP] Inicialización completa, obteniendo token`);
        
        const token = await this.getAuthToken(pointOfSaleId);
        console.log(`[SOAP] Token obtenido, preparando consulta de inventario`);
        
        this.client.wsdl.options.wsdl_options.headers = {
          ...this.client.wsdl.options.wsdl_options.headers,
          'SOAPAction': 'http://tempuri.org/EmblerWs/ConsultarInventarioPorPunto'
        };
        
        const params = {
          CodigoPieza: productCode,
          IdPuntoVenta: pointOfSaleId,
          TokenAutenticacion: token
        };
        
        console.log(`[SOAP] Enviando parámetros de consulta:`, 
          JSON.stringify({...params, TokenAutenticacion: token.substring(0, 10) + '...'})
        );
        
        try {
          console.log(`[SOAP] Ejecutando ConsultarInventarioPorPuntoAsync`);
          const [response] = await this.client.ConsultarInventarioPorPuntoAsync(params);
          console.log(`[SOAP] Respuesta recibida:`, response);
          
          const result = response.ConsultarInventarioPorPuntoResult;
          if (result.Estatus !== 0) {
            console.error(`[SOAP] Error en consulta de inventario: ${result.Mensaje} (Estatus: ${result.Estatus})`);
            throw new Error(`Error SOAP InventarioPorPunto: ${result.Mensaje}`);
          }
          
          console.log(`[SOAP] Consulta exitosa - Disponible: ${result.CantidadDisponible}, Precio: ${result.Precio}`);
          inventoryCache.set(cacheKey, result);
          return result;
        } catch (error) {
          console.error(`[SOAP] Error en consultarInventarioPorPunto:`, error);
          throw error;
        }
      },
      // Fallback: retornar datos de caché o datos por defecto
      async () => {
        console.warn(`[SOAP] Usando fallback para consultarInventarioPorPunto - Código: ${productCode}`);
        const cacheKey = { productCode, pointOfSaleId, type: 'local' as const };
        const cached = inventoryCache.get(cacheKey);
        
        if (cached) {
          return cached;
        }
        
        // Retornar datos por defecto si no hay caché
        return {
          CantidadDisponible: 0,
          Precio: 0,
          Estatus: 0,
          Mensaje: 'Servicio temporalmente no disponible'
        };
      }
    );
  }

  /**
   * Genera una transacción con los artículos especificados
   */
  async generarTransaccion(
    items: Array<{ code: string; quantity: number; price?: number; description?: string }>,
    pointOfSaleId: string
  ): Promise<any> {
    await this.initialize();
    const token = await this.getAuthToken(pointOfSaleId);
    const articulos = {
      Articulo: items.map(item => ({
        Cantidad: item.quantity,
        CodigoPieza: item.code,
        Descuento: 0,
        PrecioUnitario: item.price || 0
      }))
    };
    this.client.wsdl.options.wsdl_options.headers = {
      ...this.client.wsdl.options.wsdl_options.headers,
      'SOAPAction': 'http://tempuri.org/EmblerWs/GenerarTransaccion'
    };
    const params = { articulos, IdCliente: 'wsd', IdPuntoVenta: pointOfSaleId, TokenAutenticacion: token };
    const [response] = await this.client.GenerarTransaccionAsync(params);
    const result = response.GenerarTransaccionResult;
    if (result.Estatus !== 0) {
      throw new Error(`Error SOAP GenerarTransaccion: ${result.Mensaje}`);
    }
    return result;
  }

  /**
   * Genera un ticket de compra
   */
  async generarTicketDeCompra(
    items: Array<{ code: string; quantity: number; price?: number; description?: string }>,
    customerInfo: { nombre: string; telefono: string; codigoPostal: string },
    pointOfSaleId: string
  ): Promise<any> {
    await this.initialize();
    const token = await this.getAuthToken(pointOfSaleId);
    
    const articulos = {
      Articulo: items.map(item => ({
        Cantidad: item.quantity,
        CodigoPieza: item.code,
        Descuento: 0,
        PrecioUnitario: item.price || 0
      }))
    };
    
    this.client.wsdl.options.wsdl_options.headers = {
      ...this.client.wsdl.options.wsdl_options.headers,
      'SOAPAction': 'http://tempuri.org/EmblerWs/GenerarTicketDeCompra'
    };
    
    const params = {
      articulos,
      DatosCliente: {
        Nombre: customerInfo.nombre,
        Telefono: customerInfo.telefono,
        CodigoPostal: customerInfo.codigoPostal
      },
      IdPuntoVenta: pointOfSaleId,
      TokenAutenticacion: token
    };
    
    const [response] = await this.client.GenerarTicketDeCompraAsync(params);
    const result = response.GenerarTicketDeCompraResult;
    if (result.Estatus !== 0) {
      throw new Error(`Error SOAP GenerarTicketDeCompra: ${result.Mensaje}`);
    }
    return result;
  }

  /**
   * Consulta la disponibilidad total de un producto en todos los almacenes
   */
  async consultarDisponibilidadTotal(
    productCode: string,
    pointOfSaleId: string
  ): Promise<{ disponibilidadTotal: number; precio: number; porSucursal: Array<{ id: string; nombre: string; cantidad: number }> }> {
    await this.initialize();
    const token = await this.getAuthToken(pointOfSaleId);
    this.client.wsdl.options.wsdl_options.headers = {
      ...this.client.wsdl.options.wsdl_options.headers,
      'SOAPAction': 'http://tempuri.org/EmblerWs/ConsultarDisponibilidadTotal'
    };
    const params = { CodigoPieza: productCode, TokenAutenticacion: token };
    const [response] = await this.client.ConsultarDisponibilidadTotalAsync(params);
    const result = response.ConsultarDisponibilidadTotalResult;
    if (result.Estatus !== 0) {
      throw new Error(`Error SOAP ConsultarDisponibilidadTotal: ${result.Mensaje}`);
    }
    return { 
      disponibilidadTotal: result.DisponibilidadTotal, 
      precio: result.Precio, 
      porSucursal: result.PorSucursal || [] 
    };
  }

  /**
   * Verifica la conectividad con el servicio SOAP
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.initialize();
      return this.initialized;
    } catch (error) {
      console.error('[SOAP] Error en test de conexión:', error);
      return false;
    }
  }

  /**
   * Invalida el cache de autenticación para un POS específico
   */
  invalidateAuthCache(posId: string): void {
    tokenManager.invalidateToken(posId);
  }

  /**
   * Obtiene estadísticas del cache de inventario
   */
  getCacheStats(): any {
    return inventoryCache.getStats();
  }
}

// Exportar instancia singleton
export const soapService = new SoapService(); 