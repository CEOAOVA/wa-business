/**
 * Utilidades para procesamiento de texto y conversión de números a texto
 * Migrado desde Backend-Embler para WhatsApp Business
 */

/**
 * Convierte un número a su representación textual en español
 * @param num Número a convertir
 * @returns Representación textual del número
 */
export const numberToText = (num: number): string => {
  // Validación y casos especiales
  if (isNaN(num)) return "no es un número";
  if (num === 0) return "cero";
  if (num < 0) return "menos " + numberToText(Math.abs(num));

  const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const decenas = ["", "diez", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const especiales = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
  const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

  // Números del 1 al 9
  if (num < 10) return unidades[num];
  
  // Números del 10 al 19
  if (num >= 10 && num < 20) return especiales[num - 10];
  
  // Números del 20 al 99
  if (num < 100) {
    const unidad = num % 10;
    const decena = Math.floor(num / 10);
    return decenas[decena] + (unidad > 0 ? " y " + unidades[unidad] : "");
  }
  
  // Números del 100 al 999
  if (num < 1000) {
    if (num === 100) return "cien";
    const resto = num % 100;
    const centena = Math.floor(num / 100);
    return centenas[centena] + (resto > 0 ? " " + numberToText(resto) : "");
  }
  
  // Números del 1000 al 9999
  if (num < 10000) {
    const resto = num % 1000;
    const millar = Math.floor(num / 1000);
    return (millar === 1 ? "mil" : unidades[millar] + " mil") + 
           (resto > 0 ? " " + numberToText(resto) : "");
  }
  
  // Números mayores a 9999
  return num.toString();
};

/**
 * Convierte un precio a su representación textual
 * @param price Precio a convertir
 * @returns Representación textual del precio
 */
export const priceToText = (price: number): string => {
  if (isNaN(price) || price < 0) return "precio no válido";
  
  // Redondear a dos decimales
  const roundedPrice = Math.round(price * 100) / 100;
  
  // Separar pesos y centavos
  const pesos = Math.floor(roundedPrice);
  const centavos = Math.round((roundedPrice - pesos) * 100);
  
  let result = "";
  
  if (pesos > 0) {
    result += numberToText(pesos) + (pesos === 1 ? " peso" : " pesos");
  }
  
  if (centavos > 0) {
    if (result) result += " con ";
    result += numberToText(centavos) + (centavos === 1 ? " centavo" : " centavos");
  }
  
  if (result === "") result = "cero pesos";
  
  return result + " mexicanos";
};

/**
 * Sanitiza texto para eliminar secuencias de escape visibles como \n, \t, etc.
 * @param text Texto a sanitizar
 * @returns Texto sanitizado
 */
export const sanitizeText = (text: string): string => {
  if (!text) return "";
  console.log("RAW:", JSON.stringify(text));
  try {
    // Primera pasada: Reemplazar cualquier secuencia literal de escape con un placeholder único
    let processedText = text
      // Secuencias específicas
      .replace(/\\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\\\n/g, ' ')     // Newline
      .replace(/\\t/g, ' ')      // Tab
      .replace(/\\r/g, ' ')      // Carriage return
      .replace(/\\'/g, " ")       // Single quote
      .replace(/\\"/g, ' ')       // Double quote
      .replace(/\\\\/g, ' ')     // Backslash
      .replace(/\\b/g, ' ')      // Backspace
      .replace(/\\f/g, ' ')      // Form feed
      .replace(/\\v/g, ' ');     // Vertical tab
    
    // Segunda pasada: Usar un regex para buscar cualquier secuencia de escape que quedó (\u0000, etc.)
    processedText = processedText.replace(/\\u[\dA-Fa-f]{4}/g, match => {
      try {
        // Convertir secuencia unicode a su carácter real
        return String.fromCharCode(parseInt(match.slice(2), 16));
      } catch {
        return match;
      }
    });
    
    // Tercera pasada: Búsqueda agresiva de cualquier combinación \+cualquier cosa que no sea un espacio
    processedText = processedText.replace(/\\([^\s])/g, (_, char) => char);
    
    // Buscar literalmente strings que contengan secuencias de escape como texto (en caso de JSON mal procesado)
    processedText = processedText.replace(/(['"])\\n(['"])/g, '$1\n$2');
    processedText = processedText.replace(/(['"])\\t(['"])/g, '$1\t$2');
    
    // Limpiar cualquier string "\\n" como literal que haya sobrevivido
    processedText = processedText.replace(/[\\]+n/g, ' ');
    processedText = processedText.replace(/[\\]+t/g, ' ');
    
    return processedText;
  } catch (error) {
    console.error("Error al sanitizar texto:", error);
    return text;
  }
};

/**
 * Preprocesa un texto reemplazando números por su representación textual
 * y sanitizando secuencias de escape
 * @param text Texto a preprocesar
 * @returns Texto con números convertidos a palabras y escape sequences sanitizadas
 */
export const preprocessText = (text: string): string => {
  if (!text) return "";
  
  try {
    // Primero sanitizar el texto para eliminar escape sequences visibles
    text = sanitizeText(text);
    
    // Patrones específicos a proteger (no convertir)
    const patternesToProtect = [
      // Códigos de producto específicos (con o sin el prefijo "Código:")
      /Código:?\s*[\w\d-]+/gi,
      // Números de serie, códigos y referencias
      /\b[A-Z]?\d+[A-Z]?\d*-\d+\b/g,
      // Dimensiones y especificaciones técnicas (ej: 15x20, 2.5mm)
      /\b\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?)?(?:mm|cm|m|kg|g|l|ml|oz|lb)?\b/gi,
      // Referencias de modelos específicos
      /\b[A-Z]\d{3,4}\b/g,
      /\b[A-Z][A-Z0-9]{2,5}\b/g,
      // Años en formato completo (ej: 2020, 2021)
      /\b(19|20)\d{2}\b/g
    ];
    
    // Primero proteger patrones específicos
    let processedText = text;
    
    // Crear una lista de palabras a proteger y sus reemplazos temporales
    const protectedSegments: [string, string][] = [];
    
    // Encontrar y proteger segmentos que coincidan con los patrones
    patternesToProtect.forEach((pattern, index) => {
      processedText = processedText.replace(pattern, (match) => {
        const placeholder = `__PROTECTED_${index}_${protectedSegments.length}__`;
        protectedSegments.push([placeholder, match]);
        return placeholder;
      });
    });
    
    // Convertir números aislados a texto
    processedText = processedText.replace(/\b\d+\b/g, (match) => {
      // Si es un precio (con formato 123.45), tratarlo especialmente
      if (match.includes('.')) {
        const num = parseFloat(match);
        if (!isNaN(num)) {
          return priceToText(num);
        }
      }
      
      const num = parseInt(match, 10);
      if (!isNaN(num)) {
        return numberToText(num);
      }
      return match;
    });
    
    // Restaurar los segmentos protegidos
    protectedSegments.forEach(([placeholder, original]) => {
      processedText = processedText.replace(placeholder, original);
    });
    
    return processedText;
  } catch (error) {
    console.error("Error al preprocesar texto:", error);
    return text;
  }
};

/**
 * Normaliza texto para búsqueda eliminando acentos y caracteres especiales
 * @param text Texto a normalizar
 * @returns Texto normalizado
 */
export const normalizeForSearch = (text: string): string => {
  if (!text) return "";
  
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar diacríticos
    .replace(/[^\w\s]/g, " ")        // Reemplazar caracteres especiales con espacios
    .replace(/\s+/g, " ")            // Normalizar espacios múltiples
    .trim();
};

/**
 * Extrae códigos de producto de un texto
 * @param text Texto donde buscar códigos
 * @returns Array de códigos encontrados
 */
export const extractProductCodes = (text: string): string[] => {
  if (!text) return [];
  
  const codePatterns = [
    /\b[A-Z]?\d+[A-Z]?\d*-\d+\b/g,    // ABC123-456
    /\b[A-Z]{1,4}\d{3,6}[A-Z]*\b/g,    // ABC123, AF456
    /\b\d{1,2}[A-Z]{1,3}\d{4,8}[A-Z]?\b/g, // 7P6616039N
    /\b\d+[A-Z]+\d+[A-Z]*\b/g,        // 123ABC456D
    /\b[A-Z0-9]+-[A-Z0-9]+\b/g,       // K0422-582
    /\b[A-Z]{2,4}\d{2,4}[A-Z]{1,2}\b/g, // OEM123A
    /\b\d{4,8}[A-Z]{1,4}\b/g          // 1234AB
  ];
  
  const codes: string[] = [];
  
  codePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      codes.push(...matches);
    }
  });
  
  // Eliminar duplicados y retornar
  return [...new Set(codes)];
};

/**
 * Formatea un número como moneda mexicana
 * @param amount Cantidad a formatear
 * @returns Texto formateado como moneda
 */
export const formatCurrency = (amount: number): string => {
  if (isNaN(amount)) return "$0.00";
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Trunca texto a una longitud específica agregando puntos suspensivos
 * @param text Texto a truncar
 * @param maxLength Longitud máxima
 * @returns Texto truncado
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - 3) + '...';
}; 