/**
 * Utilidades para operaciones SOAP y procesamiento de datos
 */

/**
 * Convierte un valor numérico a texto de precio en pesos mexicanos
 */
export function priceToText(price: number): string {
  if (typeof price !== 'number' || isNaN(price)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
}

/**
 * Interfaz para sucursal con stock
 */
export interface SucursalConStock {
  id: string;
  nombre: string;
  nombreAmigable: string;
  cantidad: number;
  precio: number;
}

/**
 * Procesa la respuesta de inventario general del SOAP y extrae sucursales con stock
 */
export function processSucursalesFromSOAP(soapResponse: any): SucursalConStock[] {
  const sucursales: SucursalConStock[] = [];
  
  try {
    if (!soapResponse || !soapResponse.Inventarios) {
      console.log('[SOAP-Utils] No hay inventarios en la respuesta SOAP');
      return sucursales;
    }

    const inventarios = soapResponse.Inventarios.ArrayOfstring || [];
    
    inventarios.forEach((inventario: any) => {
      if (inventario && inventario.string && Array.isArray(inventario.string)) {
        const [sucursalId, cantidad, , precio] = inventario.string;
        const cantidadNum = parseInt(cantidad, 10) || 0;
        const precioNum = parseFloat(precio) || 0;
        
        if (cantidadNum > 0) {
          sucursales.push({
            id: sucursalId,
            nombre: sucursalId,
            nombreAmigable: convertirSucursalANombreAmigable(sucursalId),
            cantidad: cantidadNum,
            precio: precioNum
          });
        }
      }
    });

    console.log(`[SOAP-Utils] Procesadas ${sucursales.length} sucursales con stock`);
    return sucursales;

  } catch (error) {
    console.error('[SOAP-Utils] Error procesando sucursales SOAP:', error);
    return sucursales;
  }
}

/**
 * Convierte ID de sucursal a nombre amigable
 */
function convertirSucursalANombreAmigable(sucursalId: string): string {
  const mapeoSucursales: { [key: string]: string } = {
    'ME': 'Merced',
    'CUA': 'Cuauhtémoc', 
    'ECA': 'Ecatepec',
    'IZT': 'Iztapalapa',
    'LIND': 'Lindavista',
    'PORT': 'Portales',
    'QRO': 'Querétaro',
    'SAT': 'Satélite',
    'TPN': 'Tlalpan',
    'VC': 'Valle de Chalco'
  };

  return mapeoSucursales[sucursalId] || sucursalId;
}

/**
 * Valida que una respuesta SOAP sea exitosa
 */
export function validarRespuestaSOAP(response: any): { valida: boolean; mensaje?: string } {
  if (!response) {
    return { valida: false, mensaje: 'Respuesta SOAP vacía' };
  }

  if (response.Estatus !== undefined && response.Estatus !== 0) {
    return { 
      valida: false, 
      mensaje: response.Mensaje || `Error SOAP con estatus ${response.Estatus}` 
    };
  }

  return { valida: true };
}

/**
 * Formatea información de cliente para SOAP
 */
export function formatearClienteParaSOAP(clientInfo: {
  nombre?: string;
  telefono?: string;
  codigoPostal?: string;
  direccion?: string;
}) {
  return {
    Nombre: clientInfo.nombre || 'Cliente',
    Telefono: clientInfo.telefono || '',
    CodigoPostal: clientInfo.codigoPostal || '',
    Direccion: clientInfo.direccion || ''
  };
}

/**
 * Extrae código de producto de diferentes formatos
 */
export function extraerCodigoProducto(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Limpiar el input
  const cleaned = input.trim().toUpperCase();
  
  // Patrones para códigos de productos automotrices
  const patterns = [
    /^[A-Z0-9]{8,15}$/, // Código alfanumérico estándar
    /^[A-Z]{2,4}[0-9]{4,8}$/, // Código con letras seguidas de números
    /^[0-9]{10,13}$/ // Código numérico largo
  ];

  for (const pattern of patterns) {
    if (pattern.test(cleaned)) {
      return cleaned;
    }
  }

  return null;
} 