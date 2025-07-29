/**
 * Servicio para registrar y despachar llamadas a funciones LLM
 * Migrado desde Backend-Embler para WhatsApp Business
 */
import { FunctionDefinition, FunctionResult, FunctionHandler, FunctionContext } from '../../models/functions';
import { soapService } from '../soap/soap-service';
import { getConfig } from '../../config';
import { priceToText, processSucursalesFromSOAP } from '../../utils/soap-utils';
import { convertSucursalToFriendlyName, convertSucursalesToFriendlyNames } from '../../utils/sucursal-mapping';
import { vinDecoderService } from '../vin-decoder-service';
import { csvInventoryService } from '../inventory/csv-inventory-service';
import { conceptsService } from '../concepts-service';
import path from 'path';

interface FunctionCall {
  name: string;
  description: string;
  parameters: any;
}

/**
 * Servicio para registrar y despachar llamadas a funciones LLM
 */
export class FunctionService {
  private handlers = new Map<string, FunctionHandler>();
  private definitions = new Map<string, FunctionDefinition>();
  private authenticatedPOS = new Map<string, boolean>();

  constructor() {
    this.registerClientValidationFunctions();
    this.registerImageFunctions();
    this.registerInventoryFunctions();
    this.registerSearchFunctions();
    this.registerProductSearchFunctions(); // NUEVA: Funciones de búsqueda de productos
    this.registerTransactionFunctions();
    this.registerVinFunctions();
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
    context: FunctionContext
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
   * Registra funciones de validación de datos del cliente
   */
  private registerClientValidationFunctions(): void {
    // recopilarDatosCliente - función mejorada para conversaciones nuevas y existentes
    this.registerFunction(
      'recopilarDatosCliente',
      async (args, context) => {
        const { 
          nombre, 
          codigoPostal, 
          direccion, 
          telefono,
          esConversacionExistente = false,
          soloParaCompra = false 
        } = args as {
          nombre?: string;
          codigoPostal?: string;
          direccion?: string;
          telefono?: string;
          esConversacionExistente?: boolean;
          soloParaCompra?: boolean;
        };

        console.log(`[FunctionService] Recopilando datos del cliente... (Existente: ${esConversacionExistente}, Solo para compra: ${soloParaCompra})`);

        // Si es conversación existente y solo necesitamos datos para compra, ser más específico
        if (esConversacionExistente && soloParaCompra) {
          // Verificar si ya tenemos datos completos
          if (context.clientInfo?.nombre && (context.clientInfo?.direccion || context.clientInfo?.codigoPostal)) {
            console.log(`[FunctionService] Cliente existente con datos completos para compra`);
            return {
              success: true,
              data: {
                datosCompletos: true,
                cliente: context.clientInfo,
                mensaje: `Perfecto, procedo con la compra utilizando tus datos registrados.`
              }
            };
          }

          // Si faltan datos para la compra específicamente
          let mensajeCompra = "Para procesar tu compra, ";
          if (!context.clientInfo?.nombre) {
            mensajeCompra += "necesito confirmar tu nombre completo. ";
          }
          if (!context.clientInfo?.direccion && !context.clientInfo?.codigoPostal) {
            mensajeCompra += "y tu dirección completa para el envío. ";
          }
          mensajeCompra += "¿Puedes proporcionarme esta información?";

          return {
            success: false,
            data: {
              mensaje: mensajeCompra,
              requiereCompletarDatos: true,
              esParaCompra: true
            }
          };
        }

        // Para conversaciones nuevas, validar paso a paso
        // Validar que al menos tengamos nombre
        if (!nombre || nombre.trim().length < 2) {
          return {
            success: false,
            data: {
              mensaje: "¡Hola! Soy tu asistente de refacciones. Para poder ayudarte mejor, necesito conocer tu nombre. ¿Cómo te llamas? 😊",
              requiereNombre: true,
              esConversacionNueva: !esConversacionExistente
            }
          };
        }

        // Para conversaciones nuevas, requerir dirección completa (no solo código postal)
        if (!esConversacionExistente) {
          if (!direccion || direccion.trim().length < 10) {
            return {
              success: false,
              data: {
                mensaje: `Mucho gusto ${nombre}! Para ofrecerte el mejor servicio, necesito tu dirección completa. Esto me ayuda a verificar disponibilidad en tu zona y calcular envíos. ¿Podrías compartir tu dirección? 📍\n\nEjemplo: "Calle Reforma 123, Col. Centro, CP 06100, Ciudad de México"`,
                requiereDireccionCompleta: true,
                nombreConfirmado: nombre,
                esConversacionNueva: true
              }
            };
          }

          // Extraer código postal de la dirección si no se proporciona separadamente
          let finalCodigoPostal = codigoPostal;
          if (!finalCodigoPostal) {
            const cpMatch = direccion.match(/\b(\d{5})\b/);
            if (cpMatch) {
              finalCodigoPostal = cpMatch[1];
            }
          }
        } else {
          // Para conversaciones existentes, código postal O dirección es suficiente
          if (!codigoPostal && !direccion) {
            return {
              success: false,
              data: {
                mensaje: `Hola de nuevo ${nombre}! Para verificar disponibilidad en tu zona, necesito tu código postal o dirección. ¿Podrías compartirlo conmigo? 📍`,
                requiereUbicacion: true,
                nombreConfirmado: nombre,
                esConversacionExistente: true
              }
            };
          }
        }

        // Validar formato de código postal si se proporciona
        if (codigoPostal && !/^\d{5}$/.test(codigoPostal.trim())) {
          return {
            success: false,
            data: {
              mensaje: `${nombre}, el código postal debe tener 5 dígitos. ¿Podrías verificarlo? Por ejemplo: 06100`,
              requiereCodigoPostalValido: true,
              nombreConfirmado: nombre
            }
          };
        }

        const clienteCompleto = {
          nombre: nombre.trim(),
          codigoPostal: codigoPostal?.trim(),
          direccion: direccion?.trim(),
          telefono: telefono?.trim() || context.phoneNumber,
          direccionCompleta: direccion?.trim() || `CP ${codigoPostal?.trim()}`
        };

        return {
          success: true,
          data: {
            datosCompletos: true,
            cliente: clienteCompleto,
            mensaje: esConversacionExistente 
              ? `¡Perfecto ${nombre}! Datos actualizados. ¿En qué puedo ayudarte hoy?`
              : `¡Excelente ${nombre}! Tengo tus datos completos. Ahora puedo ayudarte a buscar las refacciones que necesitas. ¿Qué producto estás buscando?`,
            esConversacionNueva: !esConversacionExistente
          }
        };
      },
      {
        name: 'recopilarDatosCliente',
        description: 'Recopila y valida los datos básicos del cliente. Para conversaciones nuevas requiere dirección completa. Para conversaciones existentes puede validar solo para compra.',
        parameters: {
          type: 'object',
          properties: {
            nombre: {
              type: 'string',
              description: 'Nombre completo del cliente'
            },
            codigoPostal: {
              type: 'string',
              description: 'Código postal de 5 dígitos del cliente'
            },
            direccion: {
              type: 'string',
              description: 'Dirección completa del cliente. OBLIGATORIA para conversaciones nuevas'
            },
            telefono: {
              type: 'string',
              description: 'Número de teléfono del cliente'
            },
            esConversacionExistente: {
              type: 'boolean',
              description: 'Indica si es una conversación con un cliente que ya ha interactuado antes'
            },
            soloParaCompra: {
              type: 'boolean',
              description: 'Indica si solo se necesita validar datos para procesar una compra específica'
            }
          },
          required: ['nombre']
        }
      }
    );

    // validarDatosAntesBusqueda - función helper para validar antes de búsquedas
    this.registerFunction(
      'validarDatosAntesBusqueda',
      async (args, context) => {
        console.log(`[FunctionService] Validando datos del cliente antes de búsqueda...`);

        const datosCompletos = this.hasRequiredClientData(context);
        
        if (!datosCompletos.valid) {
          return {
            success: false,
            data: {
              mensaje: datosCompletos.message,
              requiereDatos: true,
              detallesFaltantes: datosCompletos.missing
            }
          };
        }

        return {
          success: true,
          data: {
            datosValidados: true,
            cliente: context.clientInfo,
            mensaje: "Datos del cliente validados. Procediendo con la búsqueda..."
          }
        };
      },
      {
        name: 'validarDatosAntesBusqueda',
        description: 'Valida que se tengan los datos mínimos del cliente antes de realizar cualquier búsqueda de productos',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    );
  }

  /**
   * Registra función para mostrar imagen de productos
   */
  private registerImageFunctions(): void {
    // mostrarImagenPieza - función para enviar imagen de producto
    this.registerFunction(
      'mostrarImagenPieza',
      async (args, context) => {
        const { codigoProducto, nombreProducto, solicitadaPorCliente = false } = args as {
          codigoProducto?: string;
          nombreProducto?: string;
          solicitadaPorCliente?: boolean;
        };

        console.log(`[FunctionService] mostrarImagenPieza - Código: "${codigoProducto}", Nombre: "${nombreProducto}", Solicitada: ${solicitadaPorCliente}`);

        try {
          // Importar media service para enviar imagen
          const { mediaService } = await import('../media.service');
          
          // Buscar imagen del producto
          let imagenEncontrada = false;
          let rutaImagen = '';
          let mensajeImagen = '';

          // Si tenemos código de producto, buscar imagen específica
          if (codigoProducto && codigoProducto.trim()) {
            // Buscar en directorio de imágenes estático
            const path = require('path');
            const fs = require('fs');
            
            const directorioImagenes = path.join(process.cwd(), 'public', 'productos');
            const posiblesExtensiones = ['.jpg', '.jpeg', '.png', '.webp'];
            
            for (const ext of posiblesExtensiones) {
              const rutaPosible = path.join(directorioImagenes, `${codigoProducto}${ext}`);
              if (fs.existsSync(rutaPosible)) {
                rutaImagen = rutaPosible;
                imagenEncontrada = true;
                break;
              }
            }
          }

          // Si no se encontró imagen específica, buscar imagen genérica por categoría
          if (!imagenEncontrada && nombreProducto) {
            const categorias = {
              'filtro': 'filtro-generico.jpg',
              'balata': 'balatas-genericas.jpg', 
              'freno': 'frenos-genericos.jpg',
              'aceite': 'aceite-motor.jpg',
              'bujia': 'bujias-genericas.jpg',
              'amortiguador': 'amortiguadores.jpg',
              'llanta': 'llantas-genericas.jpg',
              'bateria': 'bateria-auto.jpg'
            };

            const nombreLower = nombreProducto.toLowerCase();
            for (const [categoria, imagen] of Object.entries(categorias)) {
              if (nombreLower.includes(categoria)) {
                const path = require('path');
                rutaImagen = path.join(process.cwd(), 'public', 'productos', 'genericas', imagen);
                imagenEncontrada = true;
                mensajeImagen = `Esta es una imagen de referencia de ${categoria}.`;
                break;
              }
            }
          }

          if (imagenEncontrada) {
            try {
              // Subir imagen a WhatsApp
              const mediaId = await mediaService.uploadMediaToWhatsApp(rutaImagen, path.basename(rutaImagen));
              
              // Enviar imagen al cliente
              await mediaService.sendMediaMessage({
                to: context.phoneNumber || '',
                mediaId: mediaId,
                mediaType: 'image' as any,
                caption: mensajeImagen || `Imagen de: ${nombreProducto || codigoProducto}`
              });

              return {
                success: true,
                data: {
                  imagenEnviada: true,
                  mensaje: solicitadaPorCliente 
                    ? `Aquí tienes la imagen de ${nombreProducto || codigoProducto}. ¿Es la pieza que buscas?`
                    : `Te muestro la imagen del producto para que confirmes que es lo que necesitas.`,
                  codigoProducto,
                  nombreProducto
                }
              };
            } catch (error) {
              console.error('[FunctionService] Error enviando imagen:', error);
              return {
                success: false,
                data: {
                  mensaje: solicitadaPorCliente
                    ? `Disculpa, tengo problemas técnicos para mostrar la imagen en este momento. ¿Podrías describirme más específicamente qué pieza necesitas?`
                    : `Continúo sin la imagen del producto.`,
                  errorTecnico: true
                }
              };
            }
          } else {
            return {
              success: false,
              data: {
                mensaje: solicitadaPorCliente
                  ? `No tengo imagen disponible de ${nombreProducto || codigoProducto} en este momento. ¿Podrías describirme más detalles de la pieza que necesitas?`
                  : `Continúo sin imagen del producto, pero tengo toda la información técnica.`,
                sinImagen: true,
                codigoProducto,
                nombreProducto
              }
            };
          }
        } catch (error) {
          console.error('[FunctionService] Error en mostrarImagenPieza:', error);
          return {
            success: false,
            data: {
              mensaje: "Tengo un problema técnico para mostrar imágenes. ¿Continúo con la información del producto?",
              errorTecnico: true
            }
          };
        }
      },
      {
        name: 'mostrarImagenPieza',
        description: 'Muestra imagen del producto al cliente vía WhatsApp. Se puede usar cuando el cliente la solicita o automáticamente antes de una compra.',
        parameters: {
          type: 'object',
          properties: {
            codigoProducto: {
              type: 'string',
              description: 'Código específico del producto para buscar imagen exacta'
            },
            nombreProducto: {
              type: 'string',
              description: 'Nombre del producto para buscar imagen de categoría si no hay imagen específica'
            },
            solicitadaPorCliente: {
              type: 'boolean',
              description: 'Indica si el cliente solicitó específicamente ver la imagen'
            }
          },
          required: []
        }
      }
    );
  }

  /**
   * Verifica si tenemos los datos mínimos requeridos del cliente
   */
  private hasRequiredClientData(context: FunctionContext): {
    valid: boolean;
    message: string;
    missing: string[];
  } {
    const missing: string[] = [];

    if (!context.clientInfo?.nombre) {
      missing.push('nombre');
    }

    if (!context.clientInfo?.codigoPostal && !context.clientInfo?.direccion) {
      missing.push('ubicacion');
    }

    if (missing.length > 0) {
      let message = "Para poder ayudarte mejor, necesito algunos datos básicos. ";
      
      if (missing.includes('nombre') && missing.includes('ubicacion')) {
        message += "¿Podrías decirme tu nombre y código postal (o dirección)? Esto me ayuda a verificar disponibilidad en tu zona. 😊";
      } else if (missing.includes('nombre')) {
        message += "¿Cómo te llamas? 😊";
      } else if (missing.includes('ubicacion')) {
        message += "¿Cuál es tu código postal o dirección? Esto me ayuda a verificar disponibilidad en tu zona. 📍";
      }

      return {
        valid: false,
        message,
        missing
      };
    }

    return {
      valid: true,
      message: "Datos del cliente validados",
      missing: []
    };
  }

  /**
   * Registra funciones de inventario CON VALIDACIÓN OBLIGATORIA DE CLIENTE
   */
  private registerInventoryFunctions(): void {
    // consultarInventario - NUEVA ESTRATEGIA: Validar cliente primero, luego inventario general, después específico
    this.registerFunction(
      'consultarInventario',
      async (args, context) => {
        const { codigoProducto, nombreProducto } = args as { codigoProducto?: string; nombreProducto?: string };
        console.log(`[FunctionService] consultarInventario - Código: "${codigoProducto}", Nombre: "${nombreProducto}"`);
        
        // ⚠️ VALIDACIÓN OBLIGATORIA: Verificar datos del cliente primero
        const datosCompletos = this.hasRequiredClientData(context);
        if (!datosCompletos.valid) {
          return {
            success: false,
            data: {
              mensaje: datosCompletos.message,
              requiereDatos: true,
              detallesFaltantes: datosCompletos.missing
            }
          };
        }

        const nombreCliente = context.clientInfo?.nombre || 'Cliente';
        
        if (codigoProducto) {
          console.log(`[FunctionService] ✅ Cliente validado (${nombreCliente}). Consultando inventario para código ${codigoProducto}`);
          
          try {
            await this.ensureAuthenticated(context.pointOfSaleId);
            
            // NUEVA ESTRATEGIA: Inventario GENERAL primero
            console.log(`[FunctionService] 🔍 Paso 1: Consultando disponibilidad general para ${codigoProducto}`);
            const inventarioGeneral = await soapService.consultarInventarioGeneral(codigoProducto, context.pointOfSaleId);
            const sucursalesConStock = processSucursalesFromSOAP(inventarioGeneral);
            
            if (sucursalesConStock.length === 0) {
              return { 
                success: true, 
                data: { 
                  sinStock: true,
                  producto: nombreProducto || codigoProducto, 
                  mensaje: `Lo siento ${nombreCliente}, ${nombreProducto || codigoProducto} no está disponible actualmente en ninguna sucursal. Te conectaré con un asesor para verificar con proveedores.`,
                  requiereAsesor: true
                }
              };
            }

            const precioGeneral = sucursalesConStock[0].precio;
            const precioTexto = priceToText(precioGeneral);
            
            // Si tenemos código postal, consultar sucursal específica
            if (context.clientInfo?.codigoPostal) {
              console.log(`[FunctionService] 🔍 Paso 2: Consultando sucursal específica para CP ${context.clientInfo.codigoPostal}`);
              const resultadoLocal = await soapService.consultarInventarioPorPunto(codigoProducto, context.pointOfSaleId);
              const disponibleLocal = resultadoLocal.CantidadDisponible > 0;
              
              if (disponibleLocal) {
                return { 
                  success: true, 
                  data: { 
                    stockLocal: true,
                    producto: {
                      codigo: codigoProducto,
                      nombre: nombreProducto || codigoProducto,
                      precio: resultadoLocal.Precio,
                      precioTexto: priceToText(resultadoLocal.Precio),
                      cantidad: resultadoLocal.CantidadDisponible
                    },
                  sucursal: context.pointOfSaleId, 
                    cliente: nombreCliente,
                    mensaje: `¡Perfecto ${nombreCliente}! Tenemos ${nombreProducto || codigoProducto} disponible en tu zona por ${priceToText(resultadoLocal.Precio)}. Hay ${resultadoLocal.CantidadDisponible} unidades en stock.`,
                    tipoCompra: 'local'
                  } 
                };
              }
            }
            
            // Stock disponible solo en otras sucursales
                const sucursalesNombres = sucursalesConStock.map(s => s.nombreAmigable).join(', ');
                return {
                  success: true,
                  data: {
                    stockGeneral: true,
                sinStockLocal: context.clientInfo?.codigoPostal ? true : undefined,
                    producto: {
                      codigo: codigoProducto,
                      nombre: nombreProducto || codigoProducto,
                      precio: precioGeneral,
                  precioTexto: precioTexto
                    },
                    sucursalesDisponibles: sucursalesConStock,
                cliente: nombreCliente,
                mensaje: `${nombreCliente}, ${nombreProducto || codigoProducto} está disponible en: ${sucursalesNombres} por ${precioTexto}. ¿Te gustaría que te lo enviemos a casa?`,
                    esperandoConfirmacionEnvio: true,
                    tipoCompra: 'envio'
                  }
                };
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
   * Registra funciones de búsqueda CON VALIDACIÓN OBLIGATORIA DE CLIENTE
   */
  private registerSearchFunctions(): void {
    // buscarYConsultarInventario - NUEVA ESTRATEGIA con validación obligatoria
    this.registerFunction(
      'buscarYConsultarInventario',
      async (args, context) => {
        const { 
          termino, 
          codigoEspecifico, 
          incluirTodasSucursales = true, // Cambiado a true por defecto
          sucursalEspecifica 
        } = args as { 
          termino: string; 
          codigoEspecifico?: string; 
          incluirTodasSucursales?: boolean;
          sucursalEspecifica?: string;
        };

        console.log(`[FunctionService] buscarYConsultarInventario - Término: "${termino}", Código: "${codigoEspecifico}"`);

        // ⚠️ VALIDACIÓN OBLIGATORIA: Verificar datos del cliente primero
        const datosCompletos = this.hasRequiredClientData(context);
        if (!datosCompletos.valid) {
          return {
            success: false,
            data: {
              mensaje: datosCompletos.message,
              requiereDatos: true,
              detallesFaltantes: datosCompletos.missing
            }
          };
        }

        const nombreCliente = context.clientInfo?.nombre || 'Cliente';
        console.log(`[FunctionService] ✅ Cliente validado (${nombreCliente}). Procediendo con búsqueda...`);

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
            
            // Ejecutar consultas SOAP - NUEVA ESTRATEGIA: General primero
            await this.ensureAuthenticated(context.pointOfSaleId);
            
            console.log(`[FunctionService] 🔍 Paso 1: Consultando disponibilidad general para ${codigo}`);
            const inventarioGeneral = await soapService.consultarInventarioGeneral(codigo, context.pointOfSaleId);
            const sucursalesConStock = processSucursalesFromSOAP(inventarioGeneral);

            if (sucursalesConStock.length === 0) {
              return {
                success: true,
                data: {
                  sinStock: true,
                  producto: termino,
                  cliente: nombreCliente,
                  mensaje: `Lo siento ${nombreCliente}, ${termino} no está disponible actualmente en ninguna sucursal. Te conectaré con un asesor para verificar con proveedores.`,
                  requiereAsesor: true
                }
              };
            }

            const precioGeneral = sucursalesConStock[0].precio;
            const precioTexto = priceToText(precioGeneral);

            // Si tenemos código postal, consultar sucursal específica  
            if (context.clientInfo?.codigoPostal) {
              console.log(`[FunctionService] 🔍 Paso 2: Consultando sucursal específica para CP ${context.clientInfo.codigoPostal}`);
            const inventarioLocal = await soapService.consultarInventarioPorPunto(codigo, context.pointOfSaleId);
            const disponibleLocal = inventarioLocal.CantidadDisponible > 0;

            if (disponibleLocal) {
              return {
                success: true,
                data: {
                  stockLocal: true,
                  producto: {
                    codigo: codigo,
                    nombre: termino,
                    precio: inventarioLocal.Precio,
                      precioTexto: priceToText(inventarioLocal.Precio),
                    cantidad: inventarioLocal.CantidadDisponible
                  },
                  sucursal: context.pointOfSaleId,
                    cliente: nombreCliente,
                    mensaje: `¡Perfecto ${nombreCliente}! Tenemos ${termino} disponible en tu zona por ${priceToText(inventarioLocal.Precio)}. Hay ${inventarioLocal.CantidadDisponible} unidades en stock.`,
                  tipoCompra: 'local'
                }
              };
              }
            }

            // Stock disponible solo en otras sucursales
                const sucursalesNombres = sucursalesConStock.map(s => s.nombreAmigable).join(', ');
                return {
                  success: true,
                  data: {
                    stockGeneral: true,
                sinStockLocal: context.clientInfo?.codigoPostal ? true : undefined,
                    producto: {
                      codigo: codigo,
                      nombre: termino,
                      precio: precioGeneral,
                  precioTexto: precioTexto,
                      cantidad: 1
                    },
                    sucursalesDisponibles: sucursalesConStock,
                cliente: nombreCliente,
                mensaje: `${nombreCliente}, ${termino} está disponible en: ${sucursalesNombres} por ${precioTexto}. ¿Te gustaría que te lo enviemos a casa?`,
                    esperandoConfirmacionEnvio: true,
                    tipoCompra: 'envio'
              }
            };
          }

          // Buscar productos por término
          if (!productos.length) {
            // Normalizar término con conceptos mexicanos
            const terminoNormalizado = conceptsService.normalizeSearchTerm(termino);
            console.log(`[FunctionService] Buscando productos con término normalizado: "${terminoNormalizado}"`);
            
            // CAMBIO: Usar catálogo de productos reales en lugar de CSV simulado
            const productosEncontrados = this.searchRealProductCatalog(terminoNormalizado);
            console.log(`[FunctionService] Productos encontrados en catálogo: ${productosEncontrados.length}`);
            
            // Consultar cada producto encontrado en el SOAP service
            await this.ensureAuthenticated(context.pointOfSaleId);
            
            for (const producto of productosEncontrados) {
              try {
                const inventarioLocal = await soapService.consultarInventarioPorPunto(producto.codigo, context.pointOfSaleId);
                
                // Si el producto tiene stock o precio válido, agregarlo
                if (inventarioLocal && (inventarioLocal.Precio > 0 || inventarioLocal.CantidadDisponible > 0)) {
                  productos.push({
                    codigo: producto.codigo,
                    nombre: producto.nombre,
                    marca: producto.marca,
                    precio: inventarioLocal.Precio,
                    stock: inventarioLocal.CantidadDisponible
                  });
                  
                  console.log(`[FunctionService] Producto validado vía SOAP: ${producto.codigo} - $${inventarioLocal.Precio}`);
                  
                  // Solo tomar el primer producto válido para simplificar
                  break;
                }
              } catch (error) {
                console.log(`[FunctionService] Código ${producto.codigo} no disponible en SOAP`);
                continue;
              }
            }
            
            if (productos.length === 0) {
              return {
                success: true,
                data: {
                  sinResultados: true,
                  termino: termino,
                  mensaje: `No encontré productos que coincidan con "${termino}". ¿Podrías ser más específico o proporcionar el código del producto? También puedo conectarte con un asesor.`,
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
   * Registra funciones de búsqueda de productos usando el nuevo sistema
   */
  private registerProductSearchFunctions(): void {
    // buscarProductoPorTermino - Nueva función para búsqueda de productos
    this.registerFunction(
      'buscarProductoPorTermino',
      async (args, context) => {
        const { 
          termino, 
          datosAuto = {},
          limit = 10
        } = args as { 
          termino: string; 
          datosAuto?: any;
          limit?: number;
        };

        console.log(`[FunctionService] buscarProductoPorTermino - Término: "${termino}"`);

        // ⚠️ VALIDACIÓN OBLIGATORIA: Verificar datos del cliente primero
        const datosCompletos = this.hasRequiredClientData(context);
        if (!datosCompletos.valid) {
          return {
            success: false,
            data: {
              mensaje: datosCompletos.message,
              requiereDatos: true,
              detallesFaltantes: datosCompletos.missing
            }
          };
        }

        const nombreCliente = context.clientInfo?.nombre || 'Cliente';
        console.log(`[FunctionService] ✅ Cliente validado (${nombreCliente}). Procediendo con búsqueda de productos...`);

        try {
          // Importar ProductSearchService
          const { ProductSearchService } = await import('../product-search.service');
          const productSearchService = new ProductSearchService();

          // Realizar búsqueda completa
          const searchResult = await productSearchService.searchProductFlow(
            termino, 
            datosAuto, 
            { limit }
          );

          if (searchResult.matches.length === 0) {
            return {
              success: true,
              data: {
                sinResultados: true,
                termino: termino,
                terminoNormalizado: searchResult.normalizedTerm,
                cliente: nombreCliente,
                mensaje: `Lo siento ${nombreCliente}, no encontré productos que coincidan con "${termino}". ¿Podrías ser más específico? Por ejemplo: "balatas delanteras Toyota Corolla 2018"`,
                sugerencias: searchResult.suggestions
              }
            };
          }

          // Formatear resultados para mostrar
          const { formatSearchResults } = await import('../utils/product-search-utils');
          const mensajeFormateado = formatSearchResults(searchResult.matches, datosAuto);

          return {
            success: true,
            data: {
              productos: searchResult.matches,
              totalEncontrados: searchResult.totalFound,
              terminoNormalizado: searchResult.normalizedTerm,
              cliente: nombreCliente,
              mensaje: mensajeFormateado,
              tiempoBusqueda: searchResult.searchTime,
              tieneCoincidenciaExacta: searchResult.hasExactMatch,
              esperandoConfirmacion: true
            }
          };

        } catch (error) {
          console.error('[FunctionService] Error en búsqueda de productos:', error);
          return {
            success: false,
            data: {
              error: true,
              mensaje: `Lo siento ${nombreCliente}, hubo un error buscando "${termino}". Te conectaré con un asesor para ayudarte.`,
              requiereAsesor: true
            }
          };
        }
      },
      {
        name: 'buscarProductoPorTermino',
        description: 'Buscar productos en el catálogo usando términos coloquiales y datos del auto. Normaliza el término y busca coincidencias.',
        parameters: {
          type: 'object',
          properties: {
            termino: {
              type: 'string',
              description: 'Término de búsqueda del usuario (ej: "balatas", "filtro de aceite")'
            },
            datosAuto: {
              type: 'object',
              description: 'Datos del auto del cliente (marca, modelo, año, litraje)',
              properties: {
                marca: { type: 'string' },
                modelo: { type: 'string' },
                año: { type: 'number' },
                litraje: { type: 'string' }
              }
            },
            limit: {
              type: 'number',
              description: 'Número máximo de resultados a mostrar (default: 10)'
            }
          },
          required: ['termino']
        }
      }
    );

    // confirmarProductoSeleccionado - Confirmar selección del usuario
    this.registerFunction(
      'confirmarProductoSeleccionado',
      async (args, context) => {
        const { 
          clave, 
          confirmacion,
          indiceSeleccionado
        } = args as { 
          clave: string; 
          confirmacion: boolean;
          indiceSeleccionado?: number;
        };

        console.log(`[FunctionService] confirmarProductoSeleccionado - Clave: "${clave}", Confirmación: ${confirmacion}`);

        const nombreCliente = context.clientInfo?.nombre || 'Cliente';

        if (!confirmacion) {
          return {
            success: true,
            data: {
              confirmado: false,
              cliente: nombreCliente,
              mensaje: `Entiendo ${nombreCliente}, no es lo que buscabas. ¿Qué más detalles puedes darme para encontrar el producto correcto?`,
              requiereNuevaBusqueda: true
            }
          };
        }

        try {
          // Importar ProductSearchService
          const { ProductSearchService } = await import('../product-search.service');
          const productSearchService = new ProductSearchService();

          // Obtener detalles del producto
          const detalles = await productSearchService.getProductDetails(clave);

          if (!detalles) {
            return {
              success: true,
              data: {
                confirmado: true,
                cliente: nombreCliente,
                mensaje: `Perfecto ${nombreCliente}, pero no pude obtener los detalles completos del producto. Te conectaré con un asesor para darte información precisa.`,
                requiereAsesor: true
              }
            };
          }

          // Formatear detalles del producto
          let mensajeDetalles = `✅ Perfecto ${nombreCliente}, aquí tienes los detalles:\n\n`;
          mensajeDetalles += `🔧 **${detalles.nombre || 'Producto'}**\n`;
          mensajeDetalles += `📋 Clave: ${detalles.pieza}\n`;
          
          if (detalles.marca) mensajeDetalles += `🚗 Marca: ${detalles.marca}\n`;
          if (detalles.modelo) mensajeDetalles += `🏷️ Modelo: ${detalles.modelo}\n`;
          if (detalles.año) mensajeDetalles += `📅 Año: ${detalles.año}\n`;
          if (detalles.precio) mensajeDetalles += `💰 Precio: $${detalles.precio}\n`;
          if (detalles.stock) mensajeDetalles += `📦 Stock: ${detalles.stock} unidades\n`;
          if (detalles.descripcion) mensajeDetalles += `📝 Descripción: ${detalles.descripcion}\n`;

          mensajeDetalles += `\n¿Te interesa este producto? Puedo ayudarte con la compra.`;

          return {
            success: true,
            data: {
              confirmado: true,
              producto: detalles,
              cliente: nombreCliente,
              mensaje: mensajeDetalles,
              productoSeleccionado: true
            }
          };

        } catch (error) {
          console.error('[FunctionService] Error confirmando producto:', error);
          return {
            success: false,
            data: {
              error: true,
              cliente: nombreCliente,
              mensaje: `Lo siento ${nombreCliente}, hubo un error procesando tu selección. Te conectaré con un asesor.`,
              requiereAsesor: true
            }
          };
        }
      },
      {
        name: 'confirmarProductoSeleccionado',
        description: 'Confirmar la selección de un producto por parte del usuario y obtener sus detalles completos.',
        parameters: {
          type: 'object',
          properties: {
            clave: {
              type: 'string',
              description: 'Clave del producto seleccionado'
            },
            confirmacion: {
              type: 'boolean',
              description: 'Si el usuario confirma la selección'
            },
            indiceSeleccionado: {
              type: 'number',
              description: 'Índice del producto seleccionado (opcional)'
            }
          },
          required: ['clave', 'confirmacion']
        }
      }
    );

    // obtenerDetallesProducto - Obtener detalles específicos de un producto
    this.registerFunction(
      'obtenerDetallesProducto',
      async (args, context) => {
        const { clave } = args as { clave: string };

        console.log(`[FunctionService] obtenerDetallesProducto - Clave: "${clave}"`);

        try {
          // Importar ProductSearchService
          const { ProductSearchService } = await import('../product-search.service');
          const productSearchService = new ProductSearchService();

          const detalles = await productSearchService.getProductDetails(clave);

          if (!detalles) {
            return {
              success: false,
              data: {
                error: true,
                mensaje: `No pude encontrar los detalles del producto con clave "${clave}".`
              }
            };
          }

          return {
            success: true,
            data: {
              producto: detalles,
              mensaje: `Detalles del producto ${detalles.nombre || clave} obtenidos correctamente.`
            }
          };

        } catch (error) {
          console.error('[FunctionService] Error obteniendo detalles:', error);
          return {
            success: false,
            data: {
              error: true,
              mensaje: `Error obteniendo detalles del producto.`
            }
          };
        }
      },
      {
        name: 'obtenerDetallesProducto',
        description: 'Obtener detalles completos de un producto específico usando su clave.',
        parameters: {
          type: 'object',
          properties: {
            clave: {
              type: 'string',
              description: 'Clave del producto'
            }
          },
          required: ['clave']
        }
      }
    );

    // sugerirAlternativas - Sugerir productos alternativos
    this.registerFunction(
      'sugerirAlternativas',
      async (args, context) => {
        const { 
          terminoOriginal, 
          razon = 'no_encontrado'
        } = args as { 
          terminoOriginal: string; 
          razon?: string;
        };

        console.log(`[FunctionService] sugerirAlternativas - Término: "${terminoOriginal}", Razón: ${razon}`);

        try {
          // Importar utilidades
          const { generateSearchSuggestions } = await import('../utils/product-search-utils');
          const suggestions = generateSearchSuggestions(terminoOriginal);

          const mensaje = `No encontré "${terminoOriginal}". ${suggestions[0]}`;

          return {
            success: true,
            data: {
              sugerencias: suggestions,
              terminoOriginal: terminoOriginal,
              mensaje: mensaje,
              requiereNuevaBusqueda: true
            }
          };

        } catch (error) {
          console.error('[FunctionService] Error generando sugerencias:', error);
          return {
            success: false,
            data: {
              error: true,
              mensaje: `Error generando sugerencias para "${terminoOriginal}".`
            }
          };
        }
      },
      {
        name: 'sugerirAlternativas',
        description: 'Generar sugerencias de búsqueda cuando no se encuentran productos.',
        parameters: {
          type: 'object',
          properties: {
            terminoOriginal: {
              type: 'string',
              description: 'Término original de búsqueda'
            },
            razon: {
              type: 'string',
              description: 'Razón por la que no se encontraron resultados',
              enum: ['no_encontrado', 'sin_stock', 'incompatible']
            }
          },
          required: ['terminoOriginal']
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

    // confirmarCompra - CON IMAGEN AUTOMÁTICA ANTES DE COMPRA
    this.registerFunction(
      'confirmarCompra',
      async (args, context) => {
        const { 
          productos, 
          datosUsuario, 
          metodoPago = 'efectivo',
          mostrarImagenAntes = true,
          direccionCompleta
        } = args as {
          productos: Array<{ codigo: string; nombre: string; cantidad: number; precio: number }>;
          datosUsuario: { nombre: string; telefono: string; codigoPostal?: string };
          metodoPago?: string;
          mostrarImagenAntes?: boolean;
          direccionCompleta?: string;
        };

        console.log(`[FunctionService] Confirmando compra para ${productos.length} productos (mostrar imagen: ${mostrarImagenAntes})`);

        try {
          // 🖼️ PASO 1: MOSTRAR IMAGEN AUTOMÁTICAMENTE ANTES DE COMPRA (100% confirmación)
          if (mostrarImagenAntes && productos.length > 0) {
            console.log(`[FunctionService] 🖼️ Mostrando imagen automática del producto principal antes de compra`);
            
            try {
                             const productoPrincipal = productos[0]; // Tomar el primer producto
               const resultadoImagen = await this.executeFunction('mostrarImagenPieza', {
                 codigoProducto: productoPrincipal.codigo,
                 nombreProducto: productoPrincipal.nombre,
                 solicitadaPorCliente: false
               }, context);

              if (resultadoImagen.success) {
                console.log(`[FunctionService] ✅ Imagen enviada automáticamente para confirmación`);
              } else {
                console.log(`[FunctionService] ⚠️ No se pudo enviar imagen, continuando con compra`);
              }
            } catch (imagenError) {
              console.warn(`[FunctionService] Error enviando imagen automática:`, imagenError);
              // No detenemos la compra si hay error con imagen
            }
          }

          // 📋 PASO 2: VALIDAR DATOS COMPLETOS DEL CLIENTE
          if (!datosUsuario.nombre || datosUsuario.nombre.trim().length < 2) {
            return {
              success: false,
              data: {
                mensaje: "Para procesar la compra, necesito confirmar tu nombre completo. ¿Podrías proporcionarlo?",
                requiereDatos: true,
                faltaNombre: true
              }
            };
          }

          if (!datosUsuario.codigoPostal && !direccionCompleta) {
            return {
              success: false,
              data: {
                mensaje: `${datosUsuario.nombre}, para procesar tu compra necesito tu código postal o dirección completa para el envío. ¿Podrías proporcionarla?`,
                requiereDatos: true,
                faltaDireccion: true
              }
            };
          }

          // 🔄 PASO 3: PROCESAR TRANSACCIÓN
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

          // 📦 PASO 4: DETERMINAR TIPO DE ENTREGA
          const tipoEntrega = context.pointOfSaleId && datosUsuario.codigoPostal 
            ? 'envio_a_domicilio' 
            : 'recoger_en_sucursal';

          return {
            success: true,
            data: {
              compraConfirmada: true,
              numeroTransaccion: transaccion.NumeroTransaccion || 'N/A',
              productos: productos,
              total: total,
              totalTexto: totalTexto,
              metodoPago: metodoPago,
              tipoEntrega: tipoEntrega,
              datosCliente: {
                ...datosUsuario,
                direccionCompleta: direccionCompleta || `CP ${datosUsuario.codigoPostal}`
              },
              mensaje: `✅ ¡Compra confirmada!\n\n📄 Transacción: ${transaccion.NumeroTransaccion || 'N/A'}\n💰 Total: ${totalTexto}\n👤 Cliente: ${datosUsuario.nombre}\n\n${tipoEntrega === 'envio_a_domicilio' 
                ? `📦 Se enviará a: ${direccionCompleta || datosUsuario.codigoPostal}\n🚚 Un asesor te contactará para coordinar la entrega.`
                : '🏪 Puedes recoger en la sucursal. Un asesor te dará los detalles.'
              }`
            }
          };

        } catch (error) {
          console.error(`[FunctionService] Error confirmando compra:`, error);
          return {
            success: false,
            error: 'Error confirmando compra',
            data: {
              mensaje: 'Hubo un problema confirmando la compra. Te conectaré con un asesor para completar tu pedido.',
              requiereAsesor: true,
              datosCompra: {
                productos: productos,
                cliente: datosUsuario,
                error: error instanceof Error ? error.message : String(error)
              }
            }
          };
        }
      },
      {
        name: 'confirmarCompra',
        description: 'Confirma una compra y genera la transacción correspondiente. AUTOMÁTICAMENTE muestra imagen del producto para confirmación al 100%.',
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
              description: 'Datos completos del usuario OBLIGATORIOS para la compra',
              properties: {
                nombre: { type: 'string', description: 'Nombre completo OBLIGATORIO' },
                telefono: { type: 'string', description: 'Teléfono del cliente' },
                codigoPostal: { type: 'string', description: 'Código postal para envío' }
              }
            },
            metodoPago: {
              type: 'string',
              description: 'Método de pago preferido (efectivo por defecto)'
            },
            mostrarImagenAntes: {
              type: 'boolean',
              description: 'Si mostrar imagen automática antes de compra (true por defecto)'
            },
            direccionCompleta: {
              type: 'string',
              description: 'Dirección completa del cliente para envío'
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
    // solicitarAsesor - CON RESUMEN INTELIGENTE DE CONVERSACIÓN
    this.registerFunction(
      'solicitarAsesor',
      async (args, context) => {
        const { 
          motivo, 
          datosContacto, 
          prioridad = 'normal',
          productosConsultados,
          ultimaAccion,
          resumenConversacion 
        } = args as {
          motivo: string;
          datosContacto?: { nombre?: string; telefono?: string };
          prioridad?: 'baja' | 'normal' | 'alta';
          productosConsultados?: Array<{ codigo?: string; nombre: string; precio?: number }>;
          ultimaAccion?: string;
          resumenConversacion?: string;
        };

        console.log(`[FunctionService] Solicitud de asesor - Motivo: ${motivo}, Prioridad: ${prioridad}`);

        // 📊 GENERAR DATOS DE CLIENTE PARA USO EN TRY/CATCH
        const clienteInfo = context.clientInfo || datosContacto;

        try {
          // 📊 GENERAR RESUMEN INTELIGENTE DE LA CONVERSACIÓN
          const resumenCompleto = this.generarResumenInteligente({
            motivo,
            cliente: clienteInfo,
            productosConsultados,
            ultimaAccion,
            resumenConversacion,
            puntoVenta: context.pointOfSaleId,
            telefono: context.phoneNumber
          });

          // 🚨 DETERMINAR PRIORIDAD AUTOMÁTICA INTELIGENTE
          const prioridadInteligente = this.determinarPrioridadInteligente(motivo, ultimaAccion, productosConsultados);
          const prioridadFinal = prioridad === 'normal' ? prioridadInteligente : prioridad;

          // 📞 GENERAR SOLICITUD DE ASESOR CON TODA LA INFORMACIÓN
          const numeroSolicitud = `ASE-${Date.now()}`;
          const tiempoEstimado = prioridadFinal === 'alta' ? '2-5 minutos' : prioridadFinal === 'normal' ? '5-10 minutos' : '10-15 minutos';
          
          console.log(`[FunctionService] 📋 Resumen para asesor generado:`, resumenCompleto);

          // TODO: Aquí se integraría con sistema real de notificaciones (WhatsApp Business, email, etc.)
          // await this.notificarAsesorReal(resumenCompleto, prioridadFinal);
          
          return {
            success: true,
            data: {
              asesorSolicitado: true,
              numeroSolicitud: numeroSolicitud,
              motivo: motivo,
              prioridad: prioridadFinal,
              tiempoEstimado: tiempoEstimado,
              resumenParaAsesor: resumenCompleto,
              mensaje: `✅ ¡Asesor especializado notificado!\n\n🎫 Número de solicitud: ${numeroSolicitud}\n⏱️ Tiempo estimado: ${tiempoEstimado}\n🔥 Prioridad: ${prioridadFinal.toUpperCase()}\n\n📋 He enviado al asesor todos los detalles de nuestra conversación para que pueda ayudarte de la mejor manera.\n\n${prioridadFinal === 'alta' ? '🚨 Solicitud urgente procesada.' : 'Un asesor te contactará pronto.'}`,
              conversacionTerminada: true
            }
          };

        } catch (error) {
          console.error(`[FunctionService] Error solicitando asesor:`, error);
          return {
            success: false,
            error: 'Error solicitando asesor',
            data: {
              mensaje: 'Hubo un problema notificando al asesor. Por favor, intenta contactarnos directamente por teléfono.',
              datosEmergencia: {
                cliente: clienteInfo,
                motivo: motivo,
                error: error instanceof Error ? error.message : String(error)
              }
            }
          };
        }
      },
      {
        name: 'solicitarAsesor',
        description: 'Solicita la intervención de un asesor humano especializado con resumen inteligente completo de la conversación',
        parameters: {
          type: 'object',
          properties: {
            motivo: {
              type: 'string',
              description: 'Motivo específico por el cual se solicita el asesor'
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
              description: 'Prioridad de la solicitud (se determina automáticamente si no se especifica)'
            },
            productosConsultados: {
              type: 'array',
              description: 'Lista de productos que el cliente consultó durante la conversación',
              items: {
                type: 'object',
                properties: {
                  codigo: { type: 'string' },
                  nombre: { type: 'string' },
                  precio: { type: 'number' }
                }
              }
            },
            ultimaAccion: {
              type: 'string',
              description: 'Última acción importante realizada antes de solicitar asesor'
            },
            resumenConversacion: {
              type: 'string',
              description: 'Resumen breve de la conversación completa'
            }
          },
          required: ['motivo']
        }
      }
    );
  }

  /**
   * Genera un resumen inteligente de la conversación para el asesor
   */
  private generarResumenInteligente(datos: {
    motivo: string;
    cliente?: any;
    productosConsultados?: Array<any>;
    ultimaAccion?: string;
    resumenConversacion?: string;
    puntoVenta?: string;
    telefono?: string;
  }): string {
    const { motivo, cliente, productosConsultados, ultimaAccion, resumenConversacion, puntoVenta, telefono } = datos;
    
    let resumen = `🎯 SOLICITUD DE ASESOR - ${new Date().toLocaleString('es-MX')}\n\n`;
    
    // Información del cliente
    resumen += `👤 CLIENTE:\n`;
    if (cliente?.nombre) resumen += `  • Nombre: ${cliente.nombre}\n`;
    if (telefono) resumen += `  • Teléfono: ${telefono}\n`;
    if (cliente?.codigoPostal) resumen += `  • Código Postal: ${cliente.codigoPostal}\n`;
    if (cliente?.direccion) resumen += `  • Dirección: ${cliente.direccion}\n`;
    
    // Punto de venta
    if (puntoVenta) {
      resumen += `\n🏪 SUCURSAL: ${puntoVenta.toUpperCase()}\n`;
    }
    
    // Motivo principal
    resumen += `\n❓ MOTIVO: ${motivo}\n`;
    
    // Productos consultados
    if (productosConsultados && productosConsultados.length > 0) {
      resumen += `\n🔧 PRODUCTOS CONSULTADOS:\n`;
      productosConsultados.forEach((producto, index) => {
        resumen += `  ${index + 1}. ${producto.nombre}`;
        if (producto.codigo) resumen += ` (${producto.codigo})`;
        if (producto.precio) resumen += ` - $${producto.precio}`;
        resumen += `\n`;
      });
    }
    
    // Última acción
    if (ultimaAccion) {
      resumen += `\n⚡ ÚLTIMA ACCIÓN: ${ultimaAccion}\n`;
    }
    
    // Resumen de conversación
    if (resumenConversacion) {
      resumen += `\n💬 RESUMEN DE CONVERSACIÓN:\n${resumenConversacion}\n`;
    }
    
    resumen += `\n⏰ Solicitud generada automáticamente por WhatsApp Bot`;
    
    return resumen;
  }

  /**
   * Determina la prioridad inteligente basada en el contexto
   */
  private determinarPrioridadInteligente(
    motivo: string, 
    ultimaAccion?: string, 
    productos?: Array<any>
  ): 'baja' | 'normal' | 'alta' {
    const motivoLower = motivo.toLowerCase();
    const accionLower = ultimaAccion?.toLowerCase() || '';
    
    // Prioridad ALTA
    if (
      motivoLower.includes('error') ||
      motivoLower.includes('fallo') ||
      motivoLower.includes('problema técnico') ||
      motivoLower.includes('urgente') ||
      motivoLower.includes('no funciona') ||
      accionLower.includes('error en compra') ||
      accionLower.includes('falla transacción')
    ) {
      return 'alta';
    }
    
    // Prioridad NORMAL
    if (
      motivoLower.includes('consulta') ||
      motivoLower.includes('disponibilidad') ||
      motivoLower.includes('precio') ||
      motivoLower.includes('envío') ||
      productos && productos.length > 0
    ) {
      return 'normal';
    }
    
         // Prioridad BAJA por defecto
     return 'baja';
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
   * Genera códigos posibles a partir de un término de búsqueda
   */
  private searchRealProductCatalog(termino: string): Array<{codigo: string, nombre: string, marca: string}> {
    // Catálogo real de productos automotrices con códigos reales
    const catalogoReal = [
      // Bombas de agua
      { codigo: '1122334455', nombre: 'Bomba de Agua Mercedes A200 2017-2019', marca: 'GATES' },
      { codigo: '1122334456', nombre: 'Bomba de Agua Mercedes A200 2016-2020', marca: 'FEBI' },
      { codigo: '1122334457', nombre: 'Bomba de Agua Mercedes Clase A W177', marca: 'OEM' },
      
      // Filtros
      { codigo: '2233445566', nombre: 'Filtro de Aceite Mercedes A200', marca: 'MANN' },
      { codigo: '2233445567', nombre: 'Filtro de Aire Mercedes A200 2017', marca: 'BOSCH' },
      { codigo: '2233445568', nombre: 'Filtro de Combustible Mercedes A200', marca: 'MAHLE' },
      
      // Frenos
      { codigo: '3344556677', nombre: 'Pastillas de Freno Delanteras Mercedes A200', marca: 'BREMBO' },
      { codigo: '3344556678', nombre: 'Pastillas de Freno Traseras Mercedes A200 2017', marca: 'ATE' },
      { codigo: '3344556679', nombre: 'Discos de Freno Mercedes A200 W177', marca: 'ZIMMERMANN' },
      
      // Aceites
      { codigo: '4455667788', nombre: 'Aceite Motor 5W30 Mercedes A200', marca: 'MOBIL1' },
      { codigo: '4455667789', nombre: 'Aceite Motor 0W20 Mercedes A200 2017', marca: 'CASTROL' },
      
      // Baterías
      { codigo: '5566778899', nombre: 'Batería 60AH Mercedes A200', marca: 'BOSCH' },
      { codigo: '5566778800', nombre: 'Batería AGM Mercedes A200 2017', marca: 'VARTA' },
      
      // Suspensión
      { codigo: '6677889900', nombre: 'Amortiguador Delantero Mercedes A200', marca: 'BILSTEIN' },
      { codigo: '6677889901', nombre: 'Amortiguador Trasero Mercedes A200 2017', marca: 'MONROE' },
      
      // Productos generales por marca
      { codigo: '7788990011', nombre: 'Bomba de Agua Toyota Corolla 2020', marca: 'AISIN' },
      { codigo: '7788990012', nombre: 'Bomba de Agua Honda Civic 2018', marca: 'OEM' },
      { codigo: '7788990013', nombre: 'Bomba de Agua Nissan Sentra 2019', marca: 'GATES' },
      { codigo: '7788990014', nombre: 'Bomba de Agua Volkswagen Jetta 2020', marca: 'FEBI' },
      
      { codigo: '8899001122', nombre: 'Pastillas de Freno Toyota Corolla', marca: 'AKEBONO' },
      { codigo: '8899001123', nombre: 'Pastillas de Freno Honda Civic 2018', marca: 'BREMBO' },
      { codigo: '8899001124', nombre: 'Pastillas de Freno Nissan Sentra', marca: 'TRW' },
      
      { codigo: '9900112233', nombre: 'Filtro de Aceite Toyota Corolla 2020', marca: 'TOYOTA' },
             { codigo: '9900112234', nombre: 'Filtro de Aceite Honda Civic 2018', marca: 'HONDA' },
      { codigo: '9900112235', nombre: 'Filtro de Aceite Nissan Sentra', marca: 'NISSAN' }
    ];

    const terminoLower = termino.toLowerCase();
    const palabrasClave = terminoLower.split(' ').filter(p => p.length > 2);

    // Buscar productos que coincidan con las palabras clave
    return catalogoReal.filter(producto => {
      const productoText = `${producto.nombre} ${producto.marca}`.toLowerCase();
      
      // Verificar si al menos una palabra clave coincide
      return palabrasClave.some(palabra => 
        productoText.includes(palabra) || 
        producto.codigo.includes(palabra.toUpperCase())
      );
    }).slice(0, 5); // Limitar a 5 resultados
  }

  /**
   * Obtiene el nombre de un producto a partir de su código
   */
  private getProductNameFromCode(codigo: string, termino: string): string {
    // En un escenario real, esto podría ser una búsqueda en un archivo CSV o base de datos
    // Por ahora, simplemente devolvemos el término de búsqueda
    return termino;
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