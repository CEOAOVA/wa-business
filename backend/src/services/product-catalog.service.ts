import { supabase } from '../config/supabase';

export interface ProductCatalogItem {
  id: string;
  titulo: string;
  categoria?: string;
  imagen_1?: string;
  imagen_2?: string;
  imagen_3?: string;
  imagen_4?: string;
  imagen_5?: string;
  imagen_6?: string;
  imagen_7?: string;
  imagen_8?: string;
  imagen_9?: string;
  imagen_10?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSearchResult {
  products: ProductCatalogItem[];
  total: number;
  query: string;
  searchTime: number;
}

export class ProductCatalogService {
  private static instance: ProductCatalogService;
  private cache = new Map<string, { data: ProductCatalogItem[]; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  public static getInstance(): ProductCatalogService {
    if (!ProductCatalogService.instance) {
      ProductCatalogService.instance = new ProductCatalogService();
    }
    return ProductCatalogService.instance;
  }

  /**
   * Buscar productos por término de búsqueda
   */
  async searchProducts(
    searchTerm: string, 
    options: {
      limit?: number;
      offset?: number;
      category?: string;
      includeInactive?: boolean;
    } = {}
  ): Promise<ProductSearchResult> {
    const startTime = Date.now();
    const { limit = 50, offset = 0, category, includeInactive = false } = options;
    
    console.log(`[ProductCatalogService] Buscando productos: "${searchTerm}"`);
    
    try {
      // Construir query
      if (!supabase) {
        throw new Error('Supabase no está configurado');
      }
      
      let query = supabase
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
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('[ProductCatalogService] Error en búsqueda:', error);
        throw error;
      }
      
      const searchTime = Date.now() - startTime;
      
      console.log(`[ProductCatalogService] ✅ Encontrados ${data?.length || 0} productos en ${searchTime}ms`);
      
      return {
        products: data || [],
        total: count || 0,
        query: searchTerm,
        searchTime
      };
      
    } catch (error) {
      console.error('[ProductCatalogService] ❌ Error en búsqueda:', error);
      throw error;
    }
  }

  /**
   * Obtener producto por ID
   */
  async getProductById(id: string): Promise<ProductCatalogItem | null> {
    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado');
      }
      
      const { data, error } = await supabase
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
    } catch (error) {
      console.error('[ProductCatalogService] Error obteniendo producto:', error);
      throw error;
    }
  }

  /**
   * Obtener productos por categoría
   */
  async getProductsByCategory(
    category: string, 
    limit: number = 20
  ): Promise<ProductCatalogItem[]> {
    const cacheKey = `category_${category}_${limit}`;
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.log(`[ProductCatalogService] Cache hit para categoría: ${category}`);
      return cached.data;
    }
    
    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado');
      }
      
      const { data, error } = await supabase
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
      
      console.log(`[ProductCatalogService] ✅ ${data?.length || 0} productos en categoría: ${category}`);
      return data || [];
      
    } catch (error) {
      console.error('[ProductCatalogService] Error obteniendo categoría:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las categorías disponibles
   */
  async getCategories(): Promise<string[]> {
    const cacheKey = 'all_categories';
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data.map(item => item.categoria).filter((cat): cat is string => Boolean(cat));
    }
    
    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado');
      }
      
      const { data, error } = await supabase
        .from('product_catalog')
        .select('categoria')
        .eq('is_active', true)
        .not('categoria', 'is', null);
      
      if (error) {
        throw error;
      }
      
      const categories = [...new Set(data?.map(item => item.categoria).filter(Boolean))] as string[];
      categories.sort();
      
      // Guardar en cache (formato compatible)
      this.cache.set(cacheKey, {
        data: categories.map(cat => ({ categoria: cat })) as any,
        expiry: Date.now() + this.CACHE_TTL
      });
      
      console.log(`[ProductCatalogService] ✅ ${categories.length} categorías disponibles`);
      return categories;
      
    } catch (error) {
      console.error('[ProductCatalogService] Error obteniendo categorías:', error);
      throw error;
    }
  }

  /**
   * Buscar productos por múltiples términos (para IA)
   */
  async searchProductsAdvanced(
    terms: string[], 
    options: {
      maxResults?: number;
      minMatchScore?: number;
    } = {}
  ): Promise<ProductCatalogItem[]> {
    const { maxResults = 20, minMatchScore = 0.3 } = options;
    
    console.log(`[ProductCatalogService] Búsqueda avanzada: ${terms.join(', ')}`);
    
    if (!terms.length) {
      return [];
    }
    
    try {
      // Para búsqueda avanzada, usar múltiples consultas y combinar resultados
      const results = new Map<string, { product: ProductCatalogItem; score: number }>();
      
      for (const term of terms) {
        if (!term.trim()) continue;
        
        const searchResult = await this.searchProducts(term, { limit: maxResults });
        
        for (const product of searchResult.products) {
          const existingResult = results.get(product.id);
          const termScore = this.calculateMatchScore(product.titulo, term);
          
          if (termScore >= minMatchScore) {
            if (existingResult) {
              // Incrementar score si ya existe
              existingResult.score += termScore;
            } else {
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
      
    } catch (error) {
      console.error('[ProductCatalogService] Error en búsqueda avanzada:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del catálogo
   */
  async getCatalogStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    productsWithImages: number;
  }> {
    if (!supabase) {
      throw new Error('Supabase no está configurado');
    }
    try {
      const { data, error } = await supabase
        .from('product_catalog')
        .select('is_active, categoria, imagen_1');
      
      if (error) {
        throw error;
      }
      
      const totalProducts = data?.length || 0;
      const activeProducts = data?.filter(p => p.is_active).length || 0;
      const totalCategories = new Set(data?.map(p => p.categoria).filter(Boolean)).size;
      const productsWithImages = data?.filter(p => p.imagen_1).length || 0;
      
      return {
        totalProducts,
        activeProducts,
        totalCategories,
        productsWithImages
      };
      
    } catch (error) {
      console.error('[ProductCatalogService] Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Limpiar cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[ProductCatalogService] Cache limpiado');
  }

  /**
   * Calcular score de coincidencia entre texto y término de búsqueda
   */
  private calculateMatchScore(text: string, term: string): number {
    if (!text || !term) return 0;
    
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

// Exportar instancia singleton
export const productCatalogService = ProductCatalogService.getInstance(); 