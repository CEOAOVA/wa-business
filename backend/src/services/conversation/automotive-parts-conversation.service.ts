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

    // Patrones para extraer información
    const marcaPatterns = [
      /(?:para|de|mi)\s+(toyota|honda|nissan|ford|chevrolet|volkswagen|mazda|hyundai)/i,
      /(toyota|honda|nissan|ford|chevrolet|volkswagen|mazda|hyundai)\s+(corolla|civic|sentra|focus|cruze|golf|3|accent)/i
    ];

    const modeloPatterns = [
      /(corolla|civic|sentra|focus|cruze|golf|accent|camry|accord|altima|fusion|malibu|jetta|cx-5|elantra)/i
    ];

    const añoPatterns = [
      /(?:año|modelo|del)\s+(\d{4})/i,
      /(\d{4})/i
    ];

    // Extraer marca
    for (const pattern of marcaPatterns) {
      const match = message.match(pattern);
      if (match) {
        carInfo.marca = match[1].toLowerCase();
        break;
      }
    }

    // Extraer modelo
    for (const pattern of modeloPatterns) {
      const match = message.match(pattern);
      if (match) {
        carInfo.modelo = match[1].toLowerCase();
        break;
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

    // Extraer nombre de pieza (asumiendo que está al inicio o después de "necesito")
    const partPatterns = [
      /^(balatas?|frenos?|pastillas?|filtros?|aceite|batería|llantas?|amortiguadores?|bujías?|correas?)/i,
      /(?:necesito|busco|quiero)\s+(balatas?|frenos?|pastillas?|filtros?|aceite|batería|llantas?|amortiguadores?|bujías?|correas?)/i
    ];

    for (const pattern of partPatterns) {
      const match = message.match(pattern);
      if (match) {
        partName = match[1].toLowerCase();
        break;
      }
    }

    return { carInfo: (carInfo.marca && carInfo.modelo) ? carInfo : undefined, partName };
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