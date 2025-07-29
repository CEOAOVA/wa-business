/**
 * Servicio para mapear conceptos coloquiales mexicanos a términos técnicos
 * Mejora la búsqueda de productos con terminología local
 */
import { normalizeForSearch } from '../utils/text-processing';
import { supabase } from '../config/supabase';
import path from 'path';
import fs from 'fs';

interface ConceptMapping {
  pieza: string;           // Término técnico
  variantes: string[];     // Variantes coloquiales
  categoria?: string;      // Categoría del producto
}

export class ConceptsService {
  private conceptMappings: ConceptMapping[] = [];
  private variantMap = new Map<string, string>();
  private isLoaded = false;
  private productImageMap = new Map<string, string>();

  constructor() {
    this.loadConceptMappings();
  }

  /**
   * Carga los mapeos de conceptos desde la tabla conceptos_json de Supabase
   */
  private async loadConceptMappings(): Promise<void> {
    try {
      console.log('[ConceptsService] Cargando conceptos desde Supabase...');
      
      if (!supabase) {
        console.error('[ConceptsService] Supabase no está configurado');
        this.loadBasicMappings();
        return;
      }

      // Consultar directamente la tabla conceptos_json
      const { data, error } = await supabase
        .from('conceptos_json')
        .select('*');

      if (error) {
        console.error('[ConceptsService] Error cargando conceptos:', error);
        // Fallback a mapeos básicos
        this.loadBasicMappings();
        return;
      }

      // Convertir datos de Supabase al formato interno
      this.conceptMappings = data.map((item: any) => ({
        pieza: item.pieza || item.termino_tecnico || '',
        variantes: item.variantes || item.terminos_coloquiales || [],
        categoria: item.categoria || 'general'
      }));

      // Crear mapa inverso para búsqueda rápida
      this.variantMap.clear();
      this.conceptMappings.forEach(mapping => {
        mapping.variantes.forEach(variante => {
          const normalized = this.normalizeTerm(variante);
          this.variantMap.set(normalized, mapping.pieza);
        });
      });

      this.isLoaded = true;
      console.log(`[ConceptsService] ✅ Cargados ${this.conceptMappings.length} conceptos desde Supabase`);
      console.log(`[ConceptsService] ✅ Total de variantes: ${this.variantMap.size}`);

    } catch (error) {
      console.error('[ConceptsService] Error en carga de conceptos:', error);
      this.loadBasicMappings();
    }
  }

  /**
   * Carga mapeos básicos como fallback
   */
  private loadBasicMappings(): void {
    const basicMappings: ConceptMapping[] = [
      {
        pieza: 'pastillas de freno',
        variantes: ['balatas', 'pastillas', 'frenos', 'pastillas de freno'],
        categoria: 'frenos'
      },
      {
        pieza: 'discos de freno',
        variantes: ['discos', 'rotores', 'discos de freno'],
        categoria: 'frenos'
      },
      {
        pieza: 'filtro de aceite',
        variantes: ['filtro aceite', 'filtro de aceite'],
        categoria: 'motor'
      },
      {
        pieza: 'filtro de aire',
        variantes: ['filtro aire', 'filtro de aire'],
        categoria: 'motor'
      }
    ];

    this.conceptMappings = basicMappings;
    this.variantMap.clear();
    this.conceptMappings.forEach(mapping => {
      mapping.variantes.forEach(variante => {
        const normalized = this.normalizeTerm(variante);
        this.variantMap.set(normalized, mapping.pieza);
      });
    });

    this.isLoaded = true;
    console.log(`[ConceptsService] ✅ Cargados ${this.conceptMappings.length} conceptos básicos`);
  }

