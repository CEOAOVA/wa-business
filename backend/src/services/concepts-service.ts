/**
 * Servicio para mapear conceptos coloquiales mexicanos a términos técnicos
 * Mejora la búsqueda de productos con terminología local
 */
import { normalizeForSearch } from '../utils/text-processing';
import path from 'path';
import fs from 'fs';

interface ConceptMapping {
  pieza: string;           // Término técnico
  variantes: string[];     // Variantes coloquiales
  categoria?: string;      // Categoría del producto
}

// Interfaz para el JSON externo
interface ExternalConceptMapping {
  pieza: string;
  variantes: string[];
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
   * Carga los mapeos de conceptos mexicanos desde múltiples fuentes
   */
  private loadConceptMappings(): void {
    // 1. Cargar conceptos hardcodeados (sistema existente)
    const hardcodedMappings = this.getHardcodedMappings();
    
    // 2. Cargar conceptos desde archivo JSON externo
    const externalMappings = this.loadExternalConceptsJSON();
    
    // 3. Combinar ambos sistemas
    this.conceptMappings = [...hardcodedMappings, ...externalMappings];

    // 4. Crear mapa inverso para búsqueda rápida
    this.variantMap.clear();
    this.conceptMappings.forEach(mapping => {
      mapping.variantes.forEach(variante => {
        const normalized = this.normalizeTerm(variante);
        this.variantMap.set(normalized, mapping.pieza);
      });
    });

    // 5. Cargar mapeo de imágenes (si existe)
    this.loadProductImages();

    this.isLoaded = true;
    console.log(`[ConceptsService] ✅ Cargados ${this.conceptMappings.length} mapeos de conceptos`);
    console.log(`[ConceptsService] ✅ Total de variantes: ${this.variantMap.size}`);
    console.log(`[ConceptsService] ✅ Imágenes de productos: ${this.productImageMap.size}`);
  }

  /**
   * Carga conceptos desde el archivo JSON externo
   */
  private loadExternalConceptsJSON(): ConceptMapping[] {
    try {
      // Ruta al archivo JSON en /public
      const jsonPath = path.join(process.cwd(), 'public', 'embler', 'inventario', 'conceptos.json');
      
      if (!fs.existsSync(jsonPath)) {
        console.warn('[ConceptsService] ⚠️ Archivo conceptos.json no encontrado, usando solo mapeos hardcodeados');
        return [];
      }

      const jsonData = fs.readFileSync(jsonPath, 'utf8');
      const externalConcepts: ExternalConceptMapping[] = JSON.parse(jsonData);
      
      // Convertir al formato interno
      const mappings: ConceptMapping[] = externalConcepts.map(concept => ({
        pieza: concept.pieza,
        variantes: concept.variantes,
        categoria: 'externo'
      }));

      console.log(`[ConceptsService] ✅ Cargados ${mappings.length} conceptos desde JSON externo`);
      return mappings;

    } catch (error) {
      console.error('[ConceptsService] ❌ Error cargando conceptos externos:', error);
      return [];
    }
  }

  /**
   * Busca imagen de producto en el directorio público
   */
  private loadProductImages(): void {
    try {
      const imagesPath = path.join(process.cwd(), 'public', 'embler', 'inventario', 'images');
      
      if (!fs.existsSync(imagesPath)) {
        console.log('[ConceptsService] ℹ️ Directorio de imágenes no encontrado');
        return;
      }

      const imageFiles = fs.readdirSync(imagesPath);
      
      // Mapear archivos de imagen a productos
      imageFiles.forEach(file => {
        if (file.match(/\.(jpg|jpeg|png|webp)$/i)) {
          const productName = path.parse(file).name.toLowerCase();
          const imagePath = `/embler/inventario/images/${file}`;
          this.productImageMap.set(productName, imagePath);
        }
      });

    } catch (error) {
      console.error('[ConceptsService] ❌ Error cargando imágenes:', error);
    }
  }

