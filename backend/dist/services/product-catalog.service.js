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
exports.productCatalogService = exports.ProductCatalogService = void 0;
const supabase_1 = require("../config/supabase");
class ProductCatalogService {
    constructor() {
        this.cache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos
    }
    static getInstance() {
        if (!ProductCatalogService.instance) {
            ProductCatalogService.instance = new ProductCatalogService();
        }
        return ProductCatalogService.instance;
    }
    /**
     * Buscar productos por término de búsqueda
     */
    searchProducts(searchTerm_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, options = {}) {
            const startTime = Date.now();
            const { limit = 50, offset = 0, category, includeInactive = false } = options;
            console.log(`[ProductCatalogService] Buscando productos: "${searchTerm}"`);
            try {
                // Construir query
                if (!supabase_1.supabase) {
                    throw new Error('Supabase no está configurado');
                }
                let query = supabase_1.supabase
                    .from('product_catalog')
                    .select('*', { count: 'exact' });
                // Filtro de activos
                if (!includeInactive) {
                    query = query.eq('is_active', true);
                }
                // Filtro de categoría
                if (category) {
                    query = query.eq('categoria', category);
                }
                // Búsqueda por texto en título
                if (searchTerm && searchTerm.trim()) {
                    const cleanTerm = searchTerm.trim().toLowerCase();
                    query = query.ilike('titulo', `%${cleanTerm}%`);
                }
                // Paginación y orden
                query = query
                    .order('titulo', { ascending: true })
                    .range(offset, offset + limit - 1);
                const { data, error, count } = yield query;
                if (error) {
                    console.error('[ProductCatalogService] Error en búsqueda:', error);
                    throw error;
                }
                const searchTime = Date.now() - startTime;
                console.log(`[ProductCatalogService] ✅ Encontrados ${(data === null || data === void 0 ? void 0 : data.length) || 0} productos en ${searchTime}ms`);
                return {
                    products: data || [],
                    total: count || 0,
                    query: searchTerm,
                    searchTime
                };
            }
            catch (error) {
                console.error('[ProductCatalogService] ❌ Error en búsqueda:', error);
                throw error;
            }
        });
    }
    /**
     * Obtener producto por ID
     */
    getProductById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabase) {
                    throw new Error('Supabase no está configurado');
                }
                const { data, error } = yield supabase_1.supabase
                    .from('product_catalog')
                    .select('*')
                    .eq('id', id)
                    .eq('is_active', true)
                    .single();
                if (error) {
                    if (error.code === 'PGRST116') {
                        return null; // No encontrado
                    }
                    throw error;
                }
                return data;
            }
            catch (error) {
                console.error('[ProductCatalogService] Error obteniendo producto:', error);
                throw error;
            }
        });
    }
    /**
     * Obtener productos por categoría
     */
    getProductsByCategory(category_1) {
        return __awaiter(this, arguments, void 0, function* (category, limit = 20) {
            const cacheKey = `category_${category}_${limit}`;
            // Verificar cache
            const cached = this.cache.get(cacheKey);
            if (cached && cached.expiry > Date.now()) {
                console.log(`[ProductCatalogService] Cache hit para categoría: ${category}`);
                return cached.data;
            }
            try {
                if (!supabase_1.supabase) {
                    throw new Error('Supabase no está configurado');
                }
                const { data, error } = yield supabase_1.supabase
                    .from('product_catalog')
                    .select('*')
                    .eq('categoria', category)
                    .eq('is_active', true)
                    .order('titulo', { ascending: true })
                    .limit(limit);
                if (error) {
                    throw error;
                }
                // Guardar en cache
                this.cache.set(cacheKey, {
                    data: data || [],
                    expiry: Date.now() + this.CACHE_TTL
                });
                console.log(`[ProductCatalogService] ✅ ${(data === null || data === void 0 ? void 0 : data.length) || 0} productos en categoría: ${category}`);
                return data || [];
            }
            catch (error) {
                console.error('[ProductCatalogService] Error obteniendo categoría:', error);
                throw error;
            }
        });
    }
    /**
     * Obtener todas las categorías disponibles
     */
    getCategories() {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = 'all_categories';
            // Verificar cache
            const cached = this.cache.get(cacheKey);
            if (cached && cached.expiry > Date.now()) {
                return cached.data.map(item => item.categoria).filter((cat) => Boolean(cat));
            }
            try {
                if (!supabase_1.supabase) {
                    throw new Error('Supabase no está configurado');
                }
                const { data, error } = yield supabase_1.supabase
                    .from('product_catalog')
                    .select('categoria')
                    .eq('is_active', true)
                    .not('categoria', 'is', null);
                if (error) {
                    throw error;
                }
                const categories = [...new Set(data === null || data === void 0 ? void 0 : data.map(item => item.categoria).filter(Boolean))];
                categories.sort();
                // Guardar en cache (formato compatible)
                this.cache.set(cacheKey, {
                    data: categories.map(cat => ({ categoria: cat })),
                    expiry: Date.now() + this.CACHE_TTL
                });
                console.log(`[ProductCatalogService] ✅ ${categories.length} categorías disponibles`);
                return categories;
            }
            catch (error) {
                console.error('[ProductCatalogService] Error obteniendo categorías:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar productos por múltiples términos (para IA)
     */
    searchProductsAdvanced(terms_1) {
        return __awaiter(this, arguments, void 0, function* (terms, options = {}) {
            const { maxResults = 20, minMatchScore = 0.3 } = options;
            console.log(`[ProductCatalogService] Búsqueda avanzada: ${terms.join(', ')}`);
            if (!terms.length) {
                return [];
            }
            try {
                // Para búsqueda avanzada, usar múltiples consultas y combinar resultados
                const results = new Map();
                for (const term of terms) {
                    if (!term.trim())
                        continue;
                    const searchResult = yield this.searchProducts(term, { limit: maxResults });
                    for (const product of searchResult.products) {
                        const existingResult = results.get(product.id);
                        const termScore = this.calculateMatchScore(product.titulo, term);
                        if (termScore >= minMatchScore) {
                            if (existingResult) {
                                // Incrementar score si ya existe
                                existingResult.score += termScore;
                            }
                            else {
                                // Agregar nuevo resultado
                                results.set(product.id, { product, score: termScore });
                            }
                        }
                    }
                }
                // Ordenar por score y retornar
                const sortedResults = Array.from(results.values())
                    .sort((a, b) => b.score - a.score)
                    .slice(0, maxResults)
                    .map(result => result.product);
                console.log(`[ProductCatalogService] ✅ Búsqueda avanzada: ${sortedResults.length} productos`);
                return sortedResults;
            }
            catch (error) {
                console.error('[ProductCatalogService] Error en búsqueda avanzada:', error);
                throw error;
            }
        });
    }
    /**
     * Obtener estadísticas del catálogo
     */
    getCatalogStats() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!supabase_1.supabase) {
                throw new Error('Supabase no está configurado');
            }
            try {
                const { data, error } = yield supabase_1.supabase
                    .from('product_catalog')
                    .select('is_active, categoria, imagen_1');
                if (error) {
                    throw error;
                }
                const totalProducts = (data === null || data === void 0 ? void 0 : data.length) || 0;
                const activeProducts = (data === null || data === void 0 ? void 0 : data.filter(p => p.is_active).length) || 0;
                const totalCategories = new Set(data === null || data === void 0 ? void 0 : data.map(p => p.categoria).filter(Boolean)).size;
                const productsWithImages = (data === null || data === void 0 ? void 0 : data.filter(p => p.imagen_1).length) || 0;
                return {
                    totalProducts,
                    activeProducts,
                    totalCategories,
                    productsWithImages
                };
            }
            catch (error) {
                console.error('[ProductCatalogService] Error obteniendo estadísticas:', error);
                throw error;
            }
        });
    }
    /**
     * Limpiar cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[ProductCatalogService] Cache limpiado');
    }
    /**
     * Calcular score de coincidencia entre texto y término de búsqueda
     */
    calculateMatchScore(text, term) {
        if (!text || !term)
            return 0;
        const textLower = text.toLowerCase();
        const termLower = term.toLowerCase();
        // Coincidencia exacta
        if (textLower.includes(termLower)) {
            const ratio = termLower.length / textLower.length;
            return Math.min(ratio * 2, 1); // Máximo 1.0
        }
        // Coincidencia parcial por palabras
        const textWords = textLower.split(/\s+/);
        const termWords = termLower.split(/\s+/);
        let matchCount = 0;
        for (const termWord of termWords) {
            for (const textWord of textWords) {
                if (textWord.includes(termWord) || termWord.includes(textWord)) {
                    matchCount++;
                    break;
                }
            }
        }
        return matchCount / Math.max(termWords.length, textWords.length);
    }
}
exports.ProductCatalogService = ProductCatalogService;
// Exportar instancia singleton
exports.productCatalogService = ProductCatalogService.getInstance();
