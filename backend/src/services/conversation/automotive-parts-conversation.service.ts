import { AdvancedConversationEngine, ConversationRequest, ConversationResponse } from './advanced-conversation-engine';
import { AutomotivePartsSearchService, CarInfo, SearchResponse } from '../automotive-parts-search.service';
import { conversationMemoryManager } from './conversation-memory';

export interface AutomotivePartsRequest extends ConversationRequest {
  carInfo?: CarInfo;
  partName?: string;
}

export interface AutomotivePartsResponse extends ConversationResponse {
  searchResults?: SearchResponse;
  carInfo?: CarInfo;
  partName?: string;
}

export class AutomotivePartsConversationService {
  private conversationEngine: AdvancedConversationEngine;
  private partsSearchService: AutomotivePartsSearchService;

  constructor() {
    this.conversationEngine = new AdvancedConversationEngine();
    this.partsSearchService = new AutomotivePartsSearchService();
  }

  /**
   * Procesa conversación específica para búsqueda de piezas automotrices
   */
  async processAutomotivePartsConversation(
    request: AutomotivePartsRequest
  ): Promise<AutomotivePartsResponse> {
    const startTime = Date.now();

    try {
      console.log(`[AutomotivePartsConversation] Procesando búsqueda de piezas: "${request.message}"`);

      // 1. Extraer información del auto y pieza del mensaje
      const { carInfo, partName } = this.extractCarAndPartInfo(request.message);
      
      // 2. Verificar si tenemos información completa
      if (this.hasCompleteInformation(carInfo, partName)) {
        // 3. Realizar búsqueda directa
        const searchResults = await this.performDirectSearch(partName!, carInfo!);
        
        // 4. Generar respuesta con resultados
        const response = await this.generateResultsResponse(searchResults, carInfo!);
        
        return {
          ...response,
          searchResults,
          carInfo,
          partName,
          metadata: {
            ...response.metadata,
            responseTime: Date.now() - startTime
          }
        };
      } else {
        // 5. Procesar con motor de conversación para obtener información faltante
        const conversationResponse = await this.conversationEngine.processConversation(request);
        
        // 6. Verificar si ahora tenemos información completa
        const updatedCarInfo = carInfo || this.extractCarInfoFromMemory(request.conversationId);
        const updatedPartName = partName || this.extractPartNameFromMemory(request.conversationId);
        
        if (this.hasCompleteInformation(updatedCarInfo, updatedPartName)) {
          const searchResults = await this.performDirectSearch(updatedPartName!, updatedCarInfo!);
          return {
            ...conversationResponse,
            searchResults,
            carInfo: updatedCarInfo,
            partName: updatedPartName
          };
        }
        
        return {
          ...conversationResponse,
          carInfo: updatedCarInfo,
          partName: updatedPartName
        };
      }

    } catch (error) {
      console.error('[AutomotivePartsConversation] Error procesando conversación:', error);
      return this.generateErrorResponse(request, error);
    }
  }

