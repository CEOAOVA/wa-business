import type {
  FunctionResult,
  FunctionContext,
  CollectClientDataArgs,
  GenerateQuoteArgs,
  ValidateVehicleDataArgs,
  OpenRouterTool,
  VehicleInfo,
  ClientInfo,
  DataCollectionStatus
} from '../types/chatbot';

/**
 * Servicio de funciones específicas para repuestos automotrices
 * Maneja la recopilación de datos del cliente y vehículo
 */
export class AutopartsFunctionService {
  private readonly functionDefinitions: Map<string, OpenRouterTool> = new Map();
  private readonly functionHandlers: Map<string, (args: any, context: FunctionContext) => Promise<FunctionResult>> = new Map();

  constructor() {
    this.registerAllFunctions();
  }

  /**
   * Registrar todas las funciones disponibles
   */
  private registerAllFunctions(): void {
    // Función para guardar información del vehículo completa
    this.registerFunction(
      'guardar_info_vehiculo',
      this.handleSaveVehicleInfo.bind(this),
      {
        type: 'function',
        function: {
          name: 'guardar_info_vehiculo',
          description: 'Guarda toda la información del vehículo que el cliente proporcione. Puedes enviar los campos que tengas disponibles.',
          parameters: {
            type: 'object',
            properties: {
              marca: {
                type: 'string',
                description: 'Marca del vehículo (Toyota, Honda, Ford, etc.)'
              },
              modelo: {
                type: 'string', 
                description: 'Modelo del vehículo (Corolla, Civic, Focus, etc.)'
              },
              año: {
                type: 'number',
                description: 'Año del vehículo'
              },
              litraje: {
                type: 'string',
                description: 'Litraje del motor (1.6L, 2.0L, etc.)'
              },
              numeroSerie: {
                type: 'string',
                description: 'Número de serie del motor'
              },
              modeloEspecial: {
                type: 'string',
                description: 'Variante especial (Sport, Turbo, Hybrid, etc.)'
              }
            }
          }
        }
      }
    );

    // Función para guardar datos básicos del cliente
    this.registerFunction(
      'guardar_info_cliente',
      this.handleSaveClientInfo.bind(this),
      {
        type: 'function',
        function: {
          name: 'guardar_info_cliente',
          description: 'Guarda la información básica del cliente',
          parameters: {
            type: 'object',
            properties: {
              nombre: {
                type: 'string',
                description: 'Nombre del cliente'
              },
              pieza: {
                type: 'string',
                description: 'Qué refacción o pieza necesita'
              }
            }
          }
        }
      }
    );

    // Función unificada que acepta cualquier combinación de datos
    this.registerFunction(
      'guardar_informacion',
      this.handleSaveAnyInfo.bind(this),
      {
        type: 'function',
        function: {
          name: 'guardar_informacion',
          description: 'Guarda cualquier información del cliente y/o vehículo que se proporcione',
          parameters: {
            type: 'object',
            properties: {
              // Datos del cliente
              nombre: {
                type: 'string',
                description: 'Nombre del cliente'
              },
              pieza: {
                type: 'string',
                description: 'Qué refacción necesita'
              },
              // Datos del vehículo
              marca: {
                type: 'string',
                description: 'Marca del vehículo'
              },
              modelo: {
                type: 'string', 
                description: 'Modelo del vehículo'
              },
              año: {
                type: 'number',
                description: 'Año del vehículo'
              },
              litraje: {
                type: 'string',
                description: 'Litraje del motor'
              },
              numeroSerie: {
                type: 'string',
                description: 'Número de serie del motor'
              },
              modeloEspecial: {
                type: 'string',
                description: 'Variante especial del modelo'
              }
            }
          }
        }
      }
    );

    // Función para validar datos del vehículo
    this.registerFunction(
      'validar_datos_vehiculo',
      this.handleValidateVehicleData.bind(this),
      {
        type: 'function',
        function: {
          name: 'validar_datos_vehiculo',
          description: 'Valida que los datos del vehículo sean coherentes entre sí',
          parameters: {
            type: 'object',
            properties: {
              vehiculo: {
                type: 'object',
                properties: {
                  marca: { type: 'string' },
                  modelo: { type: 'string' },
                  año: { type: 'number' },
                  litraje: { type: 'string' },
                  numeroSerie: { type: 'string' },
                  modeloEspecial: { type: 'string' }
                },
                required: ['marca', 'modelo', 'año']
              }
            },
            required: ['vehiculo']
          }
        }
      }
    );

    // Función para generar cotización preliminar
    this.registerFunction(
      'generar_cotizacion',
      this.handleGenerateQuote.bind(this),
      {
        type: 'function',
        function: {
          name: 'generar_cotizacion',
          description: 'Genera una cotización preliminar de refacciones basada en la información recopilada',
          parameters: {
            type: 'object',
            properties: {
              clientInfo: {
                type: 'object',
                properties: {
                  nombre: { type: 'string' },
                  piezaNecesaria: { type: 'string' },
                  vehiculo: {
                    type: 'object',
                    properties: {
                      marca: { type: 'string' },
                      modelo: { type: 'string' },
                      año: { type: 'number' },
                      litraje: { type: 'string' },
                      numeroSerie: { type: 'string' },
                      modeloEspecial: { type: 'string' }
                    }
                  }
                }
              },
              includeAlternatives: {
                type: 'boolean',
                description: 'Si incluir repuestos alternativos en la cotización'
              }
            },
            required: ['clientInfo']
          }
        }
      }
    );

    // Función para determinar próximo paso en la recopilación
    this.registerFunction(
      'determinar_proximo_paso',
      this.handleDetermineNextStep.bind(this),
      {
        type: 'function',
        function: {
          name: 'determinar_proximo_paso',
          description: 'Determina qué información falta recopilar del cliente',
          parameters: {
            type: 'object',
            properties: {
              clientInfo: {
                type: 'object',
                properties: {
                  nombre: { type: 'string' },
                  piezaNecesaria: { type: 'string' },
                  vehiculo: { type: 'object' }
                }
              }
            },
            required: ['clientInfo']
          }
        }
      }
    );
  }

