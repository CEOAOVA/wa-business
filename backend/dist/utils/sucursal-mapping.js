"use strict";
/**
 * Mapeo de IDs de sucursal a nombres amigables para mejorar la experiencia del usuario
 * Migrado desde Backend-Embler para WhatsApp Business
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUCURSAL_MAPPING = void 0;
exports.convertSucursalToFriendlyName = convertSucursalToFriendlyName;
exports.convertSucursalesToFriendlyNames = convertSucursalesToFriendlyNames;
exports.processSucursalesFromSOAP = processSucursalesFromSOAP;
exports.generateFriendlyAvailabilityMessage = generateFriendlyAvailabilityMessage;
exports.searchSucursales = searchSucursales;
exports.isValidSucursalId = isValidSucursalId;
exports.getAllSucursales = getAllSucursales;
exports.findSucursalIdByName = findSucursalIdByName;
exports.SUCURSAL_MAPPING = {
    'ME': 'Metepec',
    'CUA': 'Cuauhtémoc',
    'ECA': 'Ecatepec',
    'IZT': 'Iztapalapa',
    'LIND': 'Lindavista',
    'PORT': 'Portales',
    'QRO': 'Querétaro',
    'SAT': 'Satélite',
    'TPN': 'Tlalpan',
    'VC': 'Venustiano Carranza',
    'EC': 'Ecatepec',
    'TO': 'Toluca',
    'LE': 'León',
    'QU': 'Querétaro',
    'CU': 'Cuernavaca',
    'PU': 'Puebla',
    'MO': 'Morelia',
    'TI': 'Tijuana',
    'GU': 'Guadalajara'
};
/**
 * Convierte un ID de sucursal a su nombre amigable
 * @param sucursalId ID de la sucursal (ej: 'ME', 'EC')
 * @returns Nombre amigable de la sucursal (ej: 'Metepec', 'Ecatepec')
 */
function convertSucursalToFriendlyName(sucursalId) {
    return exports.SUCURSAL_MAPPING[sucursalId] || sucursalId;
}
/**
 * Convierte una lista de IDs de sucursal a nombres amigables
 * @param sucursalIds Array de IDs de sucursal
 * @returns Array de nombres amigables
 */
function convertSucursalesToFriendlyNames(sucursalIds) {
    return sucursalIds.map(convertSucursalToFriendlyName);
}
/**
 * Procesa la respuesta SOAP de inventario general para extraer sucursales con stock y nombres amigables
 * @param soapResponse Respuesta del servicio SOAP ConsultarInventarioGeneral
 * @returns Array de sucursales con stock, incluyendo nombres amigables
 */
function processSucursalesFromSOAP(soapResponse) {
    var _a;
    if (!((_a = soapResponse === null || soapResponse === void 0 ? void 0 : soapResponse.Inventarios) === null || _a === void 0 ? void 0 : _a.ArrayOfstring)) {
        return [];
    }
    return soapResponse.Inventarios.ArrayOfstring
        .map((item) => ({
        id: item.string[0],
        cantidad: parseInt(item.string[1], 10),
        nombre: item.string[2] || '', // Nombre real de SOAP (si está disponible)
        nombreAmigable: item.string[2] && item.string[2] !== item.string[0]
            ? item.string[2]
            : convertSucursalToFriendlyName(item.string[0]),
        precio: parseFloat(item.string[3] || '0')
    }))
        .filter((sucursal) => sucursal.cantidad > 0);
}
/**
 * Genera un mensaje amigable para mostrar disponibilidad en otras sucursales
 * @param producto Nombre del producto
 * @param precioTexto Precio en texto (ej: "mil doscientos pesos mexicanos")
 * @param sucursales Array de sucursales con stock procesadas
 * @returns Mensaje amigable para el usuario
 */
function generateFriendlyAvailabilityMessage(producto, precioTexto, sucursales) {
    if (sucursales.length === 0) {
        return `Lo siento, ${producto} no está disponible actualmente en ninguna sucursal.`;
    }
    const nombresAmigables = sucursales.map(s => s.nombreAmigable);
    if (sucursales.length === 1) {
        return `No tenemos ${producto} en esta sucursal, pero tenemos ${sucursales[0].cantidad} ${sucursales[0].cantidad === 1 ? 'unidad' : 'unidades'} disponibles en ${nombresAmigables[0]}. El precio es ${precioTexto}.`;
    }
    return `No tenemos ${producto} en esta sucursal, pero está disponible en: ${nombresAmigables.join(', ')}. El precio es ${precioTexto}.`;
}
/**
 * Busca sucursales por nombre parcial (útil para consultas de usuarios)
 * @param searchTerm Término de búsqueda
 * @returns Array de sucursales que coinciden
 */
function searchSucursales(searchTerm) {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    return Object.entries(exports.SUCURSAL_MAPPING)
        .filter(([, nombre]) => nombre.toLowerCase().includes(normalizedSearch))
        .map(([id, nombre]) => ({ id, nombre }));
}
/**
 * Valida si un ID de sucursal existe en el mapeo
 * @param sucursalId ID de sucursal a validar
 * @returns true si existe, false en caso contrario
 */
function isValidSucursalId(sucursalId) {
    return sucursalId in exports.SUCURSAL_MAPPING;
}
/**
 * Obtiene todas las sucursales disponibles
 * @returns Array con todas las sucursales disponibles
 */
function getAllSucursales() {
    return Object.entries(exports.SUCURSAL_MAPPING)
        .map(([id, nombre]) => ({ id, nombre }));
}
/**
 * Encuentra el ID de sucursal más cercano basado en un nombre
 * @param nombreSucursal Nombre de la sucursal
 * @returns ID de la sucursal o null si no se encuentra
 */
function findSucursalIdByName(nombreSucursal) {
    const normalizedSearch = nombreSucursal.toLowerCase().trim();
    // Buscar coincidencia exacta primero
    for (const [id, nombre] of Object.entries(exports.SUCURSAL_MAPPING)) {
        if (nombre.toLowerCase() === normalizedSearch) {
            return id;
        }
    }
    // Buscar coincidencia parcial
    for (const [id, nombre] of Object.entries(exports.SUCURSAL_MAPPING)) {
        if (nombre.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(nombre.toLowerCase())) {
            return id;
        }
    }
    return null;
}