  /**
   * Extraer información del auto y pieza del mensaje
   */
  private extractCarAndPartInfo(message: string): { carInfo?: CarInfo; partName?: string } {
    const carInfo: CarInfo = {
      marca: '',
      modelo: ''
    };
    let partName: string | undefined;

    // Patrones para extraer información de marca
    const marcaPatterns = [
      /(?:para|de|mi)\s+(toyota|honda|nissan|ford|chevrolet|volkswagen|mazda|hyundai|bmw|mercedes|audi|kia|subaru|mitsubishi|suzuki|isuzu|jeep|dodge|vw|volkswagen)/i,
      /(toyota|honda|nissan|ford|chevrolet|volkswagen|mazda|hyundai|bmw|mercedes|audi|kia|subaru|mitsubishi|suzuki|isuzu|jeep|dodge|vw|volkswagen)\s+(corolla|civic|sentra|focus|cruze|golf|3|accent|camry|accord|altima|fusion|malibu|jetta|cx-5|elantra|sprinter|crafter)/i,
      // Patrones específicos para VW
      /(vw|volkswagen)\s+(crafter|sprinter)/i,
      /(crafter|sprinter)\s+(w906|w906)/i
    ];

    // Patrones para extraer información de modelo
    const modeloPatterns = [
      /(corolla|civic|sentra|focus|cruze|golf|accent|camry|accord|altima|fusion|malibu|jetta|cx-5|elantra|sprinter|crafter|w906)/i,
      // Patrones específicos para modelos VW
      /(sprinter\s+w906)/i,
      /(crafter\s+w906)/i,
      /(w906)/i
    ];

    // Patrones para extraer año
    const añoPatterns = [
      /(?:año|modelo|del)\s+(\d{4})/i,
      /(\d{4})/i
    ];

    // Extraer marca y modelo con mejor lógica
    let marcaFound = false;
    let modeloFound = false;

    // Buscar patrones específicos primero
    for (const pattern of marcaPatterns) {
      const match = message.match(pattern);
      if (match) {
        carInfo.marca = match[1].toLowerCase();
        marcaFound = true;
        break;
      }
    }

    // Buscar modelo específico
    for (const pattern of modeloPatterns) {
      const match = message.match(pattern);
      if (match) {
        carInfo.modelo = match[1].toLowerCase();
        modeloFound = true;
        break;
      }
    }

    // Si no se encontró marca, buscar en el texto completo
    if (!marcaFound) {
      const marcaKeywords = ['vw', 'volkswagen', 'toyota', 'honda', 'nissan', 'ford', 'chevrolet'];
      for (const keyword of marcaKeywords) {
        if (message.toLowerCase().includes(keyword)) {
          carInfo.marca = keyword;
          marcaFound = true;
          break;
        }
      }
    }

    // Si no se encontró modelo, buscar en el texto completo
    if (!modeloFound) {
      const modeloKeywords = ['sprinter', 'crafter', 'w906', 'corolla', 'civic', 'sentra'];
      for (const keyword of modeloKeywords) {
        if (message.toLowerCase().includes(keyword)) {
          carInfo.modelo = keyword;
          modeloFound = true;
          break;
        }
      }
    }

    // Extraer año
    for (const pattern of añoPatterns) {
      const match = message.match(pattern);
      if (match) {
        const año = parseInt(match[1]);
        if (año >= 1990 && año <= new Date().getFullYear() + 1) {
          carInfo.año = año;
        }
      }
    }

    // Extraer nombre de pieza - Mejorado para reconocer frases completas
    partName = this.extractPartNameFromMessage(message);

    return { carInfo: (carInfo.marca && carInfo.modelo) ? carInfo : undefined, partName };
  }

  /**
   * Extraer nombre de pieza del mensaje usando patrones mejorados
   */
  private extractPartNameFromMessage(message: string): string | undefined {
    const normalizedMessage = message.toLowerCase();
    
    // Patrones genéricos para piezas (sin sobre-ingeniería específica)
    const partPatterns = [
      // Frases completas específicas para funda de palanca
      /(funda\s+(?:de\s+)?palanca\s+(?:de\s+)?velocidades?\s+(?:de\s+)?transmision\s+estandar)/i,
      /(funda\s+(?:de\s+)?palanca\s+(?:de\s+)?transmision\s+estandar)/i,
      /(funda\s+(?:de\s+)?palanca\s+(?:de\s+)?velocidades?)/i,
      /(funda\s+(?:de\s+)?palanca\s+(?:de\s+)?transmision)/i,
      
      // Otras frases completas comunes
      /(pastillas?\s+(?:de\s+)?freno)/i,
      /(discos?\s+(?:de\s+)?freno)/i,
      /(balatas?\s+(?:de\s+)?freno)/i,
      /(filtro\s+(?:de\s+)?aceite)/i,
      /(filtro\s+(?:de\s+)?aire)/i,
      /(kit\s+(?:de\s+)?embrague)/i,
      /(disco\s+(?:de\s+)?embrague)/i,
      /(amortiguador)/i,
      /(bateria)/i,
      /(llantas?)/i,
      
      // Palabras individuales (fallback)
      /(funda)/i,
      /(palanca)/i,
      /(pastillas?)/i,
      /(frenos?)/i,
      /(discos?)/i,
      /(balatas?)/i,
      /(filtro)/i,
      /(aceite)/i,
      /(aire)/i,
      /(embrague)/i,
      /(clutch)/i,
      /(amortiguador)/i,
      /(bateria)/i,
      /(llantas?)/i
    ];

    // Buscar coincidencias en el texto normalizado
    for (const pattern of partPatterns) {
      const match = normalizedMessage.match(pattern);
      if (match) {
        const extractedPart = match[1].toLowerCase().trim();
        console.log(`[AutomotivePartsConversation] ✅ Pieza extraída: "${extractedPart}"`);
        return extractedPart;
      }
    }

    // Si no se encontró con patrones, buscar palabras clave específicas
    const partKeywords = [
      'funda palanca velocidades transmision estandar',
      'funda palanca transmision estandar',
      'funda palanca velocidades',
      'funda palanca',
      'pastillas freno',
      'discos freno',
      'filtro aceite',
      'filtro aire',
      'kit embrague',
      'amortiguador',
      'bateria',
      'llantas'
    ];

    for (const keyword of partKeywords) {
      if (normalizedMessage.includes(keyword)) {
        console.log(`[AutomotivePartsConversation] ✅ Pieza extraída por palabra clave: "${keyword}"`);
        return keyword;
      }
    }

    console.log(`[AutomotivePartsConversation] ❌ No se pudo extraer nombre de pieza del mensaje`);
    return undefined;
  }

