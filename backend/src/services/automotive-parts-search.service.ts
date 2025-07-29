import { supabase } from '../config/supabase';
import { ConceptsService } from './concepts-service';

export interface CarInfo {
  marca: string;
  modelo: string;
  año?: number;
}

export interface PartSearchResult {
  clave: string;
  marca: string;
  nombre: string;
  confidence: number;
  carCompatibility: boolean;
}

export interface SearchResponse {
  success: boolean;
  results: PartSearchResult[];
  totalFound: number;
  normalizedTerm: string;
  message?: string;
}

export class AutomotivePartsSearchService {
  private conceptsService: ConceptsService;

  constructor() {
    this.conceptsService = new ConceptsService();
  }

  /**
   * Búsqueda principal de piezas automotrices
   * Solo requiere: marca, modelo y nombre de pieza
   */
  async searchAutomotiveParts(
    partName: string,
    carInfo: CarInfo,
    options: { limit?: number; minConfidence?: number } = {}
  ): Promise<SearchResponse> {
    const startTime = Date.now();
    const { limit = 10, minConfidence = 0.3 } = options;

    try {
      console.log(`[AutomotivePartsSearch] Buscando: "${partName}" para ${carInfo.marca} ${carInfo.modelo}`);

      // 1. Normalizar término usando conceptos_json
      const normalizedTerm = await this.normalizePartTerm(partName);
      console.log(`[AutomotivePartsSearch] Término normalizado: "${normalizedTerm}"`);

      // 2. Buscar en c_embler_json
      const results = await this.searchInEmblerCatalog(normalizedTerm, carInfo, { limit, minConfidence });

      const searchTime = Date.now() - startTime;
      console.log(`[AutomotivePartsSearch] Encontrados ${results.length} resultados en ${searchTime}ms`);

      return {
        success: true,
        results,
        totalFound: results.length,
        normalizedTerm,
        message: this.generateResponseMessage(results, carInfo)
      };

    } catch (error) {
      console.error('[AutomotivePartsSearch] Error en búsqueda:', error);
      return {
        success: false,
        results: [],
        totalFound: 0,
        normalizedTerm: partName,
        message: 'No se encontraron piezas para tu vehículo'
      };
    }
  }

  /**
   * Normalizar término usando conceptos_json
   */
  private async normalizePartTerm(userTerm: string): Promise<string> {
    try {
      // Consultar directamente la tabla conceptos_json de Supabase
      if (!supabase) {
        console.error('[AutomotivePartsSearch] Supabase no está configurado');
        return userTerm.toLowerCase().trim();
      }

      const { data, error } = await supabase
        .from('conceptos_json')
        .select('*')
        .ilike('terminos_coloquiales', `%${userTerm.toLowerCase()}%`);

      if (error) {
        console.error('[AutomotivePartsSearch] Error consultando conceptos_json:', error);
        return userTerm.toLowerCase().trim();
      }

      // Si se encuentra un término técnico, usarlo
      if (data && data.length > 0) {
        const normalizedTerm = data[0].termino_tecnico || data[0].pieza;
        console.log(`[AutomotivePartsSearch] Término normalizado: "${userTerm}" -> "${normalizedTerm}"`);
        return normalizedTerm;
      }

      // Fallback al ConceptsService
      const normalizedTerm = this.conceptsService.normalizeSearchTerm(userTerm);
      return normalizedTerm;
    } catch (error) {
      console.error('[AutomotivePartsSearch] Error normalizando término:', error);
      return userTerm.toLowerCase().trim();
    }
  }

  /**
   * Buscar en c_embler_json con filtros específicos
   */
  private async searchInEmblerCatalog(
    searchTerm: string,
    carInfo: CarInfo,
    options: { limit: number; minConfidence: number }
  ): Promise<PartSearchResult[]> {
    const { limit, minConfidence } = options;

    if (!supabase) {
      throw new Error('Supabase client no está inicializado');
    }

    try {
      // Construir query para c_embler_json
      let query = supabase
        .from('c_embler_json')
        .select('catalogo')
        .limit(limit * 2); // Buscar más para filtrar después

      // Buscar en el campo Nombre del JSON (todos en mayúsculas)
      if (searchTerm && searchTerm.trim()) {
        const cleanTerm = searchTerm.trim().toUpperCase();
        query = query.ilike('catalogo->>Nombre', `%${cleanTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[AutomotivePartsSearch] Error en búsqueda:', error);
        throw error;
      }

      // Procesar y filtrar resultados
      const matches: PartSearchResult[] = [];
      
      for (const item of data || []) {
        const catalogItem = item.catalogo;
        if (!catalogItem || !catalogItem.Nombre) continue;

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
        if (a.carCompatibility && !b.carCompatibility) return -1;
        if (!a.carCompatibility && b.carCompatibility) return 1;
        return b.confidence - a.confidence;
      });

      return matches.slice(0, limit);

    } catch (error) {
      console.error('[AutomotivePartsSearch] Error en búsqueda de catálogo:', error);
      return [];
    }
  }

  /**
   * Calcular confianza de coincidencia
   */
  private calculateMatchConfidence(searchTerm: string, productName: string): number {
    const term = searchTerm.toLowerCase();
    const name = productName.toLowerCase();

    // Coincidencia exacta
    if (name.includes(term)) return 1.0;
    
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
  private checkCarCompatibility(productName: string, carInfo: CarInfo): boolean {
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
  private extractBrandFromName(productName: string): string {
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
  private generateResponseMessage(results: PartSearchResult[], carInfo: CarInfo): string {
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