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
        // Prompt principal del asistente con flujo natural
        this.prompts.set('main', {
            id: 'main',
            name: 'Asistente Principal',
            basePrompt: `Eres Embler, un asistente inteligente especializado en refacciones automotrices para México. 
Trabajas para AOVA, una empresa líder en distribución de refacciones.

🎯 OBJETIVO PRINCIPAL: Mantener conversaciones naturales y contextuales sin repetir saludos innecesarios.

📋 REGLAS FUNDAMENTALES DE CONVERSACIÓN NATURAL:

1. **CONTINUIDAD CONTEXTUAL**:
   - Si es la primera interacción del día: "¡Hola! ¿En qué te puedo ayudar hoy?"
   - Si es continuación de conversación: Usa referencias como "Continuemos con lo que estábamos viendo..." o "Como mencionabas antes..."
   - Si es usuario recurrente: "¡Hola de nuevo! ¿Qué necesitas hoy?"

2. **MEMORIA CONVERSACIONAL**:
   - Recuerda productos mencionados anteriormente
   - Haz referencias a consultas previas: "Como buscabas antes..."
   - Menciona preferencias aprendidas: "Como prefieres las marcas..."
   - Usa información del vehículo si ya la tienes

3. **TRANSICIONES NATURALES**:
   - "Cambiando de tema..." cuando cambies de asunto
   - "Volviendo a lo anterior..." cuando retomes un tema
   - "Por cierto..." para información adicional
   - "Mientras tanto..." para procesos paralelos

4. **PERSONALIZACIÓN INTELIGENTE**:
   - Adapta el tono según el usuario (formal/casual/técnico)
   - Usa el nombre si lo conoces
   - Menciona horarios apropiados (mañana/tarde/noche)
   - Considera si es cliente VIP o recurrente

5. **EVITAR REPETICIONES**:
   - NO saludes si ya saludaste en la sesión
   - NO repitas información ya proporcionada
   - Usa referencias en lugar de repetir
   - Mantén contexto entre mensajes

CAPACIDADES TÉCNICAS:
- Consultar inventario en tiempo real
- Generar tickets de compra
- Buscar por número VIN
- Procesar envíos
- Conectar con asesores humanos

GUIDELINES ESPECÍFICOS:
- Siempre pregunta por detalles específicos (marca, modelo, año) cuando sea necesario
- Ofrece alternativas si no hay stock
- Menciona precios y disponibilidad
- Sugiere productos relacionados cuando sea relevante
- Escala a asesor humano cuando sea necesario

ESTILO DE COMUNICACIÓN:
- Profesional pero amigable
- Conocimiento profundo de refacciones automotrices
- Enfoque en ayudar genuinamente al cliente
- Proactivo en ofrecer soluciones`,
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
                initial: 'Saluda contextualmente y pregunta cómo puedes ayudar.',
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
     * Genera prompt principal para conversaciones de piezas automotrices
     */
    generateMainPrompt(context) {
        const memory = context.conversationMemory;
        const conversationLength = memory.metadata.conversationLength;
        let prompt = `Eres Embler, un asistente inteligente de refacciones automotrices para México.
Trabajas para AOVA, una empresa líder en distribución de refacciones.

🎯 OBJETIVO: Buscar piezas automotrices usando marca, modelo y nombre de pieza.
RESPUESTA ÚNICA: Solo devolver CLAVE y MARCA de la pieza encontrada.

📋 REGLAS FUNDAMENTALES:
- NO mencionar precios ni disponibilidad
- NO preguntar por número de parte
- Solo devolver clave y marca de la pieza
- Si no encuentra la pieza, explicar que no está disponible
- Mantener conversación natural y contextual

🔍 PROCESO DE BÚSQUEDA:
1. Extraer marca del auto (ej: Toyota, Honda, VW)
2. Extraer modelo del auto (ej: Corolla, Civic, Sprinter)
3. Extraer nombre de la pieza (ej: funda palanca velocidades, balatas)
4. Buscar en base de datos usando estos 3 datos
5. Devolver solo: Clave y Marca de la pieza

💬 TIPOS DE RESPUESTA:
- Si encuentra 1 pieza: "Encontré esta pieza: Clave ABC123, Marca FREY"
- Si encuentra múltiples: "Encontré X opciones: 1. Clave ABC123, Marca FREY..."
- Si no encuentra: "No encontré piezas para tu [marca] [modelo]"

🚫 RESTRICCIONES:
- NO preguntar por número de parte
- NO mencionar precios
- NO mencionar disponibilidad
- NO pedir información adicional si ya tiene marca, modelo y pieza

📝 EJEMPLOS DE RESPUESTA:
Usuario: "Necesito funda palanca velocidades para VW Sprinter 2006"
Respuesta: "Encontré esta pieza para tu VW Sprinter: Clave XYZ789, Marca FREY"

Usuario: "Busco balatas para Toyota Corolla"
Respuesta: "Encontré 2 opciones para tu Toyota Corolla: 1. Clave ABC123, Marca BREMBO 2. Clave DEF456, Marca AKEBONO"`;
        // Agregar instrucciones específicas de continuidad
        prompt += '\n\nINSTRUCCIONES ESPECÍFICAS DE CONTINUIDAD:\n';
        if (conversationLength > 1) {
            prompt += '- NO saludes nuevamente\n';
            prompt += '- Usa referencias a la conversación anterior\n';
            if (memory.shortTermMemory.recentQueries.length > 1) {
                const lastQuery = memory.shortTermMemory.recentQueries[memory.shortTermMemory.recentQueries.length - 2];
                prompt += `- Última consulta: "${lastQuery}"\n`;
            }
            if (memory.shortTermMemory.currentTopic) {
                prompt += `- Tópico actual: ${memory.shortTermMemory.currentTopic}\n`;
            }
            // Referencias específicas según el contexto
            if (memory.longTermMemory.userProfile.preferences.vehicleInfo) {
                const vehicle = memory.longTermMemory.userProfile.preferences.vehicleInfo;
                prompt += `- Vehículo mencionado: ${vehicle.brand} ${vehicle.model} ${vehicle.year}\n`;
            }
            if (memory.longTermMemory.userProfile.preferences.preferredBrands.length > 0) {
                prompt += `- Marcas preferidas: ${memory.longTermMemory.userProfile.preferences.preferredBrands.join(', ')}\n`;
            }
            prompt += '\nFRASES DE CONTINUIDAD SUGERIDAS:\n';
            prompt += '- "Continuemos con lo que estábamos viendo..."\n';
            prompt += '- "Como mencionabas antes..."\n';
            prompt += '- "Retomando lo que buscabas..."\n';
            prompt += '- "Ahora, respecto a..."\n';
            prompt += '- "Cambiando de tema..."\n';
        }
        return prompt;
    }
    /**
     * Genera prompt específico para continuidad de conversación
     */
    generateContinuationPrompt(context) {
        const memory = context.conversationMemory;
        const conversationLength = memory.metadata.conversationLength;
        const recentQueries = memory.shortTermMemory.recentQueries;
        const currentTopic = memory.shortTermMemory.currentTopic;
        const userProfile = memory.longTermMemory.userProfile;
        let continuationPrompt = this.generatePrompt('main', context);
        // Agregar instrucciones específicas de continuidad
        continuationPrompt += '\n\nINSTRUCCIONES ESPECÍFICAS DE CONTINUIDAD:\n';
        if (conversationLength > 1) {
            continuationPrompt += '- NO saludes nuevamente\n';
            continuationPrompt += '- Usa referencias a la conversación anterior\n';
            if (recentQueries.length > 1) {
                const lastQuery = recentQueries[recentQueries.length - 2];
                continuationPrompt += `- Última consulta: "${lastQuery}"\n`;
            }
            if (currentTopic) {
                continuationPrompt += `- Tópico actual: ${currentTopic}\n`;
            }
            // Referencias específicas según el contexto
            if (userProfile.preferences.vehicleInfo) {
                const vehicle = userProfile.preferences.vehicleInfo;
                continuationPrompt += `- Vehículo mencionado: ${vehicle.brand} ${vehicle.model} ${vehicle.year}\n`;
            }
            if (userProfile.preferences.preferredBrands.length > 0) {
                continuationPrompt += `- Marcas preferidas: ${userProfile.preferences.preferredBrands.join(', ')}\n`;
            }
            continuationPrompt += '\nFRASES DE CONTINUIDAD SUGERIDAS:\n';
            continuationPrompt += '- "Continuemos con lo que estábamos viendo..."\n';
            continuationPrompt += '- "Como mencionabas antes..."\n';
            continuationPrompt += '- "Retomando lo que buscabas..."\n';
            continuationPrompt += '- "Ahora, respecto a..."\n';
            continuationPrompt += '- "Cambiando de tema..."\n';
        }
        return continuationPrompt;
    }
    /**
     * Agrega modificadores contextuales al prompt
     */
    addContextualModifiers(template, context) {
        const memory = context.conversationMemory;
        const userProfile = memory.longTermMemory.userProfile;
        const patterns = memory.longTermMemory.behaviorPatterns;
        const conversationLength = memory.metadata.conversationLength;
        const lastInteraction = userProfile.interactions.lastInteraction;
        const now = new Date();
        let modifiers = '\n\nCONTEXTO ESPECIAL:\n';
        // Determinar si es primera interacción del día
        const isFirstInteractionOfDay = !lastInteraction ||
            lastInteraction.getDate() !== now.getDate() ||
            lastInteraction.getMonth() !== now.getMonth() ||
            lastInteraction.getFullYear() !== now.getFullYear();
        if (isFirstInteractionOfDay && conversationLength === 1) {
            modifiers += '- PRIMERA INTERACCIÓN DEL DÍA: Saluda apropiadamente\n';
        }
        else if (conversationLength > 1) {
            modifiers += '- CONVERSACIÓN EN CURSO: Mantén continuidad sin repetir saludos\n';
        }
        // Verificar si es cliente conocido
        if (userProfile.interactions.totalMessages > 5) {
            modifiers += '- CLIENTE CONOCIDO: Personaliza la experiencia\n';
        }
        else if (conversationLength === 1) {
            modifiers += '- CLIENTE NUEVO: Explica el proceso y sé acogedor\n';
        }
        // Verificar si es VIP
        if (userProfile.businessContext.isVipCustomer) {
            modifiers += '- CLIENTE VIP: Ofrece atención preferencial\n';
        }
        // Agregar patrones de comportamiento
        patterns.forEach(pattern => {
            switch (pattern) {
                case 'price_conscious':
                    modifiers += '- PRECIO SENSIBLE: Enfócate en valor y opciones económicas\n';
                    break;
                case 'urgent_need':
                    modifiers += '- URGENTE: Prioriza rapidez y disponibilidad inmediata\n';
                    break;
                case 'technical_focused':
                    modifiers += '- ENFOQUE TÉCNICO: Incluye especificaciones detalladas\n';
                    break;
                case 'brand_focused':
                    modifiers += '- ENFOQUE EN MARCA: Respeta preferencias de marca\n';
                    break;
                case 'compatibility_focused':
                    modifiers += '- ENFOQUE EN COMPATIBILIDAD: Verifica compatibilidad detalladamente\n';
                    break;
            }
        });
        // Agregar contexto temporal
        const hour = now.getHours();
        if (hour >= 6 && hour < 12) {
            modifiers += '- HORA: Mañana - Usa saludos matutinos apropiados\n';
        }
        else if (hour >= 12 && hour < 18) {
            modifiers += '- HORA: Tarde - Usa saludos vespertinos apropiados\n';
        }
        else if (hour >= 18 && hour < 22) {
            modifiers += '- HORA: Noche - Usa saludos nocturnos apropiados\n';
        }
        else {
            modifiers += '- HORA: Madrugada - Considera horarios de servicio\n';
        }
        // Agregar instrucciones de continuidad
        if (conversationLength > 1) {
            modifiers += '\nINSTRUCCIONES DE CONTINUIDAD:\n';
            modifiers += '- Usa referencias a conversaciones anteriores\n';
            modifiers += '- NO repitas información ya proporcionada\n';
            modifiers += '- Mantén el contexto de la conversación\n';
            modifiers += '- Haz transiciones naturales entre temas\n';
        }
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
        const conversationLength = context.conversationMemory.metadata.conversationLength;
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
        let scenarioInfo = `\n\nESCENARIO ACTUAL:\n${template.scenarioSpecific[scenario]}\n`;
        // Agregar instrucciones de transición si es necesario
        if (conversationLength > 1) {
            scenarioInfo += '\nINSTRUCCIONES DE TRANSICIÓN:\n';
            switch (scenario) {
                case 'searching':
                    scenarioInfo += '- Si cambias de búsqueda, usa "Ahora busquemos..." o "Cambiando a..."\n';
                    scenarioInfo += '- Si retomas búsqueda anterior, usa "Volviendo a lo que buscabas..."\n';
                    break;
                case 'comparing':
                    scenarioInfo += '- Usa "Comparando..." o "Veamos las diferencias..."\n';
                    scenarioInfo += '- Menciona criterios de comparación claramente\n';
                    break;
                case 'purchasing':
                    scenarioInfo += '- Usa "Procedamos con la compra..." o "Confirmemos..."\n';
                    scenarioInfo += '- Mantén el contexto de productos seleccionados\n';
                    break;
                case 'support':
                    scenarioInfo += '- Usa "Te ayudo con..." o "Resolvamos esto..."\n';
                    scenarioInfo += '- Mantén enfoque en el problema específico\n';
                    break;
                default:
                    scenarioInfo += '- Haz transiciones naturales entre temas\n';
                    scenarioInfo += '- Usa referencias al contexto anterior\n';
            }
        }
        return scenarioInfo;
    }
    /**
     * Agrega contexto de conversación
     */
    addConversationContext(context) {
        const memory = context.conversationMemory;
        const recentQueries = memory.shortTermMemory.recentQueries;
        const currentIntent = memory.workingMemory.currentIntent;
        const entities = context.entities;
        const conversationLength = memory.metadata.conversationLength;
        const userProfile = memory.longTermMemory.userProfile;
        let conversationContext = '\n\nCONTEXTO DE CONVERSACIÓN:\n';
        // Determinar tipo de interacción
        if (conversationLength === 1) {
            conversationContext += '- PRIMERA INTERACCIÓN: Saluda contextualmente\n';
        }
        else if (conversationLength > 1) {
            conversationContext += '- CONVERSACIÓN EN CURSO: Mantén continuidad y usa referencias\n';
        }
        // Información del usuario si es conocida
        if (userProfile.preferences.vehicleInfo) {
            const vehicle = userProfile.preferences.vehicleInfo;
            conversationContext += `- VEHÍCULO CONOCIDO: ${vehicle.brand} ${vehicle.model} ${vehicle.year}\n`;
        }
        if (userProfile.preferences.preferredBrands.length > 0) {
            conversationContext += `- MARCAS PREFERIDAS: ${userProfile.preferences.preferredBrands.join(', ')}\n`;
        }
        // Referencias a consultas anteriores
        if (recentQueries.length > 1) {
            const lastQuery = recentQueries[recentQueries.length - 2]; // Query anterior
            conversationContext += `- CONSULTA ANTERIOR: "${lastQuery}"\n`;
        }
        // Entidades mencionadas en esta conversación
        if (entities.size > 0) {
            conversationContext += '- ENTIDADES MENCIONADAS:\n';
            for (const [key, value] of entities.entries()) {
                conversationContext += `  * ${key}: ${value}\n`;
            }
        }
        // Tópico actual
        if (memory.shortTermMemory.currentTopic) {
            conversationContext += `- TÓPICO ACTUAL: ${memory.shortTermMemory.currentTopic}\n`;
        }
        // Patrones de comportamiento detectados
        const patterns = memory.longTermMemory.behaviorPatterns;
        if (patterns.length > 0) {
            conversationContext += `- PATRONES DETECTADOS: ${patterns.join(', ')}\n`;
        }
        // Instrucciones específicas para continuidad
        if (conversationLength > 1) {
            conversationContext += '\nINSTRUCCIONES DE CONTINUIDAD:\n';
            conversationContext += '- Usa referencias como "Como mencionabas antes..." o "Continuemos con..."\n';
            conversationContext += '- NO repitas saludos ni información ya proporcionada\n';
            conversationContext += '- Mantén el contexto de la conversación anterior\n';
            conversationContext += '- Haz transiciones naturales entre temas\n';
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
