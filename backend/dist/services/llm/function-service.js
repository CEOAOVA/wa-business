"use strict";
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
exports.functionService = exports.FunctionService = void 0;
const soap_service_1 = require("../soap/soap-service");
const text_processing_1 = require("../../utils/text-processing");
const sucursal_mapping_1 = require("../../utils/sucursal-mapping");
const vin_decoder_service_1 = require("../vin-decoder-service");
const csv_inventory_service_1 = require("../inventory/csv-inventory-service");
const concepts_service_1 = require("../concepts-service");
/**
 * Servicio para registrar y despachar llamadas a funciones LLM
 */
class FunctionService {
    constructor() {
        this.handlers = new Map();
        this.definitions = new Map();
        this.authenticatedPOS = new Map();
        this.registerInventoryFunctions();
        this.registerSearchFunctions();
        this.registerTransactionFunctions();
        this.registerVinFunctions();
        this.registerAdvisorFunctions();
        this.registerShippingFunctions();
    }
    /**
     * Registra una función LLM
     */
    registerFunction(name, handler, definition) {
        this.handlers.set(name, handler);
        this.definitions.set(name, definition);
        console.log(`[FunctionService] Función registrada: ${name}`);
    }
    /**
     * Obtiene todas las definiciones de funciones
     */
    getFunctionDefinitions() {
        return Array.from(this.definitions.values());
    }
    /**
     * Ejecuta una función LLM
     */
    executeFunction(functionName, args, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const handler = this.handlers.get(functionName);
            if (!handler) {
                throw new Error(`Función no encontrada: ${functionName}`);
            }
            console.log(`[FunctionService] Ejecutando función ${functionName} con args:`, args);
            try {
                const result = yield handler(args, context);
                console.log(`[FunctionService] Función ${functionName} ejecutada exitosamente`);
                return result;
            }
            catch (error) {
                console.error(`[FunctionService] Error ejecutando función ${functionName}:`, error);
                throw error;
            }
        });
    }
    /**
     * Asegura autenticación SOAP para un POS
     */
    ensureAuthenticated(posId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.authenticatedPOS.get(posId)) {
                return;
            }
            try {
                yield soap_service_1.soapService.login(posId);
                this.authenticatedPOS.set(posId, true);
                console.log(`[FunctionService] POS ${posId} autenticado exitosamente`);
            }
            catch (error) {
                console.error(`[FunctionService] Error autenticando POS ${posId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Registra funciones de inventario
     */
    registerInventoryFunctions() {
        // consultarInventario
        this.registerFunction('consultarInventario', (args, context) => __awaiter(this, void 0, void 0, function* () {
            const { codigoProducto, nombreProducto } = args;
            console.log(`[FunctionService] consultarInventario - Código: "${codigoProducto}", Nombre: "${nombreProducto}"`);
            if (codigoProducto) {
                console.log(`[FunctionService] Consultando inventario para código ${codigoProducto}`);
                try {
                    yield this.ensureAuthenticated(context.pointOfSaleId);
                    const resultado = yield soap_service_1.soapService.consultarInventarioPorPunto(codigoProducto, context.pointOfSaleId);
                    const disponible = resultado.CantidadDisponible > 0;
                    const precioTexto = (0, text_processing_1.priceToText)(resultado.Precio);
                    if (disponible) {
                        return {
                            success: true,
                            data: {
                                producto: nombreProducto || codigoProducto,
                                marca: 'N/A',
                                disponible,
                                cantidad: resultado.CantidadDisponible,
                                precio: resultado.Precio,
                                precioTexto,
                                sucursal: context.pointOfSaleId,
                                mensaje: `Producto disponible en sucursal ${context.pointOfSaleId}`
                            }
                        };
                    }
                    else {
                        // Consultar inventario general
                        const general = yield soap_service_1.soapService.consultarInventarioGeneral(codigoProducto, context.pointOfSaleId);
                        const sucursalesConStock = (0, sucursal_mapping_1.processSucursalesFromSOAP)(general);
                        if (sucursalesConStock.length > 0) {
                            const precioGeneral = sucursalesConStock[0].precio || resultado.Precio;
                            const precioGeneralTexto = (0, text_processing_1.priceToText)(precioGeneral);
                            const sucursalesNombres = sucursalesConStock.map(s => s.nombreAmigable).join(', ');
                            return {
                                success: true,
                                data: {
                                    stockGeneral: true,
                                    sinStockLocal: true,
                                    producto: {
                                        codigo: codigoProducto,
                                        nombre: nombreProducto || codigoProducto,
                                        precio: precioGeneral,
                                        precioTexto: precioGeneralTexto
                                    },
                                    sucursalesDisponibles: sucursalesConStock,
                                    mensaje: `${nombreProducto || codigoProducto} está disponible en: ${sucursalesNombres}. El precio es ${precioGeneralTexto}. ¿Deseas que te lo enviemos a casa?`,
                                    esperandoConfirmacionEnvio: true,
                                    tipoCompra: 'envio'
                                }
                            };
                        }
                        else {
                            return {
                                success: true,
                                data: {
                                    sinStock: true,
                                    producto: nombreProducto || codigoProducto,
                                    mensaje: `Lo siento, ${nombreProducto || codigoProducto} no está disponible actualmente en ninguna sucursal. Te conectaré con un asesor para verificar con proveedores.`,
                                    requiereAsesor: true
                                }
                            };
                        }
                    }
                }
                catch (error) {
                    console.error(`[FunctionService] Error en consultarInventario:`, error);
                    return {
                        success: false,
                        error: 'Error consultando inventario',
                        data: {
                            mensaje: `Tuve un problema consultando el inventario para ${nombreProducto || codigoProducto}. Te conectaré con un asesor para ayudarte.`,
                            requiereAsesor: true
                        }
                    };
                }
            }
            return {
                success: false,
                error: 'Código de producto requerido'
            };
        }), {
            name: 'consultarInventario',
            description: 'Consulta la disponibilidad y precio de un producto específico en el inventario',
            parameters: {
                type: 'object',
                properties: {
                    codigoProducto: {
                        type: 'string',
                        description: 'Código o número de serie del producto a consultar'
                    },
                    nombreProducto: {
                        type: 'string',
                        description: 'Nombre o descripción del producto'
                    }
                },
                required: ['codigoProducto']
            }
        });
        // consultarInventarioGeneral
        this.registerFunction('consultarInventarioGeneral', (args, context) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const { codigoProducto } = args;
            yield this.ensureAuthenticated(context.pointOfSaleId);
            const resultado = yield soap_service_1.soapService.consultarInventarioGeneral(codigoProducto, context.pointOfSaleId);
            const sucursales = (((_a = resultado.Inventarios) === null || _a === void 0 ? void 0 : _a.ArrayOfstring) || [])
                .map((item) => ({ id: item.string[0], cantidad: parseInt(item.string[1], 10) }))
                .filter((s) => s.cantidad > 0);
            const total = sucursales.reduce((sum, s) => sum + s.cantidad, 0);
            const precio = parseFloat(((_d = (_c = (_b = resultado.Inventarios) === null || _b === void 0 ? void 0 : _b.ArrayOfstring) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.string[3]) || '0');
            return {
                success: true,
                data: {
                    producto: codigoProducto,
                    disponibilidadTotal: total,
                    precio,
                    porSucursal: sucursales
                }
            };
        }), {
            name: 'consultarInventarioGeneral',
            description: 'Consulta la disponibilidad total de un producto en todas las sucursales',
            parameters: {
                type: 'object',
                properties: {
                    codigoProducto: {
                        type: 'string',
                        description: 'Código del producto a consultar'
                    }
                },
                required: ['codigoProducto']
            }
        });
    }
    /**
     * Registra funciones de búsqueda
     */
    registerSearchFunctions() {
        // buscarYConsultarInventario
        this.registerFunction('buscarYConsultarInventario', (args, context) => __awaiter(this, void 0, void 0, function* () {
            const { termino, codigoEspecifico, incluirTodasSucursales = false, sucursalEspecifica } = args;
            console.log(`[FunctionService] buscarYConsultarInventario - Término: "${termino}", Código: "${codigoEspecifico}"`);
            try {
                let productos = [];
                // Si se proporciona código específico, buscar directamente
                if (codigoEspecifico && String(codigoEspecifico).trim()) {
                    console.log(`[FunctionService] Código específico detectado: ${codigoEspecifico}`);
                    productos = [{
                            codigo: String(codigoEspecifico).trim(),
                            nombre: termino,
                            marca: 'N/A'
                        }];
                    const codigo = String(codigoEspecifico).trim();
                    // Ejecutar consultas SOAP
                    yield this.ensureAuthenticated(context.pointOfSaleId);
                    // Consultar inventario local
                    const inventarioLocal = yield soap_service_1.soapService.consultarInventarioPorPunto(codigo, context.pointOfSaleId);
                    const disponibleLocal = inventarioLocal.CantidadDisponible > 0;
                    const precioTexto = (0, text_processing_1.priceToText)(inventarioLocal.Precio);
                    if (disponibleLocal) {
                        return {
                            success: true,
                            data: {
                                stockLocal: true,
                                producto: {
                                    codigo: codigo,
                                    nombre: termino,
                                    precio: inventarioLocal.Precio,
                                    precioTexto: precioTexto,
                                    cantidad: inventarioLocal.CantidadDisponible
                                },
                                sucursal: context.pointOfSaleId,
                                mensaje: `¡Perfecto! Tenemos ${termino} disponible en esta sucursal por ${precioTexto} con ${inventarioLocal.CantidadDisponible} unidades en stock.`,
                                tipoCompra: 'local'
                            }
                        };
                    }
                    else if (incluirTodasSucursales) {
                        // Consultar inventario general
                        const inventarioGeneral = yield soap_service_1.soapService.consultarInventarioGeneral(codigo, context.pointOfSaleId);
                        const sucursalesConStock = (0, sucursal_mapping_1.processSucursalesFromSOAP)(inventarioGeneral);
                        if (sucursalesConStock.length > 0) {
                            const precioGeneral = sucursalesConStock[0].precio || inventarioLocal.Precio;
                            const precioGeneralTexto = (0, text_processing_1.priceToText)(precioGeneral);
                            const sucursalesNombres = sucursalesConStock.map(s => s.nombreAmigable).join(', ');
                            return {
                                success: true,
                                data: {
                                    stockGeneral: true,
                                    sinStockLocal: true,
                                    producto: {
                                        codigo: codigo,
                                        nombre: termino,
                                        precio: precioGeneral,
                                        precioTexto: precioGeneralTexto,
                                        cantidad: 1
                                    },
                                    sucursalesDisponibles: sucursalesConStock,
                                    mensaje: `${termino} está disponible en: ${sucursalesNombres}. El precio es ${precioGeneralTexto}. ¿Deseas que te lo enviemos a casa?`,
                                    esperandoConfirmacionEnvio: true,
                                    tipoCompra: 'envio'
                                }
                            };
                        }
                    }
                    return {
                        success: true,
                        data: {
                            sinStockLocal: true,
                            producto: {
                                codigo: codigo,
                                nombre: termino,
                                precio: inventarioLocal.Precio,
                                precioTexto: precioTexto
                            },
                            mensaje: `No tenemos ${termino} en esta sucursal. ¿Te interesa que consulte otras sucursales o prefieres que te conecte con un asesor?`,
                            requiereAsesor: true
                        }
                    };
                }
                // Buscar productos por término
                if (!productos.length) {
                    // Normalizar término con conceptos mexicanos
                    const terminoNormalizado = concepts_service_1.conceptsService.normalizeSearchTerm(termino);
                    console.log(`[FunctionService] Buscando productos con término normalizado: "${terminoNormalizado}"`);
                    productos = csv_inventory_service_1.csvInventoryService.searchByNombre(terminoNormalizado);
                    if (productos.length === 0) {
                        return {
                            success: true,
                            data: {
                                sinResultados: true,
                                termino: termino,
                                mensaje: `No encontré productos que coincidan con "${termino}". ¿Podrías ser más específico o probar con otro término? También puedo conectarte con un asesor.`,
                                requiereAsesor: true
                            }
                        };
                    }
                }
                // Si hay múltiples productos, mostrar opciones
                if (productos.length > 1) {
                    const opciones = productos.slice(0, 5).map((p, index) => ({
                        numero: index + 1,
                        codigo: p.codigo || p.Clave,
                        nombre: p.nombre || p.Nombre,
                        marca: p.marca || 'N/A'
                    }));
                    return {
                        success: true,
                        data: {
                            multipleResultados: true,
                            termino: termino,
                            productos: opciones,
                            mensaje: `Encontré varias opciones para "${termino}". ¿Cuál te interesa?\n\n${opciones.map(o => `${o.numero}. ${o.nombre} (${o.codigo})`).join('\n')}\n\nPuedes responder con el número o decirme cuál prefieres.`,
                            esperandoSeleccion: true
                        }
                    };
                }
                // Un solo producto encontrado
                const producto = productos[0];
                if (!producto.codigo && !producto.Clave) {
                    return {
                        success: true,
                        data: {
                            sinCodigo: true,
                            producto: producto.nombre || producto.Nombre,
                            mensaje: `Encontré "${producto.nombre || producto.Nombre}" pero no tiene código asignado. Te conectaré con un asesor para verificar la disponibilidad.`,
                            requiereAsesor: true
                        }
                    };
                }
                const codigo = String(producto.codigo || producto.Clave).trim();
                console.log(`[FunctionService] Consultando inventario para producto único: ${codigo}`);
                // Consultar inventario
                yield this.ensureAuthenticated(context.pointOfSaleId);
                const inventarioLocal = yield soap_service_1.soapService.consultarInventarioPorPunto(codigo, context.pointOfSaleId);
                const disponibleLocal = inventarioLocal.CantidadDisponible > 0;
                const precioTexto = (0, text_processing_1.priceToText)(inventarioLocal.Precio);
                if (disponibleLocal) {
                    return {
                        success: true,
                        data: {
                            stockLocal: true,
                            producto: {
                                codigo: codigo,
                                nombre: producto.nombre || producto.Nombre,
                                precio: inventarioLocal.Precio,
                                precioTexto: precioTexto,
                                cantidad: inventarioLocal.CantidadDisponible
                            },
                            sucursal: context.pointOfSaleId,
                            mensaje: `¡Perfecto! Tenemos ${producto.nombre || producto.Nombre} disponible en esta sucursal por ${precioTexto} con ${inventarioLocal.CantidadDisponible} unidades en stock.`,
                            tipoCompra: 'local'
                        }
                    };
                }
                // Sin stock local, consultar otras sucursales si se solicita
                if (incluirTodasSucursales) {
                    const inventarioGeneral = yield soap_service_1.soapService.consultarInventarioGeneral(codigo, context.pointOfSaleId);
                    const sucursalesConStock = (0, sucursal_mapping_1.processSucursalesFromSOAP)(inventarioGeneral);
                    if (sucursalesConStock.length > 0) {
                        const precioGeneral = sucursalesConStock[0].precio || inventarioLocal.Precio;
                        const precioGeneralTexto = (0, text_processing_1.priceToText)(precioGeneral);
                        // Filtrar por sucursal específica si se solicitó
                        let sucursalesFiltradas = sucursalesConStock;
                        let mensajeEspecifico = '';
                        if (sucursalEspecifica) {
                            const sucursalNormalizada = sucursalEspecifica.toLowerCase();
                            sucursalesFiltradas = sucursalesConStock.filter(s => s.nombreAmigable.toLowerCase().includes(sucursalNormalizada) ||
                                s.id.toLowerCase().includes(sucursalNormalizada));
                            if (sucursalesFiltradas.length > 0) {
                                mensajeEspecifico = `Sí, tenemos ${producto.nombre || producto.Nombre} en ${sucursalEspecifica} con ${sucursalesFiltradas[0].cantidad} unidades disponibles. `;
                            }
                            else {
                                mensajeEspecifico = `No tenemos ${producto.nombre || producto.Nombre} en ${sucursalEspecifica}, pero está disponible en otras sucursales. `;
                            }
                        }
                        const sucursalesNombres = sucursalesFiltradas.length > 0
                            ? sucursalesFiltradas.map(s => s.nombreAmigable).join(', ')
                            : sucursalesConStock.map(s => s.nombreAmigable).join(', ');
                        return {
                            success: true,
                            data: {
                                stockGeneral: true,
                                sinStockLocal: !sucursalEspecifica,
                                producto: {
                                    codigo: codigo,
                                    nombre: producto.nombre || producto.Nombre,
                                    precio: precioGeneral,
                                    precioTexto: precioGeneralTexto,
                                    cantidad: 1
                                },
                                sucursalesDisponibles: sucursalesFiltradas.length > 0 ? sucursalesFiltradas : sucursalesConStock,
                                mensaje: `${mensajeEspecifico}${producto.nombre || producto.Nombre} está disponible en: ${sucursalesNombres}. El precio es ${precioGeneralTexto}. ¿Deseas que te lo enviemos a casa?`,
                                esperandoConfirmacionEnvio: true,
                                tipoCompra: 'envio'
                            }
                        };
                    }
                }
                return {
                    success: true,
                    data: {
                        sinStockLocal: true,
                        producto: {
                            codigo: codigo,
                            nombre: producto.nombre || producto.Nombre,
                            precio: inventarioLocal.Precio,
                            precioTexto: precioTexto
                        },
                        mensaje: `No tenemos ${producto.nombre || producto.Nombre} en esta sucursal. ¿Te interesa que consulte otras sucursales o prefieres que te conecte con un asesor?`,
                        requiereAsesor: true
                    }
                };
            }
            catch (error) {
                console.error(`[FunctionService] Error en buscarYConsultarInventario:`, error);
                return {
                    success: false,
                    error: 'Error en búsqueda de productos',
                    data: {
                        mensaje: `Tuve un problema buscando "${termino}". Te conectaré con un asesor para ayudarte.`,
                        requiereAsesor: true,
                        terminoBusqueda: termino
                    }
                };
            }
        }), {
            name: 'buscarYConsultarInventario',
            description: 'Busca productos por término y consulta su disponibilidad en inventario',
            parameters: {
                type: 'object',
                properties: {
                    termino: {
                        type: 'string',
                        description: 'Término de búsqueda del producto'
                    },
                    codigoEspecifico: {
                        type: 'string',
                        description: 'Código específico del producto si se conoce'
                    },
                    incluirTodasSucursales: {
                        type: 'boolean',
                        description: 'Si incluir búsqueda en todas las sucursales'
                    },
                    sucursalEspecifica: {
                        type: 'string',
                        description: 'Sucursal específica donde buscar'
                    }
                },
                required: ['termino']
            }
        });
    }
    /**
     * Registra funciones de transacciones
     */
    registerTransactionFunctions() {
        // generarTicket
        this.registerFunction('generarTicket', (args, context) => __awaiter(this, void 0, void 0, function* () {
            const { productos, datosUsuario, tipoCompra } = args;
            console.log(`[FunctionService] Generando ticket para ${productos.length} productos, tipo: ${tipoCompra}`);
            try {
                // Validar stock antes de proceder
                const validacionStock = [];
                for (const producto of productos) {
                    const stockCheck = yield soap_service_1.soapService.consultarInventarioPorPunto(producto.codigo, context.pointOfSaleId);
                    validacionStock.push({
                        codigo: producto.codigo,
                        nombre: producto.nombre,
                        disponible: stockCheck.CantidadDisponible >= producto.cantidad,
                        cantidadDisponible: stockCheck.CantidadDisponible,
                        cantidadSolicitada: producto.cantidad
                    });
                }
                const productosNoDisponibles = validacionStock.filter(p => !p.disponible);
                if (productosNoDisponibles.length > 0 && tipoCompra === 'local') {
                    return {
                        success: false,
                        error: 'Stock insuficiente',
                        data: {
                            mensaje: 'Algunos productos ya no tienen stock suficiente. Te conectaré con un asesor.',
                            productosNoDisponibles,
                            requiereAsesor: true
                        }
                    };
                }
                // Generar ticket
                const articulos = productos.map(p => ({
                    code: p.codigo,
                    quantity: p.cantidad,
                    price: p.precio,
                    description: p.nombre
                }));
                const ticket = yield soap_service_1.soapService.generarTicketDeCompra(articulos, datosUsuario, context.pointOfSaleId);
                const total = productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
                const totalTexto = (0, text_processing_1.priceToText)(total);
                return {
                    success: true,
                    data: {
                        ticketGenerado: true,
                        numeroTicket: ticket.NumeroTicket || 'N/A',
                        productos: productos,
                        total: total,
                        totalTexto: totalTexto,
                        datosUsuario: datosUsuario,
                        tipoCompra: tipoCompra,
                        mensaje: `¡Ticket generado exitosamente! Número: ${ticket.NumeroTicket || 'N/A'}. Total: ${totalTexto}. ${tipoCompra === 'local' ? 'Puedes pasar a recogerlo en la sucursal.' : 'Se procesará el envío a tu domicilio.'}`
                    }
                };
            }
            catch (error) {
                console.error(`[FunctionService] Error generando ticket:`, error);
                return {
                    success: false,
                    error: 'Error generando ticket',
                    data: {
                        mensaje: 'Hubo un problema generando el ticket. Te conectaré con un asesor para completar la compra.',
                        requiereAsesor: true
                    }
                };
            }
        }), {
            name: 'generarTicket',
            description: 'Genera un ticket de compra para los productos seleccionados',
            parameters: {
                type: 'object',
                properties: {
                    productos: {
                        type: 'array',
                        description: 'Lista de productos a comprar',
                        items: {
                            type: 'object',
                            properties: {
                                codigo: { type: 'string' },
                                nombre: { type: 'string' },
                                cantidad: { type: 'number' },
                                precio: { type: 'number' }
                            }
                        }
                    },
                    datosUsuario: {
                        type: 'object',
                        description: 'Datos del usuario para la compra',
                        properties: {
                            nombre: { type: 'string' },
                            telefono: { type: 'string' },
                            codigoPostal: { type: 'string' }
                        }
                    },
                    tipoCompra: {
                        type: 'string',
                        description: 'Tipo de compra: local o envío',
                        enum: ['local', 'envio']
                    }
                },
                required: ['productos', 'datosUsuario', 'tipoCompra']
            }
        });
        // confirmarCompra
        this.registerFunction('confirmarCompra', (args, context) => __awaiter(this, void 0, void 0, function* () {
            const { productos, datosUsuario, metodoPago = 'efectivo' } = args;
            console.log(`[FunctionService] Confirmando compra para ${productos.length} productos`);
            try {
                const articulos = productos.map(p => ({
                    code: p.codigo,
                    quantity: p.cantidad,
                    price: p.precio,
                    description: p.nombre
                }));
                yield this.ensureAuthenticated(context.pointOfSaleId);
                const transaccion = yield soap_service_1.soapService.generarTransaccion(articulos, context.pointOfSaleId);
                const total = productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
                const totalTexto = (0, text_processing_1.priceToText)(total);
                return {
                    success: true,
                    data: {
                        compraConfirmada: true,
                        numeroTransaccion: transaccion.NumeroTransaccion || 'N/A',
                        productos: productos,
                        total: total,
                        totalTexto: totalTexto,
                        metodoPago: metodoPago,
                        mensaje: `¡Compra confirmada! Transacción: ${transaccion.NumeroTransaccion || 'N/A'}. Total: ${totalTexto}. Método de pago: ${metodoPago}.`
                    }
                };
            }
            catch (error) {
                console.error(`[FunctionService] Error confirmando compra:`, error);
                return {
                    success: false,
                    error: 'Error confirmando compra',
                    data: {
                        mensaje: 'Hubo un problema confirmando la compra. Te conectaré con un asesor.',
                        requiereAsesor: true
                    }
                };
            }
        }), {
            name: 'confirmarCompra',
            description: 'Confirma una compra y genera la transacción correspondiente',
            parameters: {
                type: 'object',
                properties: {
                    productos: {
                        type: 'array',
                        description: 'Lista de productos para consulta',
                        items: {
                            type: 'object',
                            properties: {
                                codigo: { type: 'string' },
                                nombre: { type: 'string' },
                                cantidad: { type: 'number' },
                                precio: { type: 'number' }
                            }
                        }
                    },
                    datosUsuario: {
                        type: 'object',
                        description: 'Datos del usuario para la consulta',
                        properties: {
                            nombre: { type: 'string' },
                            telefono: { type: 'string' },
                            codigoPostal: { type: 'string' }
                        }
                    },
                    metodoPago: {
                        type: 'string',
                        description: 'Método de pago preferido'
                    }
                },
                required: ['productos', 'datosUsuario']
            }
        });
    }
    /**
     * Registra funciones VIN
     */
    registerVinFunctions() {
        // buscarPorVin
        this.registerFunction('buscarPorVin', (args, context) => __awaiter(this, void 0, void 0, function* () {
            const { vin, terminoAdicional } = args;
            console.log(`[FunctionService] Decodificando VIN: ${vin}`);
            try {
                const vinNormalizado = vin_decoder_service_1.vinDecoderService.normalizeVin(vin);
                const vehicleInfo = yield vin_decoder_service_1.vinDecoderService.decodeVin(vinNormalizado);
                if (!vehicleInfo) {
                    return {
                        success: false,
                        error: 'VIN no válido o no encontrado',
                        data: {
                            mensaje: `No pude decodificar el VIN "${vin}". ¿Puedes verificar que esté correcto o decirme la marca y modelo de tu vehículo?`,
                            vin: vin
                        }
                    };
                }
                const resumenVehiculo = vin_decoder_service_1.vinDecoderService.generateVehicleSummary(vehicleInfo);
                let mensaje = `Perfecto! Identifiqué tu vehículo: ${resumenVehiculo}`;
                if (terminoAdicional) {
                    mensaje += `\n\nAhora buscaré ${terminoAdicional} para tu ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}.`;
                }
                else {
                    mensaje += `\n\n¿Qué refacción necesitas para tu vehículo?`;
                }
                return {
                    success: true,
                    data: {
                        vinDecodificado: true,
                        vin: vinNormalizado,
                        vehiculo: vehicleInfo,
                        resumen: resumenVehiculo,
                        terminoAdicional: terminoAdicional,
                        mensaje: mensaje,
                        esperandoProducto: !terminoAdicional
                    }
                };
            }
            catch (error) {
                console.error(`[FunctionService] Error decodificando VIN:`, error);
                return {
                    success: false,
                    error: 'Error decodificando VIN',
                    data: {
                        mensaje: `Hubo un problema decodificando el VIN. ¿Puedes decirme la marca, modelo y año de tu vehículo?`,
                        vin: vin
                    }
                };
            }
        }), {
            name: 'buscarPorVin',
            description: 'Decodifica un VIN para identificar el vehículo y buscar refacciones compatibles',
            parameters: {
                type: 'object',
                properties: {
                    vin: {
                        type: 'string',
                        description: 'Número VIN del vehículo (17 caracteres)'
                    },
                    terminoAdicional: {
                        type: 'string',
                        description: 'Término adicional de búsqueda después del VIN'
                    }
                },
                required: ['vin']
            }
        });
    }
    /**
     * Registra funciones de asesor
     */
    registerAdvisorFunctions() {
        // solicitarAsesor
        this.registerFunction('solicitarAsesor', (args, context) => __awaiter(this, void 0, void 0, function* () {
            const { motivo, datosContacto, prioridad = 'normal' } = args;
            console.log(`[FunctionService] Solicitud de asesor - Motivo: ${motivo}, Prioridad: ${prioridad}`);
            try {
                // Simular notificación a asesor
                const numeroSolicitud = `ASE-${Date.now()}`;
                return {
                    success: true,
                    data: {
                        asesorSolicitado: true,
                        numeroSolicitud: numeroSolicitud,
                        motivo: motivo,
                        prioridad: prioridad,
                        tiempoEstimado: prioridad === 'alta' ? '2-5 minutos' : '5-10 minutos',
                        mensaje: `¡Perfecto! He notificado a un asesor especializado. Tu número de solicitud es ${numeroSolicitud}. Un asesor te contactará en ${prioridad === 'alta' ? '2-5 minutos' : '5-10 minutos'}.`
                    }
                };
            }
            catch (error) {
                console.error(`[FunctionService] Error solicitando asesor:`, error);
                return {
                    success: false,
                    error: 'Error solicitando asesor',
                    data: {
                        mensaje: 'Hubo un problema notificando al asesor. Por favor, intenta contactarnos directamente por teléfono.'
                    }
                };
            }
        }), {
            name: 'solicitarAsesor',
            description: 'Solicita la intervención de un asesor humano especializado',
            parameters: {
                type: 'object',
                properties: {
                    motivo: {
                        type: 'string',
                        description: 'Motivo por el cual se solicita el asesor'
                    },
                    datosContacto: {
                        type: 'object',
                        description: 'Datos de contacto del usuario',
                        properties: {
                            nombre: { type: 'string' },
                            telefono: { type: 'string' }
                        }
                    },
                    prioridad: {
                        type: 'string',
                        enum: ['baja', 'normal', 'alta'],
                        description: 'Prioridad de la solicitud'
                    }
                },
                required: ['motivo']
            }
        });
    }
    /**
     * Registra funciones de envío
     */
    registerShippingFunctions() {
        // procesarEnvio
        this.registerFunction('procesarEnvio', (args, context) => __awaiter(this, void 0, void 0, function* () {
            const { productos, direccionEnvio, costoEnvio } = args;
            console.log(`[FunctionService] Procesando envío para ${productos.length} productos`);
            try {
                const subtotal = productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
                const envio = costoEnvio || 150; // Costo estándar de envío
                const total = subtotal + envio;
                const subtotalTexto = (0, text_processing_1.priceToText)(subtotal);
                const envioTexto = (0, text_processing_1.priceToText)(envio);
                const totalTexto = (0, text_processing_1.priceToText)(total);
                // Estimar tiempo de entrega
                const tiempoEntrega = '3 a 5 días hábiles';
                return {
                    success: true,
                    data: {
                        envioConfirmado: true,
                        productos: productos,
                        direccionEnvio: direccionEnvio,
                        subtotal: subtotal,
                        costoEnvio: envio,
                        total: total,
                        subtotalTexto: subtotalTexto,
                        envioTexto: envioTexto,
                        totalTexto: totalTexto,
                        tiempoEntrega: tiempoEntrega,
                        mensaje: `¡Envío confirmado! Subtotal: ${subtotalTexto}, Envío: ${envioTexto}, Total: ${totalTexto}. Tiempo de entrega estimado: ${tiempoEntrega}.`
                    }
                };
            }
            catch (error) {
                console.error(`[FunctionService] Error procesando envío:`, error);
                return {
                    success: false,
                    error: 'Error procesando envío',
                    data: {
                        mensaje: 'Hubo un problema procesando el envío. Te conectaré con un asesor.',
                        requiereAsesor: true
                    }
                };
            }
        }), {
            name: 'procesarEnvio',
            description: 'Procesa un envío a domicilio con cálculo de costos y tiempos',
            parameters: {
                type: 'object',
                properties: {
                    productos: {
                        type: 'array',
                        description: 'Lista de productos para envío',
                        items: {
                            type: 'object',
                            properties: {
                                codigo: { type: 'string' },
                                nombre: { type: 'string' },
                                cantidad: { type: 'number' },
                                precio: { type: 'number' }
                            }
                        }
                    },
                    direccionEnvio: {
                        type: 'object',
                        description: 'Dirección de envío del pedido',
                        properties: {
                            calle: { type: 'string' },
                            colonia: { type: 'string' },
                            ciudad: { type: 'string' },
                            codigoPostal: { type: 'string' },
                            estado: { type: 'string' }
                        },
                        required: ['calle', 'colonia', 'ciudad', 'codigoPostal']
                    },
                    costoEnvio: {
                        type: 'number',
                        description: 'Costo del envío si se especifica'
                    }
                },
                required: ['productos', 'direccionEnvio']
            }
        });
    }
    /**
     * Obtiene estadísticas del servicio
     */
    getStats() {
        return {
            totalFunctions: this.definitions.size,
            registeredFunctions: Array.from(this.definitions.keys()),
            authenticatedPOS: Array.from(this.authenticatedPOS.keys())
        };
    }
}
exports.FunctionService = FunctionService;
// Exportar instancia singleton
exports.functionService = new FunctionService();
