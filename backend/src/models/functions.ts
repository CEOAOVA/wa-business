/**
 * Modelos para Function Calling
 * Migrado desde Backend-Embler y adaptado para WhatsApp Backend
 */

// ===== DEFINICIÓN DE FUNCIONES =====

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      minimum?: number;
      maximum?: number;
      pattern?: string;
      items?: any;
      properties?: any;
      required?: string[];
    }>;
    required: string[];
  };
}

export interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  requiresFollowUp?: boolean;
  nextAction?: 'await_confirmation' | 'request_info' | 'escalate_advisor';
  metadata?: Record<string, any>;
}

export type FunctionHandler = (
  args: Record<string, any>,
  context: FunctionContext
) => Promise<FunctionResult>;

export interface FunctionCallInfo {
  name: string;
  arguments: string;
}

// ===== FUNCIONES DE INVENTARIO =====

export interface ConsultarInventarioArgs {
  codigoProducto?: string;
  nombreProducto?: string;
}

export interface ConsultarInventarioGeneralArgs {
  codigo: string;
  incluirTodos?: boolean;
}

export interface BuscarProductosArgs {
  termino: string;
  limite?: number;
  categoria?: string;
  marca?: string;
}

export interface BuscarYConsultarInventarioArgs {
  termino: string;
  codigoEspecifico?: string;
  limite?: number;
}

// ===== FUNCIONES DE TRANSACCIONES =====

export interface ConfirmarCompraArgs {
  productos: Array<{
    codigo: string;
    nombre: string;
    precio: number;
    cantidad: number;
  }>;
  datosUsuario: {
    nombre: string;
    telefono?: string;
  };
  tipoCompra: 'local' | 'envio';
  direccionEnvio?: {
    calle: string;
    colonia: string;
    ciudad: string;
    estado: string;
    codigoPostal: string;
  };
}

export interface GenerarTicketArgs {
  transactionId: string;
  formato?: 'pdf' | 'thermal';
  incluirLogos?: boolean;
}

export interface ManejarDecisionCompraArgs {
  decision: string | number;
  producto: {
    codigo: string;
    nombre: string;
    precio: number;
    cantidad: number;
  };
  accion?: 'generar_ticket' | 'solicitar_asesor';
}

// ===== FUNCIONES DE ENVÍO =====

export interface SolicitarDireccionArgs {
  motivo?: string;
  producto?: {
    codigo: string;
    nombre: string;
  };
}

export interface ConfirmarDireccionArgs {
  direccion: {
    calle: string;
    colonia: string;
    ciudad: string;
    estado: string;
    codigoPostal: string;
  };
  confirmacion: boolean;
}

export interface ConsultarEnvioArgs {
  codigoPostal?: string;
  ciudad?: string;
  estado?: string;
}

// ===== FUNCIONES DE ASESORÍA =====

export interface SolicitarAsesorArgs {
  motivo: string;
  urgencia?: 'baja' | 'media' | 'alta';
  clienteInfo?: {
    nombre?: string;
    telefono?: string;
    consulta?: string;
  };
}

// ===== FUNCIONES VIN =====

export interface BuscarPorVinArgs {
  vin: string;
  termino?: string;
  incluirEspecificaciones?: boolean;
}

export interface ValidarVinArgs {
  vin: string;
}

// ===== FUNCIONES INTERACTIVAS =====

export interface SeleccionarProductoArgs {
  numero: number;
  productos?: Array<{
    codigo: string;
    nombre: string;
    precio: number;
  }>;
}

export interface ConfirmarProductoConImagenArgs {
  confirma: boolean;
  producto?: {
    codigo: string;
    nombre: string;
  };
}

// ===== RESULTADOS ESPECÍFICOS =====

export interface InventoryFunctionResult extends FunctionResult {
  data?: {
    producto?: {
      codigo: string;
      nombre: string;
      precio: number;
      precioTexto: string;
      cantidad: number;
    };
    stockLocal?: boolean;
    stockGeneral?: boolean;
    sucursalesDisponibles?: Array<{
      id: string;
      nombre: string;
      nombreAmigable: string;
      cantidad: number;
      precio?: number;
    }>;
    mensaje?: string;
    mensajeClaro?: string;
    esperandoDecisionCompra?: boolean;
    esperandoConfirmacionEnvio?: boolean;
    tipoCompra?: 'local' | 'envio';
    requiereAsesor?: boolean;
    opciones?: Array<{
      numero: number;
      accion: string;
      descripcion: string;
    }>;
  };
}

