"use strict";
/**
 * Generador de prompts dinámicos para conversaciones contextuales
 * Adapta los prompts según el contexto, preferencias del usuario y estado actual
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicPromptGenerator = exports.DynamicPromptGenerator = void 0;
class DynamicPromptGenerator {
    constructor() {
        this.prompts = new Map();
        this.initializePromptTemplates();
    }
    /**
     * Inicializa las plantillas de prompts
     */
    initializePromptTemplates() {
        // Prompt principal del asistente
        this.prompts.set('main', {
            id: 'main',
            name: 'Asistente Principal',
            basePrompt: `Eres un asistente inteligente especializado en refacciones automotrices para México. 
Tu nombre es Embler y trabajas para AOVA, una empresa líder en distribución de refacciones.

PERSONALIDAD:
- Profesional pero amigable
- Conocimiento profundo de refacciones automotrices
- Enfoque en ayudar genuinamente al cliente
- Proactivo en ofrecer soluciones

CAPACIDADES:
- Consultar inventario en tiempo real
- Generar tickets de compra
- Buscar por número VIN
- Procesar envíos
- Conectar con asesores humanos

GUIDELINES:
- Siempre pregunta por detalles específicos (marca, modelo, año)
- Ofrece alternativas si no hay stock
- Menciona precios y disponibilidad
- Sugiere productos relacionados cuando sea relevante
- Escalate to human advisor when needed`,
            contextualModifiers: [
                'Cliente conocido - personaliza la experiencia',
                'Primera vez - explica el proceso',
                'Cliente VIP - ofrece atención preferencial',
                'Urgente - prioriza rapidez',
                'Precio sensible - enfócate en valor'
            ],
            userStyleModifiers: {
                formal: 'Usa tratamiento formal (usted) y lenguaje profesional.',
                casual: 'Usa un tono amigable y natural con tuteo.',
                technical: 'Incluye detalles técnicos y especificaciones precisas.'
            },
            scenarioSpecific: {
                initial: 'Saluda calurosamente y pregunta cómo puedes ayudar.',
                searching: 'Enfócate en encontrar la refacción exacta que necesita.',
                comparing: 'Ayuda a comparar opciones y tomar la mejor decisión.',
                purchasing: 'Guía el proceso de compra de manera clara y confiable.',
                support: 'Ofrece soporte técnico y resuelve dudas específicas.'
            }
        });
        // Prompt para búsqueda de inventario
        this.prompts.set('inventory_search', {
            id: 'inventory_search',
            name: 'Búsqueda de Inventario',
            basePrompt: `Estás ayudando a buscar refacciones en el inventario. 
Usa las funciones disponibles para encontrar exactamente lo que necesita el cliente.

PROCESO:
1. Clarifica especificaciones (marca, modelo, año, VIN si es posible)
2. Busca en inventario usando los términos correctos
3. Presenta opciones disponibles con precios
4. Sugiere alternativas si no hay stock
5. Ofrece productos relacionados`,
            contextualModifiers: [
                'Búsqueda específica - usa detalles exactos',
                'Búsqueda amplia - explora opciones',
                'Sin resultados - ofrece alternativas',
                'Múltiples opciones - ayuda a elegir'
            ],
            userStyleModifiers: {
                formal: 'Presente opciones de manera estructurada y profesional.',
                casual: 'Explica opciones de manera conversacional y fácil.',
                technical: 'Incluye especificaciones técnicas y compatibilidad.'
            },
            scenarioSpecific: {
                initial: 'Comienza recopilando información del vehículo.',
                searching: 'Busca activamente usando las funciones disponibles.',
                comparing: 'Compara especificaciones y precios.',
                purchasing: 'Confirma compatibilidad antes de proceder.',
                support: 'Explica compatibilidad y instalación.'
            }
        });
        // Prompt para generación de tickets
        this.prompts.set('ticket_generation', {
            id: 'ticket_generation',
            name: 'Generación de Tickets',
            basePrompt: `Estás generando un ticket de compra para el cliente.
Asegúrate de que toda la información esté completa y sea precisa.

PROCESO:
1. Confirma productos seleccionados
2. Verifica disponibilidad final
3. Calcula totales incluyendo impuestos
4. Genera ticket con todos los detalles
5. Explica próximos pasos

INFORMACIÓN REQUERIDA:
- Productos específicos y cantidades
- Precios actuales
- Información del cliente
- Método de pago/entrega`,
            contextualModifiers: [
                'Primera compra - explica proceso',
                'Cliente recurrente - procesa rápidamente',
                'Compra grande - verifica descuentos',
                'Urgente - prioriza rapidez'
            ],
            userStyleModifiers: {
                formal: 'Procesa de manera profesional y detallada.',
                casual: 'Explica de manera amigable y clara.',
                technical: 'Incluye especificaciones técnicas en el ticket.'
            },
            scenarioSpecific: {
                initial: 'Explica el proceso de generación de ticket.',
                searching: 'Busca productos para el ticket.',
                comparing: 'Ayuda a elegir antes de generar.',
                purchasing: 'Genera ticket y procesa compra.',
                support: 'Explica términos y condiciones.'
            }
        });
        // Prompt para manejo de errores
        this.prompts.set('error_handling', {
            id: 'error_handling',
            name: 'Manejo de Errores',
            basePrompt: `Ha ocurrido un problema técnico. Mantén la calma y ayuda al cliente.

APPROACH:
1. Reconoce el problema sin entrar en detalles técnicos
2. Ofrece alternativas inmediatas
3. Escala a soporte humano si es necesario
4. Mantén confianza del cliente

NEVER:
- Culpes al sistema
- Muestres códigos de error
- Hagas promesas específicas sobre tiempos de resolución`,
            contextualModifiers: [
                'Error crítico - escala inmediatamente',
                'Error menor - ofrece alternativas',
                'Error recurrente - explica situación',
                'Error de conectividad - sugiere reintentar'
            ],
            userStyleModifiers: {
                formal: 'Mantén profesionalismo y ofrece soluciones.',
                casual: 'Tranquiliza de manera amigable.',
                technical: 'Ofrece contexto técnico apropiado.'
            },
            scenarioSpecific: {
                initial: 'Reconoce el problema y ofrece ayuda.',
                searching: 'Sugiere métodos alternativos de búsqueda.',
                comparing: 'Usa información disponible para comparar.',
                purchasing: 'Escala a soporte humano para completar compra.',
                support: 'Conecta con asesor técnico especializado.'
            }
        });
    }
    /**
     * Genera un prompt dinámico basado en el contexto
     */
    generatePrompt(promptId, context) {
        const template = this.prompts.get(promptId);
        if (!template) {
            console.warn(`[DynamicPromptGenerator] Plantilla no encontrada: ${promptId}`);
            return this.generateFallbackPrompt(context);
        }
        let prompt = template.basePrompt;
        // Agregar modificadores contextuales
        prompt += this.addContextualModifiers(template, context);
        // Agregar estilo de usuario
        prompt += this.addUserStyleModifiers(template, context);
        // Agregar información específica del escenario
        prompt += this.addScenarioSpecificInfo(template, context);
        // Agregar contexto de conversación
        prompt += this.addConversationContext(context);
        // Agregar funciones disponibles
        prompt += this.addAvailableFunctions(context);
        // Agregar información del negocio
        prompt += this.addBusinessContext(context);
        return prompt;
    }
    /**
     * Agrega modificadores contextuales al prompt
     */
    addContextualModifiers(template, context) {
        const memory = context.conversationMemory;
        const userProfile = memory.longTermMemory.userProfile;
        const patterns = memory.longTermMemory.behaviorPatterns;
        let modifiers = '\n\nCONTEXTO ESPECIAL:\n';
        // Verificar si es cliente conocido
        if (memory.metadata.conversationLength > 1) {
            modifiers += '- Cliente conocido - personaliza la experiencia\n';
        }
        // Verificar si es VIP
        if (userProfile.businessContext.isVipCustomer) {
            modifiers += '- Cliente VIP - ofrece atención preferencial\n';
        }
        // Agregar patrones de comportamiento
        patterns.forEach(pattern => {
            switch (pattern) {
                case 'price_conscious':
                    modifiers += '- Precio sensible - enfócate en valor y opciones económicas\n';
                    break;
                case 'urgent_need':
                    modifiers += '- Urgente - prioriza rapidez y disponibilidad inmediata\n';
                    break;
                case 'technical_focused':
                    modifiers += '- Enfoque técnico - incluye especificaciones detalladas\n';
                    break;
                case 'brand_focused':
                    modifiers += '- Enfoque en marca - respeta preferencias de marca\n';
                    break;
            }
        });
        return modifiers;
    }
    /**
     * Agrega modificadores de estilo de usuario
     */
    addUserStyleModifiers(template, context) {
        const userProfile = context.conversationMemory.longTermMemory.userProfile;
        const style = userProfile.preferences.communicationStyle;
        return `\n\nESTILO DE COMUNICACIÓN:\n${template.userStyleModifiers[style]}\n`;
    }
    /**
     * Agrega información específica del escenario
     */
    addScenarioSpecificInfo(template, context) {
        const currentPhase = context.conversationMemory.shortTermMemory.currentTopic;
        let scenario = 'initial';
        // Determinar escenario basado en el intent y contexto
        if (context.intent.includes('search') || context.intent.includes('find')) {
            scenario = 'searching';
        }
        else if (context.intent.includes('compare')) {
            scenario = 'comparing';
        }
        else if (context.intent.includes('buy') || context.intent.includes('purchase')) {
            scenario = 'purchasing';
        }
        else if (context.intent.includes('support') || context.intent.includes('help')) {
            scenario = 'support';
        }
        return `\n\nESCENARIO ACTUAL:\n${template.scenarioSpecific[scenario]}\n`;
    }
    /**
     * Agrega contexto de conversación
     */
    addConversationContext(context) {
        const memory = context.conversationMemory;
        const recentQueries = memory.shortTermMemory.recentQueries;
        const currentIntent = memory.workingMemory.currentIntent;
        const entities = context.entities;
        let conversationContext = '\n\nCONTEXTO DE CONVERSACIÓN:\n';
        if (currentIntent) {
            conversationContext += `- Intención actual: ${currentIntent}\n`;
        }
        if (recentQueries.length > 0) {
            conversationContext += `- Consultas recientes: ${recentQueries.slice(-3).join(', ')}\n`;
        }
        if (entities.size > 0) {
            conversationContext += '- Entidades mencionadas:\n';
            for (const [key, value] of entities.entries()) {
                conversationContext += `  * ${key}: ${value}\n`;
            }
        }
        const userVehicle = memory.longTermMemory.userProfile.preferences.vehicleInfo;
        if (userVehicle) {
            conversationContext += `- Vehículo del cliente: ${userVehicle.brand} ${userVehicle.model} ${userVehicle.year}\n`;
        }
        return conversationContext;
    }
    /**
     * Agrega funciones disponibles
     */
    addAvailableFunctions(context) {
        let functionsContext = '\n\nFUNCIONES DISPONIBLES:\n';
        context.availableFunctions.forEach(func => {
            switch (func) {
                case 'consultarInventario':
                    functionsContext += '- consultarInventario: Buscar productos específicos\n';
                    break;
                case 'consultarInventarioGeneral':
                    functionsContext += '- consultarInventarioGeneral: Ver inventario completo\n';
                    break;
                case 'buscarYConsultarInventario':
                    functionsContext += '- buscarYConsultarInventario: Búsqueda inteligente\n';
                    break;
                case 'generarTicket':
                    functionsContext += '- generarTicket: Generar ticket de compra\n';
                    break;
                case 'confirmarCompra':
                    functionsContext += '- confirmarCompra: Confirmar transacción\n';
                    break;
                case 'buscarPorVin':
                    functionsContext += '- buscarPorVin: Buscar por número VIN\n';
                    break;
                case 'solicitarAsesor':
                    functionsContext += '- solicitarAsesor: Conectar con asesor humano\n';
                    break;
                case 'procesarEnvio':
                    functionsContext += '- procesarEnvio: Procesar envío a domicilio\n';
                    break;
            }
        });
        functionsContext += '\nUsa estas funciones cuando sea apropiado para ayudar al cliente.\n';
        return functionsContext;
    }
    /**
     * Agrega contexto del negocio
     */
    addBusinessContext(context) {
        var _a;
        const userProfile = context.conversationMemory.longTermMemory.userProfile;
        const businessContext = context.businessContext;
        let businessInfo = '\n\nCONTEXTO DEL NEGOCIO:\n';
        businessInfo += `- Sucursal: ${userProfile.businessContext.pointOfSaleId}\n`;
        businessInfo += `- Hora del día: ${this.getTimeOfDay()}\n`;
        if (businessContext === null || businessContext === void 0 ? void 0 : businessContext.specialOffers) {
            businessInfo += `- Ofertas especiales: ${businessContext.specialOffers.join(', ')}\n`;
        }
        if ((_a = businessContext === null || businessContext === void 0 ? void 0 : businessContext.inventory) === null || _a === void 0 ? void 0 : _a.lastUpdate) {
            businessInfo += `- Inventario actualizado: ${businessContext.inventory.lastUpdate}\n`;
        }
        return businessInfo;
    }
    /**
     * Genera un prompt de respaldo
     */
    generateFallbackPrompt(context) {
        return `Eres Embler, un asistente inteligente de refacciones automotrices.
    
Ayuda al cliente de manera profesional y amigable.
Usa las funciones disponibles para buscar productos y procesar compras.
Siempre pregunta por detalles específicos cuando sea necesario.

Cliente: ${context.currentMessage}

Responde de manera útil y proactiva.`;
    }
    /**
     * Genera prompt para función específica
     */
    generateFunctionPrompt(functionName, context) {
        const basePrompt = this.generatePrompt('main', context);
        let functionSpecific = '';
        switch (functionName) {
            case 'consultarInventario':
                functionSpecific = '\n\nAHORA: Busca el producto específico que necesita el cliente usando consultarInventario.';
                break;
            case 'generarTicket':
                functionSpecific = '\n\nAHORA: Genera un ticket de compra con la información proporcionada.';
                break;
            case 'buscarPorVin':
                functionSpecific = '\n\nAHORA: Usa el número VIN para encontrar refacciones compatibles.';
                break;
            case 'solicitarAsesor':
                functionSpecific = '\n\nAHORA: Conecta al cliente con un asesor humano especializado.';
                break;
            default:
                functionSpecific = `\n\nAHORA: Ejecuta la función ${functionName} según la solicitud del cliente.`;
        }
        return basePrompt + functionSpecific;
    }
    /**
     * Obtiene la hora del día
     */
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12)
            return 'mañana';
        if (hour >= 12 && hour < 18)
            return 'tarde';
        if (hour >= 18 && hour < 22)
            return 'noche';
        return 'madrugada';
    }
    /**
     * Registra nueva plantilla de prompt
     */
    registerPromptTemplate(template) {
        this.prompts.set(template.id, template);
        console.log(`[DynamicPromptGenerator] Plantilla registrada: ${template.id}`);
    }
    /**
     * Obtiene todas las plantillas disponibles
     */
    getAvailablePrompts() {
        return Array.from(this.prompts.keys());
    }
}
exports.DynamicPromptGenerator = DynamicPromptGenerator;
// Exportar instancia singleton
exports.dynamicPromptGenerator = new DynamicPromptGenerator();