  /**
   * Obtiene la imagen asociada a un producto
   */
  getProductImage(productName: string): string | undefined {
    const normalized = this.normalizeTerm(productName);
    
    // Buscar imagen exacta
    if (this.productImageMap.has(normalized)) {
      return this.productImageMap.get(normalized);
    }

    // Buscar imagen por coincidencia parcial
    for (const [imageName, imagePath] of this.productImageMap.entries()) {
      if (normalized.includes(imageName) || imageName.includes(normalized)) {
        return imagePath;
      }
    }

    return undefined;
  }

  /**
   * Retorna los mapeos hardcodeados originales
   */
  private getHardcodedMappings(): ConceptMapping[] {
    return [
      // Frenos
      {
        pieza: 'balatas',
        variantes: ['balatas', 'pastillas', 'pastillas de freno', 'frenos delanteros', 'frenos traseros'],
        categoria: 'frenos'
      },
      {
        pieza: 'discos',
        variantes: ['discos', 'discos de freno', 'rotores', 'disco delantero', 'disco trasero'],
        categoria: 'frenos'
      },
      {
        pieza: 'tambores',
        variantes: ['tambores', 'tambor de freno', 'tambor trasero'],
        categoria: 'frenos'
      },
      
      // Suspensión
      {
        pieza: 'amortiguador',
        variantes: ['amortiguador', 'amortiguadores', 'shock', 'shocks', 'suspension'],
        categoria: 'suspension'
      },
      {
        pieza: 'huesitos',
        variantes: ['huesitos', 'huesito', 'terminal', 'terminales', 'terminal direccion', 'rotula'],
        categoria: 'suspension'
      },
      {
        pieza: 'muelles',
        variantes: ['muelles', 'resortes', 'resorte', 'springs'],
        categoria: 'suspension'
      },
      {
        pieza: 'bieletas',
        variantes: ['bieletas', 'bieleta', 'estabilizadora', 'link'],
        categoria: 'suspension'
      },
      
      // Motor
      {
        pieza: 'aceite',
        variantes: ['aceite', 'aceite motor', 'lubricante', 'oil', 'cambio aceite'],
        categoria: 'motor'
      },
      {
        pieza: 'filtro aceite',
        variantes: ['filtro aceite', 'filtro de aceite', 'filtro motor'],
        categoria: 'motor'
      },
      {
        pieza: 'filtro aire',
        variantes: ['filtro aire', 'filtro de aire', 'filtro del aire'],
        categoria: 'motor'
      },
      {
        pieza: 'bujias',
        variantes: ['bujias', 'bujía', 'spark plug', 'chispa'],
        categoria: 'motor'
      },
      {
        pieza: 'banda',
        variantes: ['banda', 'banda serpentina', 'correa', 'belt'],
        categoria: 'motor'
      },
      {
        pieza: 'radiador',
        variantes: ['radiador', 'radiador agua', 'enfriamiento'],
        categoria: 'motor'
      },
      {
        pieza: 'termostato',
        variantes: ['termostato', 'válvula termostática'],
        categoria: 'motor'
      },
      
      // Transmisión
      {
        pieza: 'clutch',
        variantes: ['clutch', 'embrague', 'kit clutch', 'disco clutch', 'prensa'],
        categoria: 'transmision'
      },
      {
        pieza: 'bomba clutch',
        variantes: ['bomba clutch', 'bomba embrague', 'cilindro maestro clutch'],
        categoria: 'transmision'
      },
      {
        pieza: 'caja velocidades',
        variantes: ['caja', 'transmision', 'caja velocidades', 'gearbox'],
        categoria: 'transmision'
      },
      
      // Eléctrico
      {
        pieza: 'bateria',
        variantes: ['bateria', 'acumulador', 'pila', 'battery'],
        categoria: 'electrico'
      },
      {
        pieza: 'alternador',
        variantes: ['alternador', 'generador', 'dínamo'],
        categoria: 'electrico'
      },
      {
        pieza: 'motor arranque',
        variantes: ['motor arranque', 'marcha', 'starter', 'bendix'],
        categoria: 'electrico'
      },
      {
        pieza: 'sensor',
        variantes: ['sensor', 'bulbo', 'switch', 'interruptor'],
        categoria: 'electrico'
      },
      
      // Neumáticos
      {
        pieza: 'llantas',
        variantes: ['llantas', 'llanta', 'neumatico', 'tire', 'goma'],
        categoria: 'neumaticos'
      },
      {
        pieza: 'rines',
        variantes: ['rines', 'rin', 'rueda', 'rim', 'aro'],
        categoria: 'neumaticos'
      },
      
      // Carrocería
      {
        pieza: 'faro',
        variantes: ['faro', 'faros', 'luz', 'luces', 'headlight'],
        categoria: 'carroceria'
      },
      {
        pieza: 'calavera',
        variantes: ['calavera', 'calaveras', 'luz trasera', 'taillight'],
        categoria: 'carroceria'
      },
      {
        pieza: 'espejo',
        variantes: ['espejo', 'espejos', 'retrovisor', 'mirror'],
        categoria: 'carroceria'
      },
      
      // Combustible
      {
        pieza: 'filtro combustible',
        variantes: ['filtro combustible', 'filtro gasolina', 'filtro nafta'],
        categoria: 'combustible'
      },
      {
        pieza: 'bomba gasolina',
        variantes: ['bomba gasolina', 'bomba combustible', 'fuel pump'],
        categoria: 'combustible'
      },
      
      // Aire acondicionado
      {
        pieza: 'compresor aire',
        variantes: ['compresor', 'compresor aire', 'ac', 'aire acondicionado'],
        categoria: 'aire_acondicionado'
      },
      {
        pieza: 'filtro cabina',
        variantes: ['filtro cabina', 'filtro aire cabina', 'filtro polen'],
        categoria: 'aire_acondicionado'
      },
      
      // Dirección
      {
        pieza: 'bomba direccion',
        variantes: ['bomba direccion', 'bomba hidraulica', 'power steering'],
        categoria: 'direccion'
      },
      {
        pieza: 'cremallera',
        variantes: ['cremallera', 'caja direccion', 'rack'],
        categoria: 'direccion'
      },
      
      // Términos generales
      {
        pieza: 'refaccion',
        variantes: ['refaccion', 'refacciones', 'repuesto', 'parte', 'pieza'],
        categoria: 'general'
      },
      {
        pieza: 'original',
        variantes: ['original', 'oem', 'genuino', 'de agencia'],
        categoria: 'general'
      },
      {
        pieza: 'aftermarket',
        variantes: ['aftermarket', 'alternativo', 'compatible', 'generico'],
        categoria: 'general'
      }
    ];
  }