  /**
   * Guardar información completa del vehículo
   */
  private async handleSaveVehicleInfo(args: any, context: FunctionContext): Promise<FunctionResult> {
    const { marca, modelo, año, litraje, numeroSerie, modeloEspecial } = args;
    const { currentClientInfo } = context;

    console.log('[AutopartsFunctions] Guardando info del vehículo:', args);

    let updatedClientInfo = { ...currentClientInfo };
    let updatedFields: string[] = [];

    // Inicializar objeto vehículo si no existe
    if (!updatedClientInfo.vehiculo) {
      updatedClientInfo.vehiculo = {
        marca: '',
        modelo: '',
        año: 0,
        litraje: '',
        numeroSerie: '',
        modeloEspecial: ''
      };
    }

    // Actualizar campos del vehículo que se proporcionaron
    if (marca && typeof marca === 'string') {
      updatedClientInfo.vehiculo.marca = this.normalizeBrand(marca.trim());
      updatedFields.push('marca');
    }

    if (modelo && typeof modelo === 'string') {
      updatedClientInfo.vehiculo.modelo = modelo.trim();
      updatedFields.push('modelo');
    }

    if (año && (typeof año === 'number' || !isNaN(parseInt(año.toString())))) {
      const yearNum = typeof año === 'number' ? año : parseInt(año.toString());
      if (yearNum >= 1990 && yearNum <= new Date().getFullYear() + 1) {
        updatedClientInfo.vehiculo.año = yearNum;
        updatedFields.push('año');
      }
    }

    if (litraje && typeof litraje === 'string') {
      const normalizedEngine = this.normalizeEngineSize(litraje.trim());
      if (normalizedEngine) {
        updatedClientInfo.vehiculo.litraje = normalizedEngine;
        updatedFields.push('litraje');
      }
    }

    if (numeroSerie && typeof numeroSerie === 'string' && numeroSerie.trim().length >= 5) {
      updatedClientInfo.vehiculo.numeroSerie = numeroSerie.trim();
      updatedFields.push('numeroSerie');
    }

    if (modeloEspecial && typeof modeloEspecial === 'string') {
      updatedClientInfo.vehiculo.modeloEspecial = modeloEspecial.trim();
      updatedFields.push('modeloEspecial');
    }

    if (updatedFields.length === 0) {
      return {
        success: false,
        error: 'No se proporcionó información válida del vehículo',
        message: 'Por favor proporciona datos válidos del vehículo.'
      };
    }

    return {
      success: true,
      data: {
        updatedFields,
        clientInfo: updatedClientInfo
      },
      message: `✅ Información del vehículo guardada: ${updatedFields.join(', ')}`
    };
  }

