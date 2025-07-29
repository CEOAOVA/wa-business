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
exports.AutomotivePartsSearchService = void 0;
const supabase_1 = require("../config/supabase");
const concepts_service_1 = require("./concepts-service");
class AutomotivePartsSearchService {
    constructor() {
        this.conceptsService = new concepts_service_1.ConceptsService();
    }
    /**
     * Búsqueda principal de piezas automotrices
     * Solo requiere: marca, modelo y nombre de pieza
     */
    searchAutomotiveParts(partName_1, carInfo_1) {
        return __awaiter(this, arguments, void 0, function* (partName, carInfo, options = {}) {
            const startTime = Date.now();
            const { limit = 10, minConfidence = 0.3 } = options;
            try {
                console.log(`[AutomotivePartsSearch] Buscando: "${partName}" para ${carInfo.marca} ${carInfo.modelo}`);
                // 1. Normalizar término usando conceptos_json
                const normalizedTerm = yield this.normalizePartTerm(partName);
                console.log(`[AutomotivePartsSearch] Término normalizado: "${normalizedTerm}"`);
                // 2. Buscar en c_embler_json
                const results = yield this.searchInEmblerCatalog(normalizedTerm, carInfo, { limit, minConfidence });
                const searchTime = Date.now() - startTime;
                console.log(`[AutomotivePartsSearch] Encontrados ${results.length} resultados en ${searchTime}ms`);
                return {
                    success: true,
                    results,
                    totalFound: results.length,
                    normalizedTerm,
                    message: this.generateResponseMessage(results, carInfo)
                };
            }
            catch (error) {
                console.error('[AutomotivePartsSearch] Error en búsqueda:', error);
                return {
                    success: false,
                    results: [],
                    totalFound: 0,
                    normalizedTerm: partName,
                    message: 'No se encontraron piezas para tu vehículo'
                };
            }
        });
    }
    /**
     * Normalizar término usando conceptos_json
     */
    normalizePartTerm(userTerm) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Usar ConceptsService para normalización
                const normalizedTerm = this.conceptsService.normalizeSearchTerm(userTerm);
                return normalizedTerm;
            }
            catch (error) {
                console.error('[AutomotivePartsSearch] Error normalizando término:', error);
                return userTerm.toLowerCase().trim();
            }
        });
    }
    /**
     * Buscar en c_embler_json con filtros específicos
     */
    searchInEmblerCatalog(searchTerm, carInfo, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { limit, minConfidence } = options;
            if (!supabase_1.supabase) {
                throw new Error('Supabase client no está inicializado');
            }
            try {
                // Construir query para c_embler_json
                let query = supabase_1.supabase
                    .from('c_embler_json')
                    .select('catalogo')
                    .limit(limit * 2); // Buscar más para filtrar después
                // Buscar en el campo Nombre del JSON (todos en mayúsculas)
                if (searchTerm && searchTerm.trim()) {
                    const cleanTerm = searchTerm.trim().toUpperCase();
                    query = query.ilike('catalogo->>Nombre', `%${cleanTerm}%`);
                }
                const { data, error } = yield query;
                if (error) {
                    console.error('[AutomotivePartsSearch] Error en búsqueda:', error);
                    throw error;
                }
                // Procesar y filtrar resultados
                const matches = [];
                for (const item of data || []) {
                    const catalogItem = item.catalogo;
                    if (!catalogItem || !catalogItem.Nombre)
                        continue;
                    // Calcular confianza de coincidencia
                    const confidence = this.calculateMatchConfidence(searchTerm, catalogItem.Nombre);
                    if (confidence >= minConfidence) {
                        // Verificar compatibilidad con el auto
                        const carCompatibility = this.checkCarCompatibility(catalogItem.Nombre, carInfo);
                        matches.push({
                            clave: catalogItem.Clave || '',
                            marca: this.extractBrandFromName(catalogItem.Nombre),
                            nombre: catalogItem.Nombre,
                            confidence,
                            carCompatibility
                        });
                    }
                }
                // Ordenar por compatibilidad y confianza
                matches.sort((a, b) => {
                    if (a.carCompatibility && !b.carCompatibility)
                        return -1;
                    if (!a.carCompatibility && b.carCompatibility)
                        return 1;
                    return b.confidence - a.confidence;
                });
                return matches.slice(0, limit);
            }
            catch (error) {
                console.error('[AutomotivePartsSearch] Error en búsqueda de catálogo:', error);
                return [];
            }
        });
    }
    /**
     * Calcular confianza de coincidencia
     */
    calculateMatchConfidence(searchTerm, productName) {
        const term = searchTerm.toLowerCase();
        const name = productName.toLowerCase();
        // Coincidencia exacta
        if (name.includes(term))
            return 1.0;
        // Coincidencia parcial por palabras
        const termWords = term.split(' ').filter(word => word.length > 2);
        const nameWords = name.split(' ').filter(word => word.length > 2);
        let matchCount = 0;
        for (const termWord of termWords) {
            for (const nameWord of nameWords) {
                if (nameWord.includes(termWord) || termWord.includes(nameWord)) {
                    matchCount++;
                    break;
                }
            }
        }
        return termWords.length > 0 ? matchCount / termWords.length : 0;
    }
    /**
     * Verificar compatibilidad con el auto
     */
    checkCarCompatibility(productName, carInfo) {
        const name = productName.toUpperCase();
        const marca = carInfo.marca.toUpperCase();
        const modelo = carInfo.modelo.toUpperCase();
        // Verificar si el nombre contiene marca y modelo
        const hasMarca = name.includes(marca);
        const hasModelo = name.includes(modelo);
        return hasMarca && hasModelo;
    }
    /**
     * Extraer marca del nombre del producto
     */
    extractBrandFromName(productName) {
        // Buscar marcas comunes en el nombre
        const marcas = ['TOYOTA', 'HONDA', 'NISSAN', 'FORD', 'CHEVROLET', 'VOLKSWAGEN', 'MAZDA', 'HYUNDAI'];
        for (const marca of marcas) {
            if (productName.toUpperCase().includes(marca)) {
                return marca;
            }
        }
        return 'N/A';
    }
    /**
     * Generar mensaje de respuesta
     */
    generateResponseMessage(results, carInfo) {
        if (results.length === 0) {
            return `No encontré piezas para tu ${carInfo.marca} ${carInfo.modelo}`;
        }
        if (results.length === 1) {
            const result = results[0];
            return `Encontré esta pieza para tu ${carInfo.marca} ${carInfo.modelo}:\n\n🔑 **Clave:** ${result.clave}\n🏷️ **Marca:** ${result.marca}\n📝 **Descripción:** ${result.nombre}`;
        }
        // Múltiples resultados
        let message = `Encontré ${results.length} opciones para tu ${carInfo.marca} ${carInfo.modelo}:\n\n`;
        results.forEach((result, index) => {
            message += `${index + 1}. **Clave:** ${result.clave} | **Marca:** ${result.marca}\n   ${result.nombre}\n\n`;
        });
        return message;
    }
}
exports.AutomotivePartsSearchService = AutomotivePartsSearchService;