  /**
   * Verificar si tenemos información completa
   */
  private hasCompleteInformation(carInfo?: CarInfo, partName?: string): boolean {
    return !!(carInfo?.marca && carInfo?.modelo && partName);
  }

  /**
   * Realizar búsqueda directa
   */
  private async performDirectSearch(partName: string, carInfo: CarInfo): Promise<SearchResponse> {
    console.log(`[AutomotivePartsConversation] Búsqueda directa: "${partName}" para ${carInfo.marca} ${carInfo.modelo}`);
    
    return await this.partsSearchService.searchAutomotiveParts(partName, carInfo, {
      limit: 5,
      minConfidence: 0.4
    });
  }

  /**
   * Generar respuesta con resultados
   */
  private async generateResultsResponse(searchResults: SearchResponse, carInfo: CarInfo): Promise<AutomotivePartsResponse> {
    let responseText = '';

    if (searchResults.success && searchResults.results.length > 0) {
      if (searchResults.results.length === 1) {
        const result = searchResults.results[0];
        responseText = `✅ Encontré esta pieza para tu ${carInfo.marca} ${carInfo.modelo}:\n\n` +
          `🔑 **Clave:** ${result.clave}\n` +
          `🏷️ **Marca:** ${result.marca}\n` +
          `📝 **Descripción:** ${result.nombre}`;
      } else {
        responseText = `✅ Encontré ${searchResults.results.length} opciones para tu ${carInfo.marca} ${carInfo.modelo}:\n\n`;
        searchResults.results.forEach((result, index) => {
          responseText += `${index + 1}. **Clave:** ${result.clave} | **Marca:** ${result.marca}\n   ${result.nombre}\n\n`;
        });
      }
    } else {
      responseText = `❌ No encontré piezas de ${searchResults.normalizedTerm} para tu ${carInfo.marca} ${carInfo.modelo}. ` +
        `¿Podrías verificar la información de tu auto o el nombre de la pieza?`;
    }

    return {
      response: responseText,
      intent: 'automotive_parts_search',
      entities: new Map(),
      functionCalls: [],
      conversationState: {
        phase: 'search_completed',
        canProgress: true,
        nextSteps: ['confirm_purchase', 'search_another_part']
      },
      metadata: {
        responseTime: 0,
        functionsCalled: 0,
        confidenceScore: 0.9,
        promptUsed: 'automotive_parts_results'
      },
      searchResults
    };
  }

  /**
   * Extraer información del auto desde la memoria
   */
  private extractCarInfoFromMemory(conversationId: string): CarInfo | undefined {
    const memory = conversationMemoryManager.getMemory(conversationId);
    if (!memory) return undefined;

    const carInfo = memory.shortTermMemory.contextualEntities.get('carInfo');
    return carInfo;
  }

  /**
   * Extraer nombre de pieza desde la memoria
   */
  private extractPartNameFromMemory(conversationId: string): string | undefined {
    const memory = conversationMemoryManager.getMemory(conversationId);
    if (!memory) return undefined;

    return memory.shortTermMemory.contextualEntities.get('partName');
  }

  /**
   * Generar respuesta de error
   */
  private generateErrorResponse(request: AutomotivePartsRequest, error: any): AutomotivePartsResponse {
    return {
      response: '❌ Lo siento, tuve un problema procesando tu solicitud. ¿Podrías intentar de nuevo?',
      intent: 'error',
      entities: new Map(),
      functionCalls: [],
      conversationState: {
        phase: 'error',
        canProgress: false,
        nextSteps: ['retry']
      },
      metadata: {
        responseTime: 0,
        functionsCalled: 0,
        confidenceScore: 0,
        promptUsed: 'error'
      }
    };
  }
}