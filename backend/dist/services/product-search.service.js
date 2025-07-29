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
exports.ProductSearchService = void 0;
const supabase_1 = require("../config/supabase");
const concepts_service_1 = require("./concepts-service");
class ProductSearchService {
    constructor() {
        this.conceptsService = new concepts_service_1.ConceptsService();
    }
    /**
     * 1. Normalizar término de búsqueda usando conceptos_json
     */
    normalizeSearchTerm(userTerm) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[ProductSearchService] Normalizando término: "${userTerm}"`);
                // Usar ConceptsService para normalizar
                const normalizedTerm = this.conceptsService.normalizeSearchTerm(userTerm);
                console.log(`[ProductSearchService] Término normalizado: "${normalizedTerm}"`);
                return normalizedTerm;
            }
            catch (error) {
                console.error('[ProductSearchService] Error normalizando término:', error);
                // Si falla la normalización, usar el término original
                return userTerm.toLowerCase().trim();
            }
        });
    }
    /**
     * 2. Buscar productos en c_embler_json por nombre + datos del auto
     */
    searchProductsByName(searchTerm_1, carData_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, carData, options = {}) {
            const startTime = Date.now();
            const { limit = 20, minConfidence = 0.3 } = options;
            try {
                console.log(`[ProductSearchService] Buscando productos: "${searchTerm}" para ${carData.marca} ${carData.modelo} ${carData.año}`);
                if (!supabase_1.supabase) {
                    throw new Error('Supabase client is not initialized');
                }
                // Construir query para c_embler_json
                let query = supabase_1.supabase
                    .from('c_embler_json')
                    .select('catalogo')
                    .limit(limit);
                // Buscar en el campo nombre del JSON
                if (searchTerm && searchTerm.trim()) {
                    const cleanTerm = searchTerm.trim().toLowerCase();
                    query = query.textSearch('catalogo->>Nombre', cleanTerm);
                }
                const { data, error } = yield query;
                if (error) {
                    console.error('[ProductSearchService] Error en búsqueda:', error);
                    throw error;
                }
                // Procesar resultados y calcular compatibilidad
                const matches = [];
                for (const item of data || []) {
                    const catalogItem = item.catalogo;
                    if (!catalogItem || !catalogItem.Nombre)
                        continue;
                    const confidence = this.calculateMatchConfidence(searchTerm, catalogItem.Nombre);
                    if (confidence >= minConfidence) {
                        const carCompatibility = this.checkCarCompatibility(catalogItem.Nombre, carData);
                        matches.push({
                            clave: catalogItem.Clave || '',
                            nombre: catalogItem.Nombre,
                            confidence,
                            carCompatibility,
                            marca: this.extractBrandFromName(catalogItem.Nombre),
                            modelo: this.extractModelFromName(catalogItem.Nombre),
                            año: this.extractYearFromName(catalogItem.Nombre)
                        });
                    }
                }
                // Ordenar por confianza y compatibilidad
                matches.sort((a, b) => {
                    if (a.carCompatibility && !b.carCompatibility)
                        return -1;
                    if (!a.carCompatibility && b.carCompatibility)
                        return 1;
                    return b.confidence - a.confidence;
                });
                const searchTime = Date.now() - startTime;
                console.log(`[ProductSearchService] Encontrados ${matches.length} productos en ${searchTime}ms`);
                return matches.slice(0, limit);
            }
            catch (error) {
                console.error('[ProductSearchService] Error en búsqueda de productos:', error);
                return [];
            }
        });
    }
    /**
     * 3. Buscar detalles en c_embler_ml_json por clave
     */
    getProductDetails(productKey) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[ProductSearchService] Buscando detalles para clave: "${productKey}"`);
                if (!supabase_1.supabase) {
                    throw new Error('Supabase client is not initialized');
                }
                // Limpiar la clave para buscar en c_embler_ml_json
                // En c_embler_json: "0004202902 *1" 
                // En c_embler_ml_json: "0004202902"
                const cleanKey = productKey.split(' ')[0]; // Tomar solo la parte antes del espacio
                console.log(`[ProductSearchService] Clave limpia para búsqueda: "${cleanKey}"`);
                // Buscar en c_embler_ml_json por la clave limpia
                const { data, error } = yield supabase_1.supabase
                    .from('c_embler_ml_json')
                    .select('catalogo')
                    .eq('catalogo->>Pieza', cleanKey)
                    .limit(1);
                if (error) {
                    console.error('[ProductSearchService] Error buscando detalles:', error);
                    return null;
                }
                if (!data || data.length === 0) {
                    console.log(`[ProductSearchService] No se encontraron detalles para clave: "${cleanKey}"`);
                    // Intentar búsqueda parcial si no se encuentra exacto
                    const { data: partialData, error: partialError } = yield supabase_1.supabase
                        .from('c_embler_ml_json')
                        .select('catalogo')
                        .ilike('catalogo->>Pieza', `%${cleanKey}%`)
                        .limit(1);
                    if (!partialError && partialData && partialData.length > 0) {
                        console.log(`[ProductSearchService] Encontrado con búsqueda parcial: "${partialData[0].catalogo.Pieza}"`);
                        const catalogItem = partialData[0].catalogo;
                        return {
                            pieza: catalogItem.Pieza || cleanKey,
                            nombre: catalogItem.Título || catalogItem.Nombre, // Usar Título en lugar de Nombre
                            marca: catalogItem.Atributo_Marca || catalogItem.Marca, // Usar Atributo_Marca
                            modelo: catalogItem.Modelo,
                            año: catalogItem.Año,
                            precio: catalogItem.Precio,
                            stock: catalogItem.Stock,
                            descripcion: catalogItem.Descripción || catalogItem.Descripcion, // Usar Descripción
                            compatibilidad: catalogItem.Compatibilidad
                        };
                    }
                    return null;
                }
                const catalogItem = data[0].catalogo;
                return {
                    pieza: catalogItem.Pieza || cleanKey,
                    nombre: catalogItem.Título || catalogItem.Nombre, // Usar Título en lugar de Nombre
                    marca: catalogItem.Atributo_Marca || catalogItem.Marca, // Usar Atributo_Marca
                    modelo: catalogItem.Modelo,
                    año: catalogItem.Año,
                    precio: catalogItem.Precio,
                    stock: catalogItem.Stock,
                    descripcion: catalogItem.Descripción || catalogItem.Descripcion, // Usar Descripción
                    compatibilidad: catalogItem.Compatibilidad
                };
            }
            catch (error) {
                console.error('[ProductSearchService] Error obteniendo detalles:', error);
                return null;
            }
        });
    }
    /**
     * 4. Búsqueda completa con flujo integrado
     */
    searchProductFlow(userTerm_1, carData_1) {
        return __awaiter(this, arguments, void 0, function* (userTerm, carData, options = {}) {
            const startTime = Date.now();
            try {
                console.log(`[ProductSearchService] Iniciando flujo de búsqueda: "${userTerm}"`);
                // 1. Normalizar término
                const normalizedTerm = yield this.normalizeSearchTerm(userTerm);
                // 2. Buscar productos
                const matches = yield this.searchProductsByName(normalizedTerm, carData, options);
                // 3. Generar sugerencias si no hay coincidencias exactas
                const suggestions = matches.length === 0 ?
                    this.generateSuggestions(userTerm) : undefined;
                const searchTime = Date.now() - startTime;
                const hasExactMatch = matches.some(m => m.confidence > 0.8);
                return {
                    normalizedTerm,
                    matches,
                    totalFound: matches.length,
                    searchTime,
                    hasExactMatch,
                    suggestions
                };
            }
            catch (error) {
                console.error('[ProductSearchService] Error en flujo de búsqueda:', error);
                return {
                    normalizedTerm: userTerm,
                    matches: [],
                    totalFound: 0,
                    searchTime: Date.now() - startTime,
                    hasExactMatch: false,
                    suggestions: this.generateSuggestions(userTerm)
                };
            }
        });
    }
    /**
     * Calcular confianza de coincidencia entre término y nombre del producto
     */
    calculateMatchConfidence(searchTerm, productName) {
        const term = searchTerm.toLowerCase();
        const name = productName.toLowerCase();
        // Coincidencia exacta
        if (name.includes(term))
            return 1.0;
        // Coincidencia parcial
        const termWords = term.split(' ');
        const nameWords = name.split(' ');
        let matchedWords = 0;
        for (const word of termWords) {
            if (nameWords.some(nw => nw.includes(word) || word.includes(nw))) {
                matchedWords++;
            }
        }
        return matchedWords / termWords.length;
    }
    /**
     * Verificar compatibilidad con datos del auto
     */
    checkCarCompatibility(productName, carData) {
        if (!carData.marca && !carData.modelo && !carData.año)
            return true;
        const name = productName.toLowerCase();
        let compatibility = true;
        if (carData.marca) {
            const brandMatch = name.includes(carData.marca.toLowerCase());
            if (!brandMatch)
                compatibility = false;
        }
        if (carData.modelo) {
            const modelMatch = name.includes(carData.modelo.toLowerCase());
            if (!modelMatch)
                compatibility = false;
        }
        if (carData.año) {
            const yearMatch = name.includes(carData.año.toString());
            if (!yearMatch)
                compatibility = false;
        }
        return compatibility;
    }
    /**
     * Extraer marca del nombre del producto
     */
    extractBrandFromName(productName) {
        const brands = ['bmw', 'mercedes', 'audi', 'volkswagen', 'toyota', 'honda', 'ford', 'chevrolet'];
        const name = productName.toLowerCase();
        for (const brand of brands) {
            if (name.includes(brand))
                return brand.toUpperCase();
        }
        return undefined;
    }
    /**
     * Extraer modelo del nombre del producto
     */
    extractModelFromName(productName) {
        // Implementar lógica para extraer modelos específicos
        // Por ahora retornar undefined
        return undefined;
    }
    /**
     * Extraer año del nombre del producto
     */
    extractYearFromName(productName) {
        const yearMatch = productName.match(/\b(19|20)\d{2}\b/);
        return yearMatch ? yearMatch[0] : undefined;
    }
    /**
     * Generar sugerencias cuando no hay coincidencias
     */
    generateSuggestions(userTerm) {
        // Usar ConceptsService para obtener términos similares
        const suggestions = this.conceptsService.getSuggestions(userTerm);
        return suggestions.slice(0, 3);
    }
}
exports.ProductSearchService = ProductSearchService;
