"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conceptsService = exports.ConceptsService = void 0;
/**
 * Servicio para mapear conceptos coloquiales mexicanos a términos técnicos
 * Mejora la búsqueda de productos con terminología local
 */
const text_processing_1 = require("../utils/text-processing");
class ConceptsService {
    constructor() {
        this.conceptMappings = [];
        this.variantMap = new Map();
        this.isLoaded = false;
        this.loadConceptMappings();
    }
    /**
     * Carga los mapeos de conceptos mexicanos
     */
    loadConceptMappings() {
        this.conceptMappings = [
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
        // Crear mapa inverso para búsqueda rápida
        this.variantMap.clear();
        this.conceptMappings.forEach(mapping => {
            mapping.variantes.forEach(variante => {
                const normalized = this.normalizeTerm(variante);
                this.variantMap.set(normalized, mapping.pieza);
            });
        });
        this.isLoaded = true;
        console.log(`[ConceptsService] Cargados ${this.conceptMappings.length} mapeos de conceptos`);
        console.log(`[ConceptsService] Total de variantes: ${this.variantMap.size}`);
    }
    /**
     * Normaliza un término para búsqueda
     */
    normalizeTerm(term) {
        return (0, text_processing_1.normalizeForSearch)(term);
    }
    /**
     * Normaliza un término de búsqueda reemplazando variantes coloquiales con términos formales
     */
    normalizeSearchTerm(searchTerm) {
        if (!this.isLoaded) {
            return searchTerm;
        }
        const normalizedInput = this.normalizeTerm(searchTerm);
        // Comprobar si el término completo coincide con una variante
        if (this.variantMap.has(normalizedInput)) {
            const formalTerm = this.variantMap.get(normalizedInput);
            console.log(`[ConceptsService] Término completo "${searchTerm}" normalizado a "${formalTerm}"`);
            return formalTerm;
        }
        // Si no hay coincidencia exacta, revisar tokens individuales
        const tokens = normalizedInput.split(' ');
        let modified = false;
        const productTokens = [];
        tokens.forEach(token => {
            if (this.variantMap.has(token)) {
                modified = true;
                productTokens.push(this.variantMap.get(token));
                console.log(`[ConceptsService] Token "${token}" normalizado a "${this.variantMap.get(token)}"`);
            }
            else if (this.isProductRelatedWord(token)) {
                productTokens.push(token);
                console.log(`[ConceptsService] Token "${token}" mantenido como palabra de producto`);
            }
            else {
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
    isProductRelatedWord(word) {
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
    convertToTechnicalName(userTerm) {
        if (!this.isLoaded) {
            return userTerm;
        }
        const cleanTerm = this.normalizeTerm(userTerm);
        // Buscar en las variantes
        if (this.variantMap.has(cleanTerm)) {
            const technical = this.variantMap.get(cleanTerm);
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
    processFullText(text) {
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
    getSuggestions(term) {
        if (!this.isLoaded) {
            return [];
        }
        const normalizedTerm = this.normalizeTerm(term);
        const suggestions = [];
        // Buscar mapeos que contengan el término
        for (const mapping of this.conceptMappings) {
            const hasMatch = mapping.variantes.some(variante => this.normalizeTerm(variante).includes(normalizedTerm) ||
                normalizedTerm.includes(this.normalizeTerm(variante)));
            if (hasMatch) {
                suggestions.push(mapping.pieza);
                // Agregar también algunas variantes comunes
                suggestions.push(...mapping.variantes.slice(0, 2));
            }
        }
        // Eliminar duplicados y el término original
        return [...new Set(suggestions)].filter(s => this.normalizeTerm(s) !== normalizedTerm).slice(0, 5);
    }
    /**
     * Obtiene todas las categorías disponibles
     */
    getCategories() {
        if (!this.isLoaded) {
            return [];
        }
        const categories = new Set();
        this.conceptMappings.forEach(mapping => {
            if (mapping.categoria) {
                categories.add(mapping.categoria);
            }
        });
        return Array.from(categories);
    }
    /**
     * Obtiene conceptos por categoría
     */
    getConceptsByCategory(categoria) {
        if (!this.isLoaded) {
            return [];
        }
        return this.conceptMappings.filter(mapping => mapping.categoria === categoria);
    }
    /**
     * Verifica si el servicio está cargado
     */
    isServiceLoaded() {
        return this.isLoaded;
    }
    /**
     * Obtiene estadísticas del servicio
     */
    getStats() {
        return {
            totalMappings: this.conceptMappings.length,
            totalVariants: this.variantMap.size,
            categories: this.getCategories().length,
            isLoaded: this.isLoaded
        };
    }
    /**
     * Recarga los conceptos
     */
    reload() {
        this.isLoaded = false;
        this.conceptMappings = [];
        this.variantMap.clear();
        this.loadConceptMappings();
    }
}
exports.ConceptsService = ConceptsService;
// Exportar instancia singleton
exports.conceptsService = new ConceptsService();