  /**
   * Guardar información básica del cliente
   */
  private async handleSaveClientInfo(args: any, context: FunctionContext): Promise<FunctionResult> {
    const { nombre, pieza } = args;
    const { currentClientInfo } = context;

    console.log('[AutopartsFunctions] Guardando info del cliente:', args);

    let updatedClientInfo = { ...currentClientInfo };
    let updatedFields: string[] = [];

    if (nombre && typeof nombre === 'string' && nombre.trim().length >= 2) {
      updatedClientInfo.nombre = nombre.trim();
      updatedFields.push('nombre');
    }

    if (pieza && typeof pieza === 'string' && pieza.trim().length >= 3) {
      updatedClientInfo.piezaNecesaria = pieza.trim();
      updatedFields.push('refacción');
    }

    if (updatedFields.length === 0) {
      return {
        success: false,
        error: 'No se proporcionó información válida del cliente',
        message: 'Por favor proporciona un nombre válido y/o describe qué refacción necesitas.'
      };
    }

    return {
      success: true,
      data: {
        updatedFields,
        clientInfo: updatedClientInfo
      },
      message: `✅ Información del cliente guardada: ${updatedFields.join(', ')}`
    };
  }

  /**
   * Guardar cualquier información (cliente y/o vehículo) en una sola llamada
   */
  private async handleSaveAnyInfo(args: any, context: FunctionContext): Promise<FunctionResult> {
    const { nombre, pieza, marca, modelo, año, litraje, numeroSerie, modeloEspecial } = args;
    const { currentClientInfo } = context;

    console.log('[AutopartsFunctions] Guardando información mixta:', args);

    let updatedClientInfo = { ...currentClientInfo };
    let updatedFields: string[] = [];

    // Inicializar objeto vehículo si no existe
    if (!updatedClientInfo.vehiculo) {
      updatedClientInfo.vehiculo = {
        marca: '',
        modelo: '',
        año: 0,
        litraje: '',
        numeroSerie: '',
        modeloEspecial: ''
      };
    }

    // Procesar datos del cliente
    if (nombre && typeof nombre === 'string' && nombre.trim().length >= 2) {
      updatedClientInfo.nombre = nombre.trim();
      updatedFields.push('nombre');
    }

    if (pieza && typeof pieza === 'string' && pieza.trim().length >= 3) {
      updatedClientInfo.piezaNecesaria = pieza.trim();
      updatedFields.push('refacción');
    }

    // Procesar datos del vehículo
    if (marca && typeof marca === 'string') {
      updatedClientInfo.vehiculo.marca = this.normalizeBrand(marca.trim());
      updatedFields.push('marca');
    }

    if (modelo && typeof modelo === 'string') {
      updatedClientInfo.vehiculo.modelo = modelo.trim();
      updatedFields.push('modelo');
    }

    if (año && (typeof año === 'number' || !isNaN(parseInt(año.toString())))) {
      const yearNum = typeof año === 'number' ? año : parseInt(año.toString());
      if (yearNum >= 1990 && yearNum <= new Date().getFullYear() + 1) {
        updatedClientInfo.vehiculo.año = yearNum;
        updatedFields.push('año');
      }
    }

    if (litraje && typeof litraje === 'string') {
      const normalizedEngine = this.normalizeEngineSize(litraje.trim());
      if (normalizedEngine) {
        updatedClientInfo.vehiculo.litraje = normalizedEngine;
        updatedFields.push('litraje');
      }
    }

    if (numeroSerie && typeof numeroSerie === 'string' && numeroSerie.trim().length >= 5) {
      updatedClientInfo.vehiculo.numeroSerie = numeroSerie.trim();
      updatedFields.push('numeroSerie');
    }

    if (modeloEspecial && typeof modeloEspecial === 'string') {
      updatedClientInfo.vehiculo.modeloEspecial = modeloEspecial.trim();
      updatedFields.push('modeloEspecial');
    }

    // Manejar campos adicionales no estándar (como "extra")
    const extraFields = Object.keys(args).filter(key => 
      !['nombre', 'pieza', 'marca', 'modelo', 'año', 'litraje', 'numeroSerie', 'modeloEspecial'].includes(key)
    );
    
    for (const extraField of extraFields) {
      const value = args[extraField];
      if (value && typeof value === 'string' && value.trim().length > 0) {
        // Intentar inferir si es modelo del vehículo
        if (extraField === 'extra' && !updatedClientInfo.vehiculo.modelo) {
          updatedClientInfo.vehiculo.modelo = value.trim();
          updatedFields.push('modelo (inferido)');
        }
      }
    }

    if (updatedFields.length === 0) {
      return {
        success: false,
        error: 'No se proporcionó información válida',
        message: 'Por favor proporciona información válida del cliente o vehículo.'
      };
    }

    return {
      success: true,
      data: {
        updatedFields,
        clientInfo: updatedClientInfo
      },
      message: `✅ Información guardada: ${updatedFields.join(', ')}`
    };
  }

