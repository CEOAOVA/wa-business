/**
 * Servicio para registrar y despachar llamadas a funciones LLM
 * Migrado desde Backend-Embler para WhatsApp Business
 */
import { FunctionDefinition, FunctionResult, FunctionHandler } from '../../models/functions';
import { soapService } from '../soap/soap-service';
import { getConfig } from '../../config';
import { priceToText } from '../../utils/text-processing';
import { convertSucursalToFriendlyName, convertSucursalesToFriendlyNames, processSucursalesFromSOAP } from '../../utils/sucursal-mapping';
import { vinDecoderService } from '../vin-decoder-service';
import { csvInventoryService } from '../inventory/csv-inventory-service';
import { conceptsService } from '../concepts-service';

/**
 * Servicio para registrar y despachar llamadas a funciones LLM
 */
export class FunctionService {
  private handlers = new Map<string, FunctionHandler>();
  private definitions = new Map<string, FunctionDefinition>();
  private authenticatedPOS = new Map<string, boolean>();

  constructor() {
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
  registerFunction(
    name: string,
    handler: FunctionHandler,
    definition: FunctionDefinition
  ): void {
    this.handlers.set(name, handler);
    this.definitions.set(name, definition);
    console.log(`[FunctionService] Función registrada: ${name}`);
  }

  /**
   * Obtiene todas las definiciones de funciones
   */
  getFunctionDefinitions(): FunctionDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Ejecuta una función LLM
   */
  async executeFunction(
    functionName: string,
    args: any,
    context: { pointOfSaleId: string; userId?: string; sessionId?: string }
  ): Promise<FunctionResult> {
    const handler = this.handlers.get(functionName);
    if (!handler) {
      throw new Error(`Función no encontrada: ${functionName}`);
    }

    console.log(`[FunctionService] Ejecutando función ${functionName} con args:`, args);
    
    try {
      const result = await handler(args, context);
      console.log(`[FunctionService] Función ${functionName} ejecutada exitosamente`);
      return result;
    } catch (error) {
      console.error(`[FunctionService] Error ejecutando función ${functionName}:`, error);
      throw error;
    }
  }

  /**
   * Asegura autenticación SOAP para un POS
   */
  private async ensureAuthenticated(posId: string): Promise<void> {
    if (this.authenticatedPOS.get(posId)) {
      return;
    }

    try {
      await soapService.login(posId);
      this.authenticatedPOS.set(posId, true);
      console.log(`[FunctionService] POS ${posId} autenticado exitosamente`);
    } catch (error) {
      console.error(`[FunctionService] Error autenticando POS ${posId}:`, error);
      throw error;
    }
  }

  /**
   * Registra funciones de inventario
   */
  private registerInventoryFunctions(): void {
    // consultarInventario
    this.registerFunction(
      'consultarInventario',
      async (args, context) => {
        const { codigoProducto, nombreProducto } = args as { codigoProducto?: string; nombreProducto?: string };
        console.log(`[FunctionService] consultarInventario - Código: "${codigoProducto}", Nombre: "${nombreProducto}"`);
        
        if (codigoProducto) {
          console.log(`[FunctionService] Consultando inventario para código ${codigoProducto}`);
          
          try {
            await this.ensureAuthenticated(context.pointOfSaleId);
            const resultado = await soapService.consultarInventarioPorPunto(codigoProducto, context.pointOfSaleId);
            
            const disponible = resultado.CantidadDisponible > 0;
            const precioTexto = priceToText(resultado.Precio);
            
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
            } else {
              // Consultar inventario general
              const general = await soapService.consultarInventarioGeneral(codigoProducto, context.pointOfSaleId);
              const sucursalesConStock = processSucursalesFromSOAP(general);
              
              if (sucursalesConStock.length > 0) {
                const precioGeneral = sucursalesConStock[0].precio || resultado.Precio;
                const precioGeneralTexto = priceToText(precioGeneral);
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
              } else {
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
          } catch (error) {
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
      },
      {
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
      }
    );

    // consultarInventarioGeneral
    this.registerFunction(
      'consultarInventarioGeneral',
      async (args, context) => {
        const { codigoProducto } = args as { codigoProducto: string };
        await this.ensureAuthenticated(context.pointOfSaleId);
        const resultado = await soapService.consultarInventarioGeneral(codigoProducto, context.pointOfSaleId);
        const sucursales = (resultado.Inventarios?.ArrayOfstring || [])
          .map((item: any) => ({ id: item.string[0], cantidad: parseInt(item.string[1], 10) }))
          .filter((s: any) => s.cantidad > 0);
        const total = sucursales.reduce((sum: number, s: any) => sum + s.cantidad, 0);
        const precio = parseFloat(resultado.Inventarios?.ArrayOfstring?.[0]?.string[3] || '0');
        return { 
          success: true, 
          data: { 
            producto: codigoProducto, 
            disponibilidadTotal: total, 
            precio, 
            porSucursal: sucursales 
          } 
        };
      },
      {
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
      }
    );
  }

  /**
   * Registra funciones de búsqueda
   */
  private registerSearchFunctions(): void {
    // buscarYConsultarInventario
    this.registerFunction(
      'buscarYConsultarInventario',
      async (args, context) => {
        const { 
          termino, 
          codigoEspecifico, 
          incluirTodasSucursales = false,
          sucursalEspecifica 
        } = args as { 
          termino: string; 
          codigoEspecifico?: string; 
          incluirTodasSucursales?: boolean;
          sucursalEspecifica?: string;
        };

        console.log(`[FunctionService] buscarYConsultarInventario - Término: "${termino}", Código: "${codigoEspecifico}"`);

        try {
          let productos: any[] = [];

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
            await this.ensureAuthenticated(context.pointOfSaleId);
            
            // Consultar inventario local
            const inventarioLocal = await soapService.consultarInventarioPorPunto(codigo, context.pointOfSaleId);
            const disponibleLocal = inventarioLocal.CantidadDisponible > 0;
            const precioTexto = priceToText(inventarioLocal.Precio);

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
            } else if (incluirTodasSucursales) {
              // Consultar inventario general
              const inventarioGeneral = await soapService.consultarInventarioGeneral(codigo, context.pointOfSaleId);
              const sucursalesConStock = processSucursalesFromSOAP(inventarioGeneral);

              if (sucursalesConStock.length > 0) {
                const precioGeneral = sucursalesConStock[0].precio || inventarioLocal.Precio;
                const precioGeneralTexto = priceToText(precioGeneral);
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
            const terminoNormalizado = conceptsService.normalizeSearchTerm(termino);
            console.log(`[FunctionService] Buscando productos con término normalizado: "${terminoNormalizado}"`);
            
            productos = csvInventoryService.searchByNombre(terminoNormalizado);
            
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
          await this.ensureAuthenticated(context.pointOfSaleId);
          const inventarioLocal = await soapService.consultarInventarioPorPunto(codigo, context.pointOfSaleId);
          const disponibleLocal = inventarioLocal.CantidadDisponible > 0;
          const precioTexto = priceToText(inventarioLocal.Precio);

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
            const inventarioGeneral = await soapService.consultarInventarioGeneral(codigo, context.pointOfSaleId);
            const sucursalesConStock = processSucursalesFromSOAP(inventarioGeneral);
            
            if (sucursalesConStock.length > 0) {
              const precioGeneral = sucursalesConStock[0].precio || inventarioLocal.Precio;
              const precioGeneralTexto = priceToText(precioGeneral);
              
              // Filtrar por sucursal específica si se solicitó
              let sucursalesFiltradas = sucursalesConStock;
              let mensajeEspecifico = '';
              
              if (sucursalEspecifica) {
                const sucursalNormalizada = sucursalEspecifica.toLowerCase();
                sucursalesFiltradas = sucursalesConStock.filter(s => 
                  s.nombreAmigable.toLowerCase().includes(sucursalNormalizada) ||
                  s.id.toLowerCase().includes(sucursalNormalizada)
                );
                
                if (sucursalesFiltradas.length > 0) {
                  mensajeEspecifico = `Sí, tenemos ${producto.nombre || producto.Nombre} en ${sucursalEspecifica} con ${sucursalesFiltradas[0].cantidad} unidades disponibles. `;
                } else {
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

        } catch (error) {
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
      },
      {
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
      }
    );
  }

  /**
   * Registra funciones de transacciones
   */
  private registerTransactionFunctions(): void {
    // generarTicket
    this.registerFunction(
      'generarTicket',
      async (args, context) => {
        const { productos, datosUsuario, tipoCompra } = args as {
          productos: Array<{ codigo: string; nombre: string; cantidad: number; precio: number }>;
          datosUsuario: { nombre: string; telefono: string; codigoPostal: string };
          tipoCompra: 'local' | 'envio';
        };

        console.log(`[FunctionService] Generando ticket para ${productos.length} productos, tipo: ${tipoCompra}`);

        try {
          // Validar stock antes de proceder
          const validacionStock = [];
          for (const producto of productos) {
            const stockCheck = await soapService.consultarInventarioPorPunto(producto.codigo, context.pointOfSaleId);
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

          const ticket = await soapService.generarTicketDeCompra(articulos, datosUsuario, context.pointOfSaleId);

          const total = productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
          const totalTexto = priceToText(total);

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

        } catch (error) {
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
      },
      {
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
      }
    );

    // confirmarCompra
    this.registerFunction(
      'confirmarCompra',
      async (args, context) => {
        const { productos, datosUsuario, metodoPago = 'efectivo' } = args as {
          productos: Array<{ codigo: string; nombre: string; cantidad: number; precio: number }>;
          datosUsuario: { nombre: string; telefono: string; codigoPostal?: string };
          metodoPago?: string;
        };

        console.log(`[FunctionService] Confirmando compra para ${productos.length} productos`);

        try {
          const articulos = productos.map(p => ({
            code: p.codigo,
            quantity: p.cantidad,
            price: p.precio,
            description: p.nombre
          }));

          await this.ensureAuthenticated(context.pointOfSaleId);
          const transaccion = await soapService.generarTransaccion(articulos, context.pointOfSaleId);

          const total = productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
          const totalTexto = priceToText(total);

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

        } catch (error) {
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
      },
      {
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
      }
    );
  }

  /**
   * Registra funciones VIN
   */
  private registerVinFunctions(): void {
    // buscarPorVin
    this.registerFunction(
      'buscarPorVin',
      async (args, context) => {
        const { vin, terminoAdicional } = args as { vin: string; terminoAdicional?: string };

        console.log(`[FunctionService] Decodificando VIN: ${vin}`);

        try {
          const vinNormalizado = vinDecoderService.normalizeVin(vin);
          const vehicleInfo = await vinDecoderService.decodeVin(vinNormalizado);

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

          const resumenVehiculo = vinDecoderService.generateVehicleSummary(vehicleInfo);

          let mensaje = `Perfecto! Identifiqué tu vehículo: ${resumenVehiculo}`;
          
          if (terminoAdicional) {
            mensaje += `\n\nAhora buscaré ${terminoAdicional} para tu ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}.`;
          } else {
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

        } catch (error) {
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
      },
      {
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
      }
    );
  }

  /**
   * Registra funciones de asesor
   */
  private registerAdvisorFunctions(): void {
    // solicitarAsesor
    this.registerFunction(
      'solicitarAsesor',
      async (args, context) => {
        const { motivo, datosContacto, prioridad = 'normal' } = args as {
          motivo: string;
          datosContacto?: { nombre?: string; telefono?: string };
          prioridad?: 'baja' | 'normal' | 'alta';
        };

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

        } catch (error) {
          console.error(`[FunctionService] Error solicitando asesor:`, error);
          return {
            success: false,
            error: 'Error solicitando asesor',
            data: {
              mensaje: 'Hubo un problema notificando al asesor. Por favor, intenta contactarnos directamente por teléfono.'
            }
          };
        }
      },
      {
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
      }
    );
  }

  /**
   * Registra funciones de envío
   */
  private registerShippingFunctions(): void {
    // procesarEnvio
    this.registerFunction(
      'procesarEnvio',
      async (args, context) => {
        const { productos, direccionEnvio, costoEnvio } = args as {
          productos: Array<{ codigo: string; nombre: string; cantidad: number; precio: number }>;
          direccionEnvio: { 
            calle: string; 
            colonia: string; 
            ciudad: string; 
            codigoPostal: string; 
            estado: string;
          };
          costoEnvio?: number;
        };

        console.log(`[FunctionService] Procesando envío para ${productos.length} productos`);

        try {
          const subtotal = productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
          const envio = costoEnvio || 150; // Costo estándar de envío
          const total = subtotal + envio;
          
          const subtotalTexto = priceToText(subtotal);
          const envioTexto = priceToText(envio);
          const totalTexto = priceToText(total);

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

        } catch (error) {
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
      },
      {
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
      }
    );
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats(): {
    totalFunctions: number;
    registeredFunctions: string[];
    authenticatedPOS: string[];
  } {
    return {
      totalFunctions: this.definitions.size,
      registeredFunctions: Array.from(this.definitions.keys()),
      authenticatedPOS: Array.from(this.authenticatedPOS.keys())
    };
  }
}

// Exportar instancia singleton
export const functionService = new FunctionService(); 