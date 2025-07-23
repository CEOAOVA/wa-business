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
exports.unifiedCatalogService = exports.UnifiedCatalogService = void 0;
exports.createIncrementUsageFunction = createIncrementUsageFunction;
const supabase_1 = require("../config/supabase");
class UnifiedCatalogService {
    constructor() {
        this.cache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos
    }
    static getInstance() {
        if (!UnifiedCatalogService.instance) {
            UnifiedCatalogService.instance = new UnifiedCatalogService();
        }
        return UnifiedCatalogService.instance;
    }
    /**
     * Búsqueda unificada en todos los catálogos
     */
    searchUnified(searchTerm_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, options = {}) {
            const startTime = Date.now();
            const { limit = 50, includeInactive = false, searchInImages = true, searchInBasic = true, searchInConcepts = true, category } = options;
            console.log(`[UnifiedCatalogService] Búsqueda unificada: "${searchTerm}"`);
            try {
                const promises = [];
                // Búsqueda en conceptos (para obtener términos normalizados)
                if (searchInConcepts) {
                    promises.push(this.searchConcepts(searchTerm, { limit: 10, includeInactive }));
                }
                // Búsqueda en catálogo básico
                if (searchInBasic) {
                    promises.push(this.searchBasicProducts(searchTerm, { limit, includeInactive }));
                }
                // Búsqueda en catálogo con imágenes
                if (searchInImages) {
                    promises.push(this.searchProductsWithImages(searchTerm, { limit, includeInactive, category }));
                }
                const results = yield Promise.all(promises);
                let conceptMappings = [];
                let basicProducts = [];
                let productsWithImages = [];
                // Procesar resultados según lo que se buscó
                let resultIndex = 0;
                if (searchInConcepts) {
                    conceptMappings = results[resultIndex++] || [];
                }
                if (searchInBasic) {
                    basicProducts = results[resultIndex++] || [];
                }
                if (searchInImages) {
                    productsWithImages = results[resultIndex++] || [];
                }
                // Generar sugerencias basadas en conceptos
                const suggestions = this.generateSuggestions(searchTerm, conceptMappings);
                const totalResults = basicProducts.length + productsWithImages.length + conceptMappings.length;
                const searchTime = Date.now() - startTime;
                console.log(`[UnifiedCatalogService] ✅ Búsqueda completada: ${totalResults} resultados en ${searchTime}ms`);
                return {
                    basicProducts,
                    conceptMappings,
                    productsWithImages,
                    totalResults,
                    searchTime,
                    query: searchTerm,
                    suggestions
                };
            }
            catch (error) {
                console.error('[UnifiedCatalogService] ❌ Error en búsqueda unificada:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar en catálogo básico
     */
    searchBasicProducts(searchTerm_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, options = {}) {
            const { limit = 50, includeInactive = false } = options;
            if (!supabase_1.supabase) {
                throw new Error('Supabase client is not initialized');
            }
            try {
                let query = supabase_1.supabase
                    .from('product_basic_catalog')
                    .select('*');
                if (!includeInactive) {
                    query = query.eq('is_active', true);
                }
                if (searchTerm && searchTerm.trim()) {
                    const cleanTerm = searchTerm.trim();
                    query = query.or(`nombre.ilike.%${cleanTerm}%,clave.ilike.%${cleanTerm}%`);
                }
                const { data, error } = yield query
                    .order('nombre', { ascending: true })
                    .limit(limit);
                if (error)
                    throw error;
                return data || [];
            }
            catch (error) {
                console.error('[UnifiedCatalogService] Error en búsqueda básica:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar en conceptos
     */
    searchConcepts(searchTerm_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, options = {}) {
            const { limit = 20, includeInactive = false } = options;
            if (!supabase_1.supabase) {
                throw new Error('Supabase client is not initialized');
            }
            try {
                let query = supabase_1.supabase
                    .from('concepts_mapping')
                    .select('*');
                if (!includeInactive) {
                    query = query.eq('is_active', true);
                }
                if (searchTerm && searchTerm.trim()) {
                    // Buscar tanto en pieza como en variantes
                    const cleanTerm = searchTerm.trim().toLowerCase();
                    query = query.or(`pieza.ilike.%${cleanTerm}%,variantes_normalized.cs.{${cleanTerm}}`);
                }
                const { data, error } = yield query
                    .order('usage_count', { ascending: false })
                    .limit(limit);
                if (error)
                    throw error;
                // Incrementar contador de uso para conceptos encontrados
                if (data && data.length > 0) {
                    this.incrementUsageCount(data.map(item => item.id));
                }
                return data || [];
            }
            catch (error) {
                console.error('[UnifiedCatalogService] Error en búsqueda de conceptos:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar en catálogo con imágenes
     */
    searchProductsWithImages(searchTerm_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, options = {}) {
            const { limit = 50, includeInactive = false, category } = options;
            if (!supabase_1.supabase) {
                throw new Error('Supabase client is not initialized');
            }
            try {
                let query = supabase_1.supabase
                    .from('product_catalog_with_images')
                    .select('*');
                if (!includeInactive) {
                    query = query.eq('is_active', true);
                }
                if (category) {
                    query = query.eq('categoria', category);
                }
                if (searchTerm && searchTerm.trim()) {
                    const cleanTerm = searchTerm.trim();
                    query = query.or(`titulo.ilike.%${cleanTerm}%,categoria.ilike.%${cleanTerm}%`);
                }
                const { data, error } = yield query
                    .order('has_images', { ascending: false }) // Productos con imágenes primero
                    .order('titulo', { ascending: true })
                    .limit(limit);
                if (error)
                    throw error;
                return data || [];
            }
            catch (error) {
                console.error('[UnifiedCatalogService] Error en búsqueda con imágenes:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar usando términos normalizados de conceptos
     */
    searchWithNormalizedTerms(searchTerm_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, limit = 30) {
            console.log(`[UnifiedCatalogService] Búsqueda con términos normalizados: "${searchTerm}"`);
            try {
                // Primero buscar conceptos que coincidan
                const concepts = yield this.searchConcepts(searchTerm, { limit: 5 });
                // Extraer términos técnicos de los conceptos encontrados
                const technicalTerms = concepts.map(concept => concept.pieza);
                const allVariants = concepts.flatMap(concept => concept.variantes);
                // Crear lista de términos de búsqueda expandida
                const searchTerms = [searchTerm, ...technicalTerms, ...allVariants]
                    .filter((term, index, array) => array.indexOf(term) === index) // Eliminar duplicados
                    .slice(0, 10); // Máximo 10 términos
                console.log(`[UnifiedCatalogService] Términos de búsqueda expandidos: ${searchTerms.join(', ')}`);
                // Buscar en todos los catálogos usando términos expandidos
                const promises = searchTerms.map(term => this.searchUnified(term, {
                    limit: Math.ceil(limit / searchTerms.length),
                    searchInConcepts: false // Evitar recursión
                }));
                const results = yield Promise.all(promises);
                // Combinar y deduplicar resultados
                const combinedBasicProducts = new Map();
                const combinedProductsWithImages = new Map();
                const combinedConcepts = concepts; // Ya los tenemos
                results.forEach(result => {
                    result.basicProducts.forEach(product => {
                        combinedBasicProducts.set(product.id, product);
                    });
                    result.productsWithImages.forEach(product => {
                        combinedProductsWithImages.set(product.id, product);
                    });
                });
                return {
                    basicProducts: Array.from(combinedBasicProducts.values()).slice(0, limit),
                    conceptMappings: combinedConcepts,
                    productsWithImages: Array.from(combinedProductsWithImages.values()).slice(0, limit),
                    totalResults: combinedBasicProducts.size + combinedProductsWithImages.size + combinedConcepts.length,
                    searchTime: 0, // Se calculará externamente
                    query: searchTerm,
                    suggestions: this.generateSuggestions(searchTerm, combinedConcepts)
                };
            }
            catch (error) {
                console.error('[UnifiedCatalogService] Error en búsqueda normalizada:', error);
                throw error;
            }
        });
    }
    /**
     * Obtener estadísticas de todos los catálogos
     */
    getCatalogStats() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            if (!supabase_1.supabase) {
                throw new Error('Supabase client is not initialized');
            }
            try {
                const [basicStats, conceptStats, imageStats] = yield Promise.all([
                    supabase_1.supabase.from('product_basic_catalog').select('is_active'),
                    supabase_1.supabase.from('concepts_mapping').select('is_active'),
                    supabase_1.supabase.from('product_catalog_with_images').select('is_active, has_images')
                ]);
                const basicProducts = {
                    total: ((_a = basicStats.data) === null || _a === void 0 ? void 0 : _a.length) || 0,
                    active: ((_b = basicStats.data) === null || _b === void 0 ? void 0 : _b.filter(item => item.is_active).length) || 0
                };
                const concepts = {
                    total: ((_c = conceptStats.data) === null || _c === void 0 ? void 0 : _c.length) || 0,
                    active: ((_d = conceptStats.data) === null || _d === void 0 ? void 0 : _d.filter(item => item.is_active).length) || 0
                };
                const productsWithImages = {
                    total: ((_e = imageStats.data) === null || _e === void 0 ? void 0 : _e.length) || 0,
                    active: ((_f = imageStats.data) === null || _f === void 0 ? void 0 : _f.filter(item => item.is_active).length) || 0,
                    withImages: ((_g = imageStats.data) === null || _g === void 0 ? void 0 : _g.filter(item => item.has_images).length) || 0
                };
                const totalRecords = basicProducts.total + concepts.total + productsWithImages.total;
                return { basicProducts, concepts, productsWithImages, totalRecords };
            }
            catch (error) {
                console.error('[UnifiedCatalogService] Error obteniendo estadísticas:', error);
                throw error;
            }
        });
    }
    /**
     * Obtener todas las categorías disponibles
     */
    getAllCategories() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!supabase_1.supabase) {
                throw new Error('Supabase client is not initialized');
            }
            const cacheKey = 'all_categories';
            const cached = this.cache.get(cacheKey);
            if (cached && cached.expiry > Date.now()) {
                return cached.data;
            }
            try {
                const { data, error } = yield supabase_1.supabase
                    .from('product_catalog_with_images')
                    .select('categoria')
                    .eq('is_active', true)
                    .not('categoria', 'is', null);
                if (error)
                    throw error;
                const categories = [...new Set(data === null || data === void 0 ? void 0 : data.map(item => item.categoria).filter(Boolean))];
                categories.sort();
                this.cache.set(cacheKey, {
                    data: categories,
                    expiry: Date.now() + this.CACHE_TTL
                });
                return categories;
            }
            catch (error) {
                console.error('[UnifiedCatalogService] Error obteniendo categorías:', error);
                throw error;
            }
        });
    }
    /**
     * Generar sugerencias basadas en conceptos
     */
    generateSuggestions(searchTerm, concepts) {
        const suggestions = new Set();
        concepts.forEach(concept => {
            // Agregar el término técnico
            suggestions.add(concept.pieza);
            // Agregar variantes que no sean iguales al término de búsqueda
            concept.variantes.forEach(variant => {
                if (variant.toLowerCase() !== searchTerm.toLowerCase()) {
                    suggestions.add(variant);
                }
            });
        });
        return Array.from(suggestions).slice(0, 5); // Máximo 5 sugerencias
    }
    /**
     * Incrementar contador de uso de conceptos
     */
    incrementUsageCount(conceptIds) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!supabase_1.supabase) {
                return; // Silenciosamente fallar si supabase no está disponible
            }
            try {
                // Incrementar en background, no bloquear búsqueda
                const supabaseClient = supabase_1.supabase; // Capturar referencia local
                Promise.resolve().then(() => __awaiter(this, void 0, void 0, function* () {
                    for (const id of conceptIds) {
                        yield supabaseClient.rpc('increment_concept_usage', { concept_id: id });
                    }
                })).catch(error => {
                    console.error('[UnifiedCatalogService] Error incrementando contador:', error);
                });
            }
            catch (error) {
                // Ignorar errores de contador
            }
        });
    }
    /**
     * Limpiar cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[UnifiedCatalogService] Cache limpiado');
    }
}
exports.UnifiedCatalogService = UnifiedCatalogService;
// Crear función SQL para incrementar contador de uso
function createIncrementUsageFunction() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!supabase_1.supabase) {
            console.warn('[UnifiedCatalogService] Supabase client is not initialized, skipping function creation');
            return;
        }
        try {
            yield supabase_1.supabase.rpc('exec_sql', {
                sql: `
        CREATE OR REPLACE FUNCTION increment_concept_usage(concept_id UUID)
        RETURNS VOID AS $$
        BEGIN
          UPDATE concepts_mapping 
          SET usage_count = usage_count + 1, updated_at = NOW()
          WHERE id = concept_id;
        END;
        $$ LANGUAGE plpgsql;
      `
            });
            console.log('[UnifiedCatalogService] Función de incremento creada');
        }
        catch (error) {
            console.error('[UnifiedCatalogService] Error creando función:', error);
        }
    });
}
// Exportar instancia singleton
exports.unifiedCatalogService = UnifiedCatalogService.getInstance();