  /**
   * Busca imagen de producto en el directorio público
   */
  private loadProductImages(): void {
    try {
      const imagesPath = path.join(process.cwd(), 'public', 'embler', 'inventario', 'images');
      
      if (!fs.existsSync(imagesPath)) {
        console.warn('[ConceptsService] ⚠️ Directorio de imágenes no encontrado');
        return;
      }

      const files = fs.readdirSync(imagesPath);
      
      files.forEach(file => {
        if (file.endsWith('.jpg') || file.endsWith('.png')) {
          const productName = file.replace(/\.(jpg|png)$/i, '').toLowerCase();
          this.productImageMap.set(productName, `/embler/inventario/images/${file}`);
        }
      });

      console.log(`[ConceptsService] ✅ Cargadas ${this.productImageMap.size} imágenes de productos`);

    } catch (error) {
      console.error('[ConceptsService] ❌ Error cargando imágenes:', error);
    }
  }

  /**
   * Obtiene la imagen de un producto
   */
  getProductImage(productName: string): string | undefined {
    const normalizedName = this.normalizeTerm(productName);
    
    // Buscar coincidencia exacta
    if (this.productImageMap.has(normalizedName)) {
      return this.productImageMap.get(normalizedName);
    }

    // Buscar coincidencia parcial
    for (const [key, value] of this.productImageMap.entries()) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Normaliza un término de búsqueda usando conceptos_json
   */
  normalizeSearchTerm(searchTerm: string): string {
    if (!searchTerm || typeof searchTerm !== 'string') {
      return '';
    }

    const normalizedInput = this.normalizeTerm(searchTerm);
    console.log(`[ConceptsService] Normalizando: "${searchTerm}" -> "${normalizedInput}"`);

    // Buscar en el mapa de variantes
    if (this.variantMap.has(normalizedInput)) {
      const technicalTerm = this.variantMap.get(normalizedInput)!;
      console.log(`[ConceptsService] Encontrado mapeo: "${normalizedInput}" -> "${technicalTerm}"`);
      return technicalTerm;
    }

    // Si no se encuentra, devolver el término original normalizado
    return normalizedInput;
  }

  /**
   * Verifica si una palabra está relacionada con productos
   */
  private isProductRelatedWord(word: string): boolean {
    const productKeywords = [
      'pieza', 'parte', 'componente', 'repuesto', 'accesorio',
      'freno', 'motor', 'transmision', 'suspension', 'electrico',
      'filtro', 'aceite', 'agua', 'aire', 'combustible'
    ];

    return productKeywords.some(keyword => 
      word.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Convierte un término de usuario a su nombre técnico
   */
  convertToTechnicalName(userTerm: string): string {
    const normalized = this.normalizeSearchTerm(userTerm);
    
    if (normalized !== userTerm.toLowerCase().trim()) {
      return normalized;
    }

    // Si no se encontró mapeo, devolver el término original
    return userTerm.toLowerCase().trim();
  }

  /**
   * Procesa texto completo para extraer términos técnicos
   */
  processFullText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const words = text.toLowerCase().split(/\s+/);
    const processedWords = words.map(word => {
      const normalized = this.normalizeTerm(word);
      return this.variantMap.has(normalized) ? this.variantMap.get(normalized)! : word;
    });

    return processedWords.join(' ');
  }

  /**
   * Obtiene sugerencias para un término
   */
  getSuggestions(term: string): string[] {
    if (!term || typeof term !== 'string') {
      return [];
    }

    const normalizedTerm = this.normalizeTerm(term);
    const suggestions: string[] = [];

    // Buscar coincidencias parciales
    for (const [variant, technical] of this.variantMap.entries()) {
      if (variant.includes(normalizedTerm) || normalizedTerm.includes(variant)) {
        suggestions.push(technical);
      }
    }

    // Eliminar duplicados y limitar resultados
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Normaliza un término para búsqueda
   */
  private normalizeTerm(term: string): string {
    return normalizeForSearch(term);
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats(): {
    totalMappings: number;
    totalVariants: number;
    categorías: string[];
    hasImages: boolean;
  } {
    const categorías = [...new Set(this.conceptMappings.map(m => m.categoria || 'general'))];
    
    return {
      totalMappings: this.conceptMappings.length,
      totalVariants: this.variantMap.size,
      categorías,
      hasImages: this.productImageMap.size > 0
    };
  }
}

// Instancia singleton
export const conceptsService = new ConceptsService(); 