  /**
   * Normaliza un término de búsqueda reemplazando variantes coloquiales con términos formales
   */
  normalizeSearchTerm(searchTerm: string): string {
    if (!this.isLoaded) {
      return searchTerm;
    }

    const normalizedInput = this.normalizeTerm(searchTerm);
    
    // Comprobar si el término completo coincide con una variante
    if (this.variantMap.has(normalizedInput)) {
      const formalTerm = this.variantMap.get(normalizedInput);
      console.log(`[ConceptsService] Término completo "${searchTerm}" normalizado a "${formalTerm}"`);
      return formalTerm!;
    }
    
    // Si no hay coincidencia exacta, revisar tokens individuales
    const tokens = normalizedInput.split(' ');
    let modified = false;
    const productTokens: string[] = [];
    
    tokens.forEach(token => {
      if (this.variantMap.has(token)) {
        modified = true;
        productTokens.push(this.variantMap.get(token)!);
        console.log(`[ConceptsService] Token "${token}" normalizado a "${this.variantMap.get(token)}"`);
      } else if (this.isProductRelatedWord(token)) {
        productTokens.push(token);
        console.log(`[ConceptsService] Token "${token}" mantenido como palabra de producto`);
      } else {
        console.log(`[ConceptsService] Token "${token}" ignorado (stop word)`);
      }
    });
    
    if (productTokens.length > 0) {
      const result = productTokens.join(' ');
      console.log(`[ConceptsService] Términos de producto extraídos de "${searchTerm}": "${result}" (modificado: ${modified})`);
      return result;
    }
    
    console.log(`[ConceptsService] No se encontraron términos de producto en "${searchTerm}", devolviendo original`);
    return searchTerm;
  }

