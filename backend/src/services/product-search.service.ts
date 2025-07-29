import { supabase } from '../config/supabase';
import { ConceptsService } from './concepts-service';
import { 
  CarData, 
  ProductMatch, 
  ProductDetails, 
  SearchResult, 
  ConfirmationResult,
  ProductSearchFlow,
  ProductSearchOptions 
} from '../types/product-search';

export class ProductSearchService {
  private conceptsService: ConceptsService;

  constructor() {
    this.conceptsService = new ConceptsService();
  }

  /**
   * 1. Normalizar término de búsqueda usando conceptos_json
   */
  async normalizeSearchTerm(userTerm: string): Promise<string> {
    try {
      console.log(`[ProductSearchService] Normalizando término: "${userTerm}"`);
      
      // Usar ConceptsService para normalizar
      const normalizedTerm = this.conceptsService.normalizeSearchTerm(userTerm);
      
      console.log(`[ProductSearchService] Término normalizado: "${normalizedTerm}"`);
      return normalizedTerm;
      
    } catch (error) {
      console.error('[ProductSearchService] Error normalizando término:', error);
      // Si falla la normalización, usar el término original
      return userTerm.toLowerCase().trim();
    }
  }

  /**
   * 2. Buscar productos en c_embler_json por nombre + datos del auto
   */
  async searchProductsByName(
    searchTerm: string, 
    carData: CarData, 
    options: ProductSearchOptions = {}
  ): Promise<ProductMatch[]> {
    const startTime = Date.now();
    const { limit = 20, minConfidence = 0.3 } = options;

    try {
      console.log(`[ProductSearchService] Buscando productos: "${searchTerm}" para ${carData.marca} ${carData.modelo} ${carData.año}`);

      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // Construir query para c_embler_json
      let query = supabase
        .from('c_embler_json')
        .select('catalogo')
        .limit(limit);

      // Buscar en el campo nombre del JSON
      if (searchTerm && searchTerm.trim()) {
        const cleanTerm = searchTerm.trim().toLowerCase();
        query = query.textSearch('catalogo->>Nombre', cleanTerm);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ProductSearchService] Error en búsqueda:', error);
        throw error;
      }

      // Procesar resultados y calcular compatibilidad
      const matches: ProductMatch[] = [];
      
      for (const item of data || []) {
        const catalogItem = item.catalogo;
        if (!catalogItem || !catalogItem.Nombre) continue;

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
        if (a.carCompatibility && !b.carCompatibility) return -1;
        if (!a.carCompatibility && b.carCompatibility) return 1;
        return b.confidence - a.confidence;
      });

      const searchTime = Date.now() - startTime;
      console.log(`[ProductSearchService] Encontrados ${matches.length} productos en ${searchTime}ms`);

      return matches.slice(0, limit);

    } catch (error) {
      console.error('[ProductSearchService] Error en búsqueda de productos:', error);
      return [];
    }
  }

  /**
   * 3. Buscar detalles en c_embler_ml_json por clave
   */
  async getProductDetails(productKey: string): Promise<ProductDetails | null> {
    try {
      console.log(`[ProductSearchService] Buscando detalles para clave: "${productKey}"`);

      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // Limpiar la clave para buscar en c_embler_ml_json
      // En c_embler_json: "0004202902 *1" 
      // En c_embler_ml_json: "0004202902"
      const cleanKey = productKey.split(' ')[0]; // Tomar solo la parte antes del espacio
      console.log(`[ProductSearchService] Clave limpia para búsqueda: "${cleanKey}"`);

      // Buscar en c_embler_ml_json por la clave limpia
      const { data, error } = await supabase
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
        const { data: partialData, error: partialError } = await supabase
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

    } catch (error) {
      console.error('[ProductSearchService] Error obteniendo detalles:', error);
      return null;
    }
  }

  /**
   * 4. Búsqueda completa con flujo integrado
   */
  async searchProductFlow(
    userTerm: string, 
    carData: CarData, 
    options: ProductSearchOptions = {}
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      console.log(`[ProductSearchService] Iniciando flujo de búsqueda: "${userTerm}"`);

      // 1. Normalizar término
      const normalizedTerm = await this.normalizeSearchTerm(userTerm);

      // 2. Buscar productos
      const matches = await this.searchProductsByName(normalizedTerm, carData, options);

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

    } catch (error) {
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
  }

  /**
   * Calcular confianza de coincidencia entre término y nombre del producto
   */
  private calculateMatchConfidence(searchTerm: string, productName: string): number {
    const term = searchTerm.toLowerCase();
    const name = productName.toLowerCase();

    // Coincidencia exacta
    if (name.includes(term)) return 1.0;
    
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
  private checkCarCompatibility(productName: string, carData: CarData): boolean {
    if (!carData.marca && !carData.modelo && !carData.año) return true;

    const name = productName.toLowerCase();
    let compatibility = true;

    if (carData.marca) {
      const brandMatch = name.includes(carData.marca.toLowerCase());
      if (!brandMatch) compatibility = false;
    }

    if (carData.modelo) {
      const modelMatch = name.includes(carData.modelo.toLowerCase());
      if (!modelMatch) compatibility = false;
    }

    if (carData.año) {
      const yearMatch = name.includes(carData.año.toString());
      if (!yearMatch) compatibility = false;
    }

    return compatibility;
  }

  /**
   * Extraer marca del nombre del producto
   */
  private extractBrandFromName(productName: string): string | undefined {
    const brands = ['bmw', 'mercedes', 'audi', 'volkswagen', 'toyota', 'honda', 'ford', 'chevrolet'];
    const name = productName.toLowerCase();
    
    for (const brand of brands) {
      if (name.includes(brand)) return brand.toUpperCase();
    }
    
    return undefined;
  }

  /**
   * Extraer modelo del nombre del producto
   */
  private extractModelFromName(productName: string): string | undefined {
    // Implementar lógica para extraer modelos específicos
    // Por ahora retornar undefined
    return undefined;
  }

  /**
   * Extraer año del nombre del producto
   */
  private extractYearFromName(productName: string): string | undefined {
    const yearMatch = productName.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : undefined;
  }

  /**
   * Generar sugerencias cuando no hay coincidencias
   */
  private generateSuggestions(userTerm: string): string[] {
    // Usar ConceptsService para obtener términos similares
    const suggestions = this.conceptsService.getSuggestions(userTerm);
    return suggestions.slice(0, 3);
  }
}