/**
 * Tipos para servicios SOAP
 * Migrado desde Backend-Embler y adaptado para WhatsApp Backend
 */

// ===== AUTENTICACIÓN =====

export interface LoginRequest {
  user: string;
  pwd: string;
  puntoVenta: string;
}

export interface LoginResponse {
  token: string;
  expiresIn?: number;
  puntoVenta: string;
}

// ===== INVENTARIO =====

export interface InventoryQueryRequest {
  codigo: string;
  puntoVenta: string;
  token?: string;
}

export interface InventoryItem {
  Codigo: string;
  Nombre: string;
  Descripcion?: string;
  Marca?: string;
  Categoria?: string;
  Precio: number;
  PrecioVenta?: number;
  CantidadDisponible: number;
  CantidadMinima?: number;
  Ubicacion?: string;
  CodigoBarras?: string;
  Proveedor?: string;
  FechaUltimaActualizacion?: string;
  Activo?: boolean;
}

export interface InventoryQueryResponse {
  success: boolean;
  item?: InventoryItem;
  items?: InventoryItem[];
  error?: string;
  timestamp?: string;
}

export interface GeneralInventoryRequest {
  codigo: string;
  puntoVentaOrigen: string;
  incluirTodos?: boolean;
  token?: string;
}

export interface SucursalInventory {
  PuntoVenta: string;
  NombreSucursal?: string;
  CantidadDisponible: number;
  Precio?: number;
  UltimaActualizacion?: string;
  Activo?: boolean;
}

export interface GeneralInventoryResponse {
  success: boolean;
  codigo: string;
  nombre?: string;
  descripcion?: string;
  sucursales: SucursalInventory[];
  totalDisponible: number;
  error?: string;
  timestamp?: string;
}

// ===== BÚSQUEDA DE PRODUCTOS =====

export interface ProductSearchRequest {
  termino: string;
  puntoVenta: string;
  limite?: number;
  categoria?: string;
  marca?: string;
  precioMin?: number;
  precioMax?: number;
  token?: string;
}

export interface ProductSearchResult {
  Codigo: string;
  Nombre: string;
  Descripcion?: string;
  Marca?: string;
  Categoria?: string;
  Precio: number;
  CantidadDisponible: number;
  Imagen?: string;
  Compatibilidad?: string[];
  Relevancia?: number;
}

export interface ProductSearchResponse {
  success: boolean;
  resultados: ProductSearchResult[];
  totalEncontrados: number;
  terminoBusqueda: string;
  tiempoBusqueda?: number;
  error?: string;
  timestamp?: string;
}

// ===== TRANSACCIONES =====

export interface TransactionArticle {
  code: string;
  quantity: number;
  price: number;
  description?: string;
  discount?: number;
  tax?: number;
}

export interface TransactionRequest {
  articulos: TransactionArticle[];
  puntoVenta: string;
  cliente?: {
    nombre?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
  };
  tipoTransaccion?: 'venta' | 'cotizacion' | 'apartado';
  metodoPago?: 'efectivo' | 'tarjeta' | 'transferencia' | 'credito';
  descuentoGlobal?: number;
  observaciones?: string;
  vendedor?: string;
  token?: string;
}

export interface TransactionResponse {
  success: boolean;
  transactionId?: string;
  folio?: string;
  total?: number;
  subtotal?: number;
  impuestos?: number;
  descuentos?: number;
  fechaTransaccion?: string;
  puntoVenta?: string;
  articulos?: TransactionArticle[];
  error?: string;
  timestamp?: string;
}

// ===== TICKETS =====

export interface TicketGenerationRequest {
  transactionId: string;
  puntoVenta: string;
  formato?: 'pdf' | 'thermal' | 'json';
  incluirLogos?: boolean;
  copias?: number;
  token?: string;
}

export interface TicketGenerationResponse {
  success: boolean;
  ticketId?: string;
  formato?: string;
  contenido?: string;  // Base64 para PDF, texto para thermal
  url?: string;        // URL de descarga si está disponible
  tamaño?: number;     // Tamaño del archivo en bytes
  fechaGeneracion?: string;
  error?: string;
  timestamp?: string;
}

// ===== VIN DECODER =====

export interface VinDecodeRequest {
  vin: string;
  incluirEspecificaciones?: boolean;
}

export interface VinDecodeResponse {
  success: boolean;
  vin?: string;
  vehiculo?: {
    marca: string;
    modelo: string;
    año: number;
    motor?: string;
    transmision?: string;
    combustible?: string;
    categoria?: string;
    pais?: string;
    fabricante?: string;
  };
  especificaciones?: Record<string, any>;
  error?: string;
  source?: 'api_ninjas' | 'cache' | 'fallback';
  timestamp?: string;
}

// ===== ENVÍOS =====

export interface ShippingQuoteRequest {
  puntoOrigenId: string;
  direccionDestino: {
    calle: string;
    colonia: string;
    ciudad: string;
    estado: string;
    codigoPostal: string;
    pais?: string;
  };
  articulos: Array<{
    codigo: string;
    cantidad: number;
    peso?: number;
    dimensiones?: {
      largo: number;
      ancho: number;
      alto: number;
    };
  }>;
  tipoEnvio?: 'express' | 'normal' | 'economico';
}

export interface ShippingQuoteResponse {
  success: boolean;
  cotizaciones?: Array<{
    proveedor: string;
    tipoServicio: string;
    costo: number;
    tiempoEstimado: string;
    descripcion?: string;
    rastreable?: boolean;
  }>;
  costoMinimo?: number;
  costoMaximo?: number;
  tiempoMinimoHoras?: number;
  tiempoMaximoHoras?: number;
  error?: string;
  timestamp?: string;
}

// ===== CONFIGURACIÓN SOAP =====

export interface SoapConfig {
  wsdlUrl: string;
  endpointUrl: string;
  timeout?: number;
  retries?: number;
  cacheTokenDuration?: number;
}

export interface SoapHeaders {
  'Content-Type': string;
  'SOAPAction'?: string;
  'Authorization'?: string;
  'User-Agent'?: string;
}

// ===== ERRORES Y RESPUESTAS =====

export interface SoapError {
  code: string;
  message: string;
  details?: any;
  soap_fault?: {
    faultcode: string;
    faultstring: string;
    detail?: any;
  };
  http_status?: number;
  timestamp: string;
}

export interface SoapOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: SoapError;
  operationTime?: number;
  fromCache?: boolean;
  retryCount?: number;
}

// ===== CACHÉ =====

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface TokenCache {
  [puntoVenta: string]: {
    token: string;
    expiresAt: number;
    issuedAt: number;
  };
}

// ===== MÉTRICAS SOAP =====

export interface SoapMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  authenticationFailures: number;
  timeoutErrors: number;
  lastRequestTime?: string;
  activeConnections: number;
}

// ===== MAPEO DE SUCURSALES =====

export interface SucursalMapping {
  id: string;
  nombre: string;
  nombreAmigable: string;
  direccion?: {
    calle?: string;
    colonia?: string;
    ciudad?: string;
    estado?: string;
    codigoPostal?: string;
  };
  telefono?: string;
  horarios?: {
    apertura: string;
    cierre: string;
    diasSemana: string[];
  };
  activa: boolean;
  tieneEnvios: boolean;
  esMatriz: boolean;
}

export interface ProcessedSucursal {
  id: string;
  nombre: string;
  nombreAmigable: string;
  cantidad: number;
  precio?: number;
  disponible: boolean;
  tieneEnvios: boolean;
  distanciaEstimada?: number;
  tiempoEnvioEstimado?: string;
} 