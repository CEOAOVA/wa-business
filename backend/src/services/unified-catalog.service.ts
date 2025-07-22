import { supabase } from '../config/supabase';

// Interfaces para los diferentes tipos de catálogo
export interface BasicProduct {
  id: string;
  clave?: string;
  nombre: string;
  clave_normalized?: string;
  is_active: boolean;
  created_at: string;
}

export interface ConceptMapping {
  id: string;
  pieza: string;
  variantes: string[];
  pieza_normalized?: string;
  variantes_normalized?: string[];
  usage_count: number;
  is_active: boolean;
}

export interface ProductWithImages {
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
  titulo_normalized?: string;
  total_images: number;
  has_images: boolean;
  main_image_url?: string;
  is_active: boolean;
}

export interface UnifiedSearchResult {
  basicProducts: BasicProduct[];
  conceptMappings: ConceptMapping[];
  productsWithImages: ProductWithImages[];
  totalResults: number;
  searchTime: number;
  query: string;
  suggestions?: string[];
}

export interface SearchOptions {
  limit?: number;
  includeInactive?: boolean;
  searchInImages?: boolean;
  searchInBasic?: boolean;
  searchInConcepts?: boolean;
  category?: string;
}

export class UnifiedCatalogService {
  private static instance: UnifiedCatalogService;
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  public static getInstance(): UnifiedCatalogService {
    if (!UnifiedCatalogService.instance) {
      UnifiedCatalogService.instance = new UnifiedCatalogService();
    }
    return UnifiedCatalogService.instance;
  }

  /**
   * Búsqueda unificada en todos los catálogos
   */
  async searchUnified(
    searchTerm: string,
    options: SearchOptions = {}
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    const {
      limit = 50,
      includeInactive = false,
      searchInImages = true,
      searchInBasic = true,
      searchInConcepts = true,
      category
    } = options;

    console.log(`[UnifiedCatalogService] Búsqueda unificada: "${searchTerm}"`);

    try {
      const promises: Promise<any>[] = [];
      
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

      const results = await Promise.all(promises);
      
      let conceptMappings: ConceptMapping[] = [];
      let basicProducts: BasicProduct[] = [];
      let productsWithImages: ProductWithImages[] = [];

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

    } catch (error) {
      console.error('[UnifiedCatalogService] ❌ Error en búsqueda unificada:', error);
      throw error;
    }
  }