export interface SearchFunctionResult extends FunctionResult {
  data?: {
    productos?: Array<{
      codigo: string;
      nombre: string;
      precio: number;
      cantidad: number;
      descripcion?: string;
      marca?: string;
    }>;
    totalEncontrados?: number;
    terminoBusqueda?: string;
    mensaje?: string;
    mostrarSeleccion?: boolean;
    numerosPara?: 'seleccion' | 'inventario';
  };
}

export interface TransactionFunctionResult extends FunctionResult {
  data?: {
    transactionId?: string;
    folio?: string;
    total?: number;
    subtotal?: number;
    ticketUrl?: string;
    ticketContent?: string;
    productos?: Array<{
      codigo: string;
      nombre: string;
      cantidad: number;
      precio: number;
    }>;
    mensaje?: string;
    cliente?: {
      nombre: string;
      telefono?: string;
    };
    fechaTransaccion?: string;
    metodoPago?: string;
  };
}

export interface VinFunctionResult extends FunctionResult {
  data?: {
    vin?: string;
    vehiculo?: {
      marca: string;
      modelo: string;
      año: number;
      motor?: string;
    };
    productos?: Array<{
      codigo: string;
      nombre: string;
      precio: number;
      compatibilidad?: string[];
    }>;
    mensaje?: string;
    busquedaAlternativa?: boolean;
    requiereAsesor?: boolean;
  };
}

export interface ShippingFunctionResult extends FunctionResult {
  data?: {
    cotizaciones?: Array<{
      proveedor: string;
      tipoServicio: string;
      costo: number;
      tiempoEstimado: string;
    }>;
    direccion?: {
      calle: string;
      colonia: string;
      ciudad: string;
      estado: string;
      codigoPostal: string;
    };
    costoEstimado?: number;
    tiempoEstimado?: string;
    mensaje?: string;
    direccionValida?: boolean;
  };
}

export interface AdvisorFunctionResult extends FunctionResult {
  data?: {
    ticketId?: string;
    tiempoEstimado?: string;
    asesorAsignado?: {
      nombre: string;
      extension?: string;
    };
    prioridad?: 'baja' | 'media' | 'alta';
    motivo?: string;
    mensaje?: string;
  };
}

// ===== CONTEXTO DE FUNCIÓN =====

export interface FunctionContext {
  pointOfSaleId: string;
  userId?: string;
  sessionId?: string;
  conversationId?: string;
  phoneNumber?: string;
  model?: string;
  clientInfo?: {
    nombre?: string;
    telefono?: string;
    direccion?: string;
    codigoPostal?: string;
    vehiculo?: {
      marca?: string;
      modelo?: string;
      año?: number;
      vin?: string;
    };
  };
  conversationState?: {
    phase?: string;
    selectedProduct?: any;
    pendingConfirmation?: any;
  };
}

// ===== MAPEO DE FUNCIONES =====

export interface FunctionRegistry {
  // Inventario
  consultarInventario: FunctionHandler;
  consultarInventarioGeneral: FunctionHandler;
  buscarProductos: FunctionHandler;
  buscarYConsultarInventario: FunctionHandler;
  
  // Transacciones
  confirmarCompra: FunctionHandler;
  generarTicket: FunctionHandler;
  manejarDecisionCompra: FunctionHandler;
  
  // Envío
  solicitarDireccion: FunctionHandler;
  confirmarDireccion: FunctionHandler;
  consultarEnvio: FunctionHandler;
  
  // Asesoría
  solicitarAsesor: FunctionHandler;
  
  // VIN
  buscarPorVin: FunctionHandler;
  validarVin: FunctionHandler;
  
  // Interactivas
  seleccionarProducto: FunctionHandler;
  confirmarProductoConImagen: FunctionHandler;
}

// ===== MÉTRICAS DE FUNCIONES =====

export interface FunctionMetrics {
  [functionName: string]: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageExecutionTime: number;
    lastCalled?: string;
    errorRate: number;
  };
}

export interface FunctionExecutionLog {
  functionName: string;
  args: Record<string, any>;
  result: FunctionResult;
  executionTime: number;
  timestamp: string;
  context: FunctionContext;
  success: boolean;
  error?: string;
} 