  /**
   * Recopilar un dato específico del cliente (mantenido por compatibilidad)
   */
  private async handleCollectClientData(args: CollectClientDataArgs, context: FunctionContext): Promise<FunctionResult> {
    const { campo, valor } = args;
    const { currentClientInfo } = context;

    console.log(`[AutopartsFunctions] Recopilando ${campo}: ${valor}`);

    // Validar que tenemos los argumentos requeridos
    if (!campo || campo.trim() === '') {
      return {
        success: false,
        error: 'Campo requerido no especificado',
        message: 'Error interno: no se especificó qué campo recopilar.'
      };
    }

    if (!valor || typeof valor !== 'string' || valor.trim() === '') {
      return {
        success: false,
        error: 'Valor requerido no especificado o vacío',
        message: 'Por favor proporciona un valor válido.'
      };
    }

    // Validar y procesar el valor según el campo
    let processedValue: any = valor.trim();
    let nextStep: DataCollectionStatus | undefined;

    switch (campo) {
      case 'nombre':
        if (processedValue.length < 2) {
          return {
            success: false,
            error: 'El nombre debe tener al menos 2 caracteres',
            message: 'Por favor proporciona un nombre válido.'
          };
        }
        nextStep = currentClientInfo.piezaNecesaria ? 'collecting_brand' : 'collecting_part';
        break;

      case 'pieza':
        if (processedValue.length < 3) {
          return {
            success: false,
            error: 'La descripción de la pieza es muy corta',
            message: 'Por favor describe mejor qué refacción necesitas.'
          };
        }
        nextStep = currentClientInfo.nombre ? 'collecting_brand' : 'collecting_name';
        break;

      case 'marca':
        processedValue = this.normalizeBrand(processedValue);
        nextStep = 'collecting_model';
        break;

      case 'modelo':
        nextStep = 'collecting_year';
        break;

      case 'año':
        const year = parseInt(processedValue);
        if (isNaN(year) || year < 1990 || year > new Date().getFullYear() + 1) {
          return {
            success: false,
            error: 'Año inválido',
            message: 'Por favor proporciona un año válido entre 1990 y el año actual.'
          };
        }
        processedValue = year;
        nextStep = 'collecting_engine';
        break;

      case 'litraje':
        processedValue = this.normalizeEngineSize(processedValue);
        if (!processedValue) {
          return {
            success: false,
            error: 'Litraje inválido',
            message: 'Por favor especifica el litraje del motor (ej: 1.6L, 2.0L, 3.5L).'
          };
        }
        nextStep = 'collecting_serial';
        break;

      case 'numeroSerie':
        if (processedValue.length < 5) {
          return {
            success: false,
            error: 'Número de serie muy corto',
            message: 'El número de serie del motor debe tener al menos 5 caracteres.'
          };
        }
        nextStep = 'collecting_special';
        break;

      case 'modeloEspecial':
        // Este campo es opcional
        nextStep = 'data_complete';
        break;

      default:
        return {
          success: false,
          error: `Campo '${campo}' no reconocido`
        };
    }

    // Actualizar la información del cliente
    const updatedClientInfo = this.updateClientInfo(currentClientInfo, campo, processedValue);

    return {
      success: true,
      data: {
        campo,
        valor: processedValue,
        clientInfo: updatedClientInfo
      },
      nextStep,
      message: `✅ ${campo} guardado: ${processedValue}`
    };
  }