  /**
   * Buscar en catálogo básico
   */
  async searchBasicProducts(
    searchTerm: string,
    options: { limit?: number; includeInactive?: boolean } = {}
  ): Promise<BasicProduct[]> {
    const { limit = 50, includeInactive = false } = options;

    try {
      let query = supabase
        .from('product_basic_catalog')
        .select('*');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      if (searchTerm && searchTerm.trim()) {
        const cleanTerm = searchTerm.trim();
        query = query.or(`nombre.ilike.%${cleanTerm}%,clave.ilike.%${cleanTerm}%`);
      }

      const { data, error } = await query
        .order('nombre', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('[UnifiedCatalogService] Error en búsqueda básica:', error);
      throw error;
    }
  }

  /**
   * Buscar en conceptos
   */
  async searchConcepts(
    searchTerm: string,
    options: { limit?: number; includeInactive?: boolean } = {}
  ): Promise<ConceptMapping[]> {
    const { limit = 20, includeInactive = false } = options;

    try {
      let query = supabase
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

      const { data, error } = await query
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Incrementar contador de uso para conceptos encontrados
      if (data && data.length > 0) {
        this.incrementUsageCount(data.map(item => item.id));
      }

      return data || [];

    } catch (error) {
      console.error('[UnifiedCatalogService] Error en búsqueda de conceptos:', error);
      throw error;
    }
  }

  /**
   * Buscar en catálogo con imágenes
   */
  async searchProductsWithImages(
    searchTerm: string,
    options: { limit?: number; includeInactive?: boolean; category?: string } = {}
  ): Promise<ProductWithImages[]> {
    const { limit = 50, includeInactive = false, category } = options;

    try {
      let query = supabase
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

      const { data, error } = await query
        .order('has_images', { ascending: false }) // Productos con imágenes primero
        .order('titulo', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('[UnifiedCatalogService] Error en búsqueda con imágenes:', error);
      throw error;
    }
  }

  /**
   * Buscar usando términos normalizados de conceptos
   */
  async searchWithNormalizedTerms(searchTerm: string, limit: number = 30): Promise<UnifiedSearchResult> {
    console.log(`[UnifiedCatalogService] Búsqueda con términos normalizados: "${searchTerm}"`);

    try {
      // Primero buscar conceptos que coincidan
      const concepts = await this.searchConcepts(searchTerm, { limit: 5 });
      
      // Extraer términos técnicos de los conceptos encontrados
      const technicalTerms = concepts.map(concept => concept.pieza);
      const allVariants = concepts.flatMap(concept => concept.variantes);
      
      // Crear lista de términos de búsqueda expandida
      const searchTerms = [searchTerm, ...technicalTerms, ...allVariants]
        .filter((term, index, array) => array.indexOf(term) === index) // Eliminar duplicados
        .slice(0, 10); // Máximo 10 términos

      console.log(`[UnifiedCatalogService] Términos de búsqueda expandidos: ${searchTerms.join(', ')}`);

      // Buscar en todos los catálogos usando términos expandidos
      const promises = searchTerms.map(term => 
        this.searchUnified(term, { 
          limit: Math.ceil(limit / searchTerms.length),
          searchInConcepts: false // Evitar recursión
        })
      );

      const results = await Promise.all(promises);

      // Combinar y deduplicar resultados
      const combinedBasicProducts = new Map<string, BasicProduct>();
      const combinedProductsWithImages = new Map<string, ProductWithImages>();
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

    } catch (error) {
      console.error('[UnifiedCatalogService] Error en búsqueda normalizada:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de todos los catálogos
   */
  async getCatalogStats(): Promise<{
    basicProducts: { total: number; active: number };
    concepts: { total: number; active: number };
    productsWithImages: { total: number; active: number; withImages: number };
    totalRecords: number;
  }> {
    try {
      const [basicStats, conceptStats, imageStats] = await Promise.all([
        supabase.from('product_basic_catalog').select('is_active'),
        supabase.from('concepts_mapping').select('is_active'),
        supabase.from('product_catalog_with_images').select('is_active, has_images')
      ]);

      const basicProducts = {
        total: basicStats.data?.length || 0,
        active: basicStats.data?.filter(item => item.is_active).length || 0
      };

      const concepts = {
        total: conceptStats.data?.length || 0,
        active: conceptStats.data?.filter(item => item.is_active).length || 0
      };

      const productsWithImages = {
        total: imageStats.data?.length || 0,
        active: imageStats.data?.filter(item => item.is_active).length || 0,
        withImages: imageStats.data?.filter(item => item.has_images).length || 0
      };

      const totalRecords = basicProducts.total + concepts.total + productsWithImages.total;

      return { basicProducts, concepts, productsWithImages, totalRecords };

    } catch (error) {
      console.error('[UnifiedCatalogService] Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las categorías disponibles
   */
  async getAllCategories(): Promise<string[]> {
    const cacheKey = 'all_categories';
    
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('product_catalog_with_images')
        .select('categoria')
        .eq('is_active', true)
        .not('categoria', 'is', null);

      if (error) throw error;

      const categories = [...new Set(data?.map(item => item.categoria).filter(Boolean))] as string[];
      categories.sort();

      this.cache.set(cacheKey, {
        data: categories,
        expiry: Date.now() + this.CACHE_TTL
      });

      return categories;

    } catch (error) {
      console.error('[UnifiedCatalogService] Error obteniendo categorías:', error);
      throw error;
    }
  }

  /**
   * Generar sugerencias basadas en conceptos
   */
  private generateSuggestions(searchTerm: string, concepts: ConceptMapping[]): string[] {
    const suggestions = new Set<string>();
    
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
  private async incrementUsageCount(conceptIds: string[]): Promise<void> {
    try {
      // Incrementar en background, no bloquear búsqueda
      Promise.resolve().then(async () => {
        for (const id of conceptIds) {
          await supabase.rpc('increment_concept_usage', { concept_id: id });
        }
      }).catch(error => {
        console.error('[UnifiedCatalogService] Error incrementando contador:', error);
      });
    } catch (error) {
      // Ignorar errores de contador
    }
  }

  /**
   * Limpiar cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[UnifiedCatalogService] Cache limpiado');
  }
}

// Crear función SQL para incrementar contador de uso
export async function createIncrementUsageFunction(): Promise<void> {
  try {
    await supabase.rpc('exec_sql', {
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
  } catch (error) {
    console.error('[UnifiedCatalogService] Error creando función:', error);
  }
}

// Exportar instancia singleton
export const unifiedCatalogService = UnifiedCatalogService.getInstance(); 