"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.soapService = exports.SoapService = void 0;
/**
 * Servicio SOAP para consultas de inventario y transacciones
 * Migrado desde Backend-Embler para WhatsApp Business
 */
const soap = __importStar(require("soap"));
const config_1 = require("../../config");
const token_manager_1 = require("./token-manager");
const inventory_cache_1 = require("./inventory-cache");
const circuit_breaker_service_1 = require("../circuit-breaker/circuit-breaker.service");
// Tiempo de espera para peticiones SOAP (ms) - OPTIMIZADO
const SOAP_TIMEOUT = 10000; // REDUCIDO de 30s a 10s
/**
 * Cliente SOAP para servicios web
 */
class SoapService {
    constructor() {
        this.initialized = false;
        this.initPromise = null;
        this.lastInit = 0;
        this.connectionRetries = 5; // AUMENTADO de 3 a 5
    }
    /**
     * Inicializa el cliente SOAP cargando el WSDL y fijando el endpoint
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initPromise)
                return this.initPromise;
            const now = Date.now();
            if (this.initialized && now - this.lastInit < 30 * 60 * 1000) {
                return Promise.resolve();
            }
            this.initPromise = (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const config = (0, config_1.getConfig)();
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
                    let lastErr;
                    for (let attempt = 1; attempt <= this.connectionRetries; attempt++) {
                        try {
                            console.log(`[SOAP] Intento ${attempt}/${this.connectionRetries} de createClient`);
                            const client = yield soap.createClientAsync(config.soapWsdlUrl, options);
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
                        }
                        catch (err) {
                            lastErr = err;
                            console.warn(`[SOAP] Falló intento ${attempt}: ${err.message}`);
                            if (attempt < this.connectionRetries)
                                yield new Promise(r => setTimeout(r, 1000));
                        }
                    }
                    throw new Error(`No se pudo cargar WSDL: ${lastErr === null || lastErr === void 0 ? void 0 : lastErr.message}`);
                }
                catch (error) {
                    this.initialized = false;
                    this.initPromise = null;
                    console.error('[SOAP] Error inicializando cliente SOAP:', error);
                    throw error;
                }
            }))();
            return this.initPromise;
        });
    }
    /**
     * Obtiene token de autenticación, usando cache si está disponible
     */
    getAuthToken(posId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cachedToken = token_manager_1.tokenManager.getToken(posId);
            if (cachedToken)
                return cachedToken;
            const token = yield this.login(posId);
            token_manager_1.tokenManager.setToken(posId, token);
            return token;
        });
    }
    /**
     * Ejecuta login para obtener token de autenticación
     */
    login(posId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield this.initialize();
            if (!this.client)
                throw new Error('Cliente SOAP no inicializado');
            const config = (0, config_1.getConfig)();
            const creds = (_a = config.posCredentials) === null || _a === void 0 ? void 0 : _a[posId];
            if (!creds)
                throw new Error(`No hay credenciales configuradas para punto de venta ${posId}`);
            console.log(`[SOAP] Login en ${posId} con usuario ${creds.user}`);
            console.log(`[SOAP] Estableciendo SOAPAction para Login`);
            this.client.wsdl.options.wsdl_options.headers = Object.assign(Object.assign({}, this.client.wsdl.options.wsdl_options.headers), { 'SOAPAction': 'http://tempuri.org/EmblerWs/Login' });
            const params = { user: creds.user, pwd: creds.pwd };
            console.log(`[SOAP] Enviando parámetros de login: ${JSON.stringify({ user: creds.user, pwd: '***MASKED***' })}`);
            try {
                const [response] = yield this.client.LoginAsync(params);
                console.log(`[SOAP] Respuesta login recibida:`, response);
                const result = response === null || response === void 0 ? void 0 : response.LoginResult;
                if (!(result === null || result === void 0 ? void 0 : result.TokenAutenticacion)) {
                    throw new Error('No se recibió TokenAutenticacion en login SOAP');
                }
                console.log(`[SOAP] LOGIN EXITOSO, token obtenido: ${result.TokenAutenticacion.substring(0, 10)}...${result.TokenAutenticacion.substring(result.TokenAutenticacion.length - 5)}`);
                return result.TokenAutenticacion;
            }
            catch (error) {
                console.error(`[SOAP] Error en login:`, error);
                throw error;
            }
        });
    }
    /**
     * Consulta inventario general (todas sucursales)
     */
    consultarInventarioGeneral(productCode, pointOfSaleId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = { productCode, type: 'general' };
            const cached = inventory_cache_1.inventoryCache.get(cacheKey);
            if (cached)
                return cached;
            yield this.initialize();
            const token = yield this.getAuthToken(pointOfSaleId);
            this.client.wsdl.options.wsdl_options.headers = Object.assign(Object.assign({}, this.client.wsdl.options.wsdl_options.headers), { 'SOAPAction': 'http://tempuri.org/EmblerWs/ConsultarInventarioGeneral' });
            const params = { CodigoPieza: productCode, TokenAutenticacion: token };
            const [response] = yield this.client.ConsultarInventarioGeneralAsync(params);
            const result = response.ConsultarInventarioGeneralResult;
            if (result.Estatus !== 0) {
                throw new Error(`Error SOAP InventarioGeneral: ${result.Mensaje}`);
            }
            inventory_cache_1.inventoryCache.set(cacheKey, result);
            return result;
        });
    }
    /**
     * Consulta inventario en punto específico
     */
    consultarInventarioPorPunto(productCode, pointOfSaleId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield circuit_breaker_service_1.soapCircuitBreaker.execute(() => __awaiter(this, void 0, void 0, function* () {
                console.log(`[SOAP] consultarInventarioPorPunto - Código: ${productCode}, POS: ${pointOfSaleId}`);
                const cacheKey = { productCode, pointOfSaleId, type: 'local' };
                const cached = inventory_cache_1.inventoryCache.get(cacheKey);
                if (cached) {
                    console.log(`[SOAP] Usando inventario en caché para ${productCode}`);
                    return cached;
                }
                console.log(`[SOAP] Inventario no en caché, consultando API SOAP`);
                yield this.initialize();
                console.log(`[SOAP] Inicialización completa, obteniendo token`);
                const token = yield this.getAuthToken(pointOfSaleId);
                console.log(`[SOAP] Token obtenido, preparando consulta de inventario`);
                this.client.wsdl.options.wsdl_options.headers = Object.assign(Object.assign({}, this.client.wsdl.options.wsdl_options.headers), { 'SOAPAction': 'http://tempuri.org/EmblerWs/ConsultarInventarioPorPunto' });
                const params = {
                    CodigoPieza: productCode,
                    IdPuntoVenta: pointOfSaleId,
                    TokenAutenticacion: token
                };
                console.log(`[SOAP] Enviando parámetros de consulta:`, JSON.stringify(Object.assign(Object.assign({}, params), { TokenAutenticacion: token.substring(0, 10) + '...' })));
                try {
                    console.log(`[SOAP] Ejecutando ConsultarInventarioPorPuntoAsync`);
                    const [response] = yield this.client.ConsultarInventarioPorPuntoAsync(params);
                    console.log(`[SOAP] Respuesta recibida:`, response);
                    const result = response.ConsultarInventarioPorPuntoResult;
                    if (result.Estatus !== 0) {
                        console.error(`[SOAP] Error en consulta de inventario: ${result.Mensaje} (Estatus: ${result.Estatus})`);
                        throw new Error(`Error SOAP InventarioPorPunto: ${result.Mensaje}`);
                    }
                    console.log(`[SOAP] Consulta exitosa - Disponible: ${result.CantidadDisponible}, Precio: ${result.Precio}`);
                    inventory_cache_1.inventoryCache.set(cacheKey, result);
                    return result;
                }
                catch (error) {
                    console.error(`[SOAP] Error en consultarInventarioPorPunto:`, error);
                    throw error;
                }
            }), 
            // Fallback: retornar datos de caché o datos por defecto
            () => __awaiter(this, void 0, void 0, function* () {
                console.warn(`[SOAP] Usando fallback para consultarInventarioPorPunto - Código: ${productCode}`);
                const cacheKey = { productCode, pointOfSaleId, type: 'local' };
                const cached = inventory_cache_1.inventoryCache.get(cacheKey);
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
            }));
        });
    }
    /**
     * Genera una transacción con los artículos especificados
     */
    generarTransaccion(items, pointOfSaleId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialize();
            const token = yield this.getAuthToken(pointOfSaleId);
            const articulos = {
                Articulo: items.map(item => ({
                    Cantidad: item.quantity,
                    CodigoPieza: item.code,
                    Descuento: 0,
                    PrecioUnitario: item.price || 0
                }))
            };
            this.client.wsdl.options.wsdl_options.headers = Object.assign(Object.assign({}, this.client.wsdl.options.wsdl_options.headers), { 'SOAPAction': 'http://tempuri.org/EmblerWs/GenerarTransaccion' });
            const params = { articulos, IdCliente: 'wsd', IdPuntoVenta: pointOfSaleId, TokenAutenticacion: token };
            const [response] = yield this.client.GenerarTransaccionAsync(params);
            const result = response.GenerarTransaccionResult;
            if (result.Estatus !== 0) {
                throw new Error(`Error SOAP GenerarTransaccion: ${result.Mensaje}`);
            }
            return result;
        });
    }
    /**
     * Genera un ticket de compra
     */
    generarTicketDeCompra(items, customerInfo, pointOfSaleId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialize();
            const token = yield this.getAuthToken(pointOfSaleId);
            const articulos = {
                Articulo: items.map(item => ({
                    Cantidad: item.quantity,
                    CodigoPieza: item.code,
                    Descuento: 0,
                    PrecioUnitario: item.price || 0
                }))
            };
            this.client.wsdl.options.wsdl_options.headers = Object.assign(Object.assign({}, this.client.wsdl.options.wsdl_options.headers), { 'SOAPAction': 'http://tempuri.org/EmblerWs/GenerarTicketDeCompra' });
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
            const [response] = yield this.client.GenerarTicketDeCompraAsync(params);
            const result = response.GenerarTicketDeCompraResult;
            if (result.Estatus !== 0) {
                throw new Error(`Error SOAP GenerarTicketDeCompra: ${result.Mensaje}`);
            }
            return result;
        });
    }
    /**
     * Consulta la disponibilidad total de un producto en todos los almacenes
     */
    consultarDisponibilidadTotal(productCode, pointOfSaleId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialize();
            const token = yield this.getAuthToken(pointOfSaleId);
            this.client.wsdl.options.wsdl_options.headers = Object.assign(Object.assign({}, this.client.wsdl.options.wsdl_options.headers), { 'SOAPAction': 'http://tempuri.org/EmblerWs/ConsultarDisponibilidadTotal' });
            const params = { CodigoPieza: productCode, TokenAutenticacion: token };
            const [response] = yield this.client.ConsultarDisponibilidadTotalAsync(params);
            const result = response.ConsultarDisponibilidadTotalResult;
            if (result.Estatus !== 0) {
                throw new Error(`Error SOAP ConsultarDisponibilidadTotal: ${result.Mensaje}`);
            }
            return {
                disponibilidadTotal: result.DisponibilidadTotal,
                precio: result.Precio,
                porSucursal: result.PorSucursal || []
            };
        });
    }
    /**
     * Verifica la conectividad con el servicio SOAP
     */
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.initialize();
                return this.initialized;
            }
            catch (error) {
                console.error('[SOAP] Error en test de conexión:', error);
                return false;
            }
        });
    }
    /**
     * Invalida el cache de autenticación para un POS específico
     */
    invalidateAuthCache(posId) {
        token_manager_1.tokenManager.invalidateToken(posId);
    }
    /**
     * Obtiene estadísticas del cache de inventario
     */
    getCacheStats() {
        return inventory_cache_1.inventoryCache.getStats();
    }
}
exports.SoapService = SoapService;
// Exportar instancia singleton
exports.soapService = new SoapService();