  /**
   * Validar datos del vehículo
   */
  private async handleValidateVehicleData(args: ValidateVehicleDataArgs, context: FunctionContext): Promise<FunctionResult> {
    const { vehiculo } = args;

    console.log('[AutopartsFunctions] Validando datos del vehículo:', vehiculo);

    const validationErrors: string[] = [];

    // Validar combinación marca-modelo-año
    if (vehiculo.marca && vehiculo.modelo && vehiculo.año) {
      const validCombination = this.validateBrandModelYear(vehiculo.marca, vehiculo.modelo, vehiculo.año);
      if (!validCombination.valid) {
        validationErrors.push(validCombination.error!);
      }
    }

    // Validar litraje para la marca/modelo
    if (vehiculo.litraje && vehiculo.marca && vehiculo.modelo) {
      const validEngine = this.validateEngineForModel(vehiculo.marca, vehiculo.modelo, vehiculo.litraje);
      if (!validEngine.valid) {
        validationErrors.push(validEngine.error!);
      }
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors.join('; '),
        message: `⚠️ Hay inconsistencias en los datos: ${validationErrors.join(', ')}`
      };
    }

    return {
      success: true,
      data: { vehiculo },
      message: '✅ Datos del vehículo validados correctamente'
    };
  }

  /**
   * Generar cotización preliminar
   */
  private async handleGenerateQuote(args: GenerateQuoteArgs, context: FunctionContext): Promise<FunctionResult> {
    const { clientInfo, includeAlternatives = false } = args;

    console.log('[AutopartsFunctions] Generando cotización para:', clientInfo);

    if (!clientInfo.piezaNecesaria || !clientInfo.vehiculo) {
      return {
        success: false,
        error: 'Información insuficiente para generar cotización',
        message: 'Necesito más información del vehículo para generar la cotización.'
      };
    }

    // Simular búsqueda de repuestos (en producción sería una API real)
    const quote = this.generateMockQuote(clientInfo, includeAlternatives);

    return {
      success: true,
      data: quote,
      message: `📋 Cotización generada para ${clientInfo.nombre}`
    };
  }

  /**
   * Determinar próximo paso en la recopilación
   */
  private async handleDetermineNextStep(args: { clientInfo: ClientInfo }, context: FunctionContext): Promise<FunctionResult> {
    const { clientInfo } = args;
    
    const missing = this.getMissingFields(clientInfo);
    
    if (missing.length === 0) {
      return {
        success: true,
        nextStep: 'data_complete',
        data: { allFieldsComplete: true },
        message: '✅ Información completa, listo para cotizar'
      };
    }

    const nextField = missing[0];
    const nextStep = this.getNextStepForField(nextField);

    return {
      success: true,
      nextStep,
      data: { 
        missingFields: missing,
        nextField,
        progress: this.calculateProgress(clientInfo)
      },
      message: `Siguiente: recopilar ${nextField}`
    };
  }

  /**
   * Registrar una función con su handler y definición
   */
  private registerFunction(
    name: string,
    handler: (args: any, context: FunctionContext) => Promise<FunctionResult>,
    definition: OpenRouterTool
  ): void {
    this.functionHandlers.set(name, handler);
    this.functionDefinitions.set(name, definition);
  }

  /**
   * Obtener todas las definiciones de funciones
   */
  getFunctionDefinitions(): OpenRouterTool[] {
    return Array.from(this.functionDefinitions.values());
  }

  /**
   * Ejecutar una función por nombre
   */
  async executeFunction(name: string, args: any, context: FunctionContext): Promise<FunctionResult> {
    const handler = this.functionHandlers.get(name);
    
    if (!handler) {
      return {
        success: false,
        error: `Función '${name}' no encontrada`
      };
    }

    try {
      return await handler(args, context);
    } catch (error) {
      console.error(`[AutopartsFunctions] Error ejecutando ${name}:`, error);
      return {
        success: false,
        error: `Error interno ejecutando ${name}: ${(error as Error).message}`
      };
    }
  }

  // ============================
  // FUNCIONES AUXILIARES PRIVADAS
  // ============================

  /**
   * Normalizar nombre de marca de vehículo
   */
  private normalizeBrand(brand: string): string {
    const brandMap: Record<string, string> = {
      'toyota': 'Toyota',
      'honda': 'Honda', 
      'ford': 'Ford',
      'chevrolet': 'Chevrolet',
      'chevy': 'Chevrolet',
      'nissan': 'Nissan',
      'hyundai': 'Hyundai',
      'kia': 'Kia',
      'mazda': 'Mazda',
      'volkswagen': 'Volkswagen',
      'vw': 'Volkswagen',
      'bmw': 'BMW',
      'mercedes': 'Mercedes-Benz',
      'audi': 'Audi'
    };

    return brandMap[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  }

  /**
   * Normalizar litraje del motor
   */
  private normalizeEngineSize(engine: string): string | null {
    const cleaned = engine.toLowerCase().replace(/[^0-9.l]/g, '');
    
    // Patrones comunes
    const patterns = [
      /^(\d\.?\d?)l?$/,  // 1.6, 2.0, 16
      /^(\d)(\d)l?$/     // 16 -> 1.6
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        let value = match[1];
        if (match[2]) {
          value = `${match[1]}.${match[2]}`;
        }
        return `${value}L`;
      }
    }

    return null;
  }

  /**
   * Actualizar información del cliente
   */
  private updateClientInfo(currentInfo: ClientInfo, campo: string, valor: any): ClientInfo {
    const updated = { ...currentInfo };

    if (campo === 'nombre') {
      updated.nombre = valor;
    } else if (campo === 'pieza') {
      updated.piezaNecesaria = valor;
    } else {
      // Campos del vehículo
      updated.vehiculo = { ...updated.vehiculo };
      (updated.vehiculo as any)[campo === 'año' ? 'año' : campo] = valor;
    }

    return updated;
  }

  /**
   * Validar combinación marca-modelo-año
   */
  private validateBrandModelYear(marca: string, modelo: string, año: number): { valid: boolean; error?: string } {
    // Validaciones básicas de lógica automotriz
    const currentYear = new Date().getFullYear();
    
    if (año > currentYear + 1) {
      return { valid: false, error: `El año ${año} es futuro` };
    }

    if (año < 1990) {
      return { valid: false, error: `El año ${año} es muy antiguo para nuestro sistema` };
    }

    // Aquí podrían ir validaciones más específicas de marca/modelo/año
    // Por ahora, asumimos que es válido
    return { valid: true };
  }

  /**
   * Validar litraje para marca/modelo específico
   */
  private validateEngineForModel(marca: string, modelo: string, litraje: string): { valid: boolean; error?: string } {
    // Validaciones básicas de motores comunes
    const engineValue = parseFloat(litraje.replace('L', ''));
    
    if (engineValue < 0.8 || engineValue > 8.0) {
      return { valid: false, error: `Litraje ${litraje} fuera de rango común` };
    }

    return { valid: true };
  }

  /**
   * Generar cotización simulada
   */
  private generateMockQuote(clientInfo: ClientInfo, includeAlternatives: boolean) {
    const { piezaNecesaria, vehiculo } = clientInfo;
    
    // Precios simulados basados en la pieza y vehículo
    const basePrice = this.calculateBasePrice(piezaNecesaria!, vehiculo!);
    
    const quote = {
      cliente: clientInfo.nombre,
      vehiculo: `${vehiculo!.marca} ${vehiculo!.modelo} ${vehiculo!.año} ${vehiculo!.litraje}`,
      pieza: piezaNecesaria,
      precio: basePrice,
      disponibilidad: 'En stock',
      garantia: '6 meses',
      tiempoEntrega: '24-48 horas',
      fecha: new Date().toLocaleDateString(),
      alternativas: includeAlternatives ? [
        { marca: 'Original', precio: basePrice * 1.3, calidad: 'OEM' },
        { marca: 'Genérico Premium', precio: basePrice * 0.8, calidad: 'Aftermarket' },
        { marca: 'Económico', precio: basePrice * 0.6, calidad: 'Compatible' }
      ] : []
    };

    return quote;
  }

  /**
   * Calcular precio base simulado
   */
  private calculateBasePrice(pieza: string, vehiculo: VehicleInfo): number {
    // Simulación simple de precios
    const basePrices: Record<string, number> = {
      'filtro': 25000,
      'aceite': 35000,
      'pastilla': 85000,
      'disco': 120000,
      'bateria': 180000,
      'llanta': 250000,
      'amortiguador': 150000
    };

    let price = 50000; // Precio base por defecto

    // Buscar coincidencia en la pieza
    for (const [key, value] of Object.entries(basePrices)) {
      if (pieza.toLowerCase().includes(key)) {
        price = value;
        break;
      }
    }

    // Ajustar por año del vehículo (más nuevo = más caro)
    if (vehiculo.año) {
      const yearFactor = Math.max(0.8, Math.min(1.5, (vehiculo.año - 1990) / 30));
      price *= yearFactor;
    }

    return Math.round(price);
  }

  /**
   * Obtener campos faltantes
   */
  private getMissingFields(clientInfo: ClientInfo): string[] {
    const missing: string[] = [];
    
    if (!clientInfo.nombre) missing.push('nombre');
    if (!clientInfo.piezaNecesaria) missing.push('pieza');
    
    if (!clientInfo.vehiculo) {
      missing.push('marca', 'modelo', 'año', 'litraje', 'numeroSerie');
    } else {
      const v = clientInfo.vehiculo;
      if (!v.marca) missing.push('marca');
      if (!v.modelo) missing.push('modelo');
      if (!v.año) missing.push('año');
      if (!v.litraje) missing.push('litraje');
      if (!v.numeroSerie) missing.push('numeroSerie');
    }

    return missing;
  }

  /**
   * Obtener siguiente paso basado en campo faltante
   */
  private getNextStepForField(field: string): DataCollectionStatus {
    const stepMap: Record<string, DataCollectionStatus> = {
      'nombre': 'collecting_name',
      'pieza': 'collecting_part',
      'marca': 'collecting_brand',
      'modelo': 'collecting_model',
      'año': 'collecting_year',
      'litraje': 'collecting_engine',
      'numeroSerie': 'collecting_serial',
      'modeloEspecial': 'collecting_special'
    };

    return stepMap[field] || 'collecting_name';
  }

  /**
   * Calcular progreso de recopilación
   */
  private calculateProgress(clientInfo: ClientInfo): { percentage: number; completed: number; total: number } {
    const required = ['nombre', 'pieza', 'marca', 'modelo', 'año', 'litraje', 'numeroSerie'];
    const missing = this.getMissingFields(clientInfo);
    const completed = required.length - missing.length;
    
    return {
      percentage: Math.round((completed / required.length) * 100),
      completed,
      total: required.length
    };
  }
} 