  /**
   * Verifica si una palabra está relacionada con productos automotrices
   */
  private isProductRelatedWord(word: string): boolean {
    const productWords = [
      // Marcas comunes
      'honda', 'toyota', 'nissan', 'ford', 'chevrolet', 'volkswagen', 'bmw', 'mercedes', 'audi',
      'mazda', 'hyundai', 'kia', 'subaru', 'mitsubishi', 'suzuki', 'isuzu', 'jeep', 'dodge',
      
      // Modelos comunes
      'civic', 'corolla', 'sentra', 'focus', 'aveo', 'jetta', 'tsuru', 'altima', 'accord',
      'camry', 'prius', 'rav4', 'cr-v', 'pilot', 'odyssey', 'fit', 'city',
      
      // Términos técnicos
      'delantero', 'trasero', 'izquierdo', 'derecho', 'superior', 'inferior',
      'automatico', 'manual', 'hidraulico', 'electronico', 'mecanico',
      
      // Años
      '2018', '2019', '2020', '2021', '2022', '2023', '2024',
      
      // Materiales y tipos
      'metalico', 'ceramico', 'sintetico', 'mineral', 'organico',
      'iridium', 'platino', 'cobre', 'grafito'
    ];
    
    return productWords.includes(word.toLowerCase());
  }

  /**
   * Convierte un término coloquial mexicano a nombre técnico
   */
  convertToTechnicalName(userTerm: string): string {
    if (!this.isLoaded) {
      return userTerm;
    }

    const cleanTerm = this.normalizeTerm(userTerm);
    
    // Buscar en las variantes
    if (this.variantMap.has(cleanTerm)) {
      const technical = this.variantMap.get(cleanTerm)!;
      console.log(`[ConceptsService] Convertido: "${userTerm}" → "${technical}"`);
      return technical;
    }

    // Si no encuentra mapeo exacto, buscar coincidencias parciales
    for (const mapping of this.conceptMappings) {
      for (const variante of mapping.variantes) {
        if (cleanTerm.includes(this.normalizeTerm(variante)) || 
            this.normalizeTerm(variante).includes(cleanTerm)) {
          console.log(`[ConceptsService] Convertido (parcial): "${userTerm}" → "${mapping.pieza}"`);
          return mapping.pieza;
        }
      }
    }

    console.log(`[ConceptsService] Sin conversión: "${userTerm}"`);
    return userTerm;
  }

  /**
   * Procesa un texto completo y convierte todos los términos coloquiales encontrados
   */
  processFullText(text: string): string {
    if (!this.isLoaded) {
      return text;
    }

    let processedText = text;
    
    // Procesar cada mapeo
    for (const mapping of this.conceptMappings) {
      for (const variante of mapping.variantes) {
        // Crear regex para buscar la variante como palabra completa
        const regex = new RegExp(`\\b${variante.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        processedText = processedText.replace(regex, mapping.pieza);
      }
    }

    if (processedText !== text) {
      console.log(`[ConceptsService] Texto procesado: "${text}" → "${processedText}"`);
    }

    return processedText;
  }

  /**
   * Obtiene sugerencias para un término
   */
  getSuggestions(term: string): string[] {
    if (!this.isLoaded) {
      return [];
    }

    const normalizedTerm = this.normalizeTerm(term);
    const suggestions: string[] = [];

    // Buscar mapeos que contengan el término
    for (const mapping of this.conceptMappings) {
      const hasMatch = mapping.variantes.some(variante => 
        this.normalizeTerm(variante).includes(normalizedTerm) ||
        normalizedTerm.includes(this.normalizeTerm(variante))
      );

      if (hasMatch) {
        suggestions.push(mapping.pieza);
        // Agregar también algunas variantes comunes
        suggestions.push(...mapping.variantes.slice(0, 2));
      }
    }

    // Eliminar duplicados y el término original
    return [...new Set(suggestions)].filter(s => 
      this.normalizeTerm(s) !== normalizedTerm
    ).slice(0, 5);
  }

  /**
   * Normaliza un término para comparación
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
    const categorías = [...new Set(this.conceptMappings.map(m => m.categoria).filter(Boolean))] as string[];
    
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