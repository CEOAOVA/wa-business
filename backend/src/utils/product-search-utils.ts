import { CarData, ProductMatch } from '../types/product-search';

/**
 * Extraer datos del auto de un mensaje de texto
 */
export function extractCarDataFromMessage(message: string): CarData {
  const carData: CarData = {};
  
  // Extraer marca
  const brandRegex = /\b(nissan|toyota|honda|ford|chevrolet|volkswagen|hyundai|kia|mazda|subaru|bmw|mercedes|audi)\b/i;
  const brandMatch = message.match(brandRegex);
  if (brandMatch) {
    carData.marca = brandMatch[0].toLowerCase();
  }
  
  // Extraer año
  const yearRegex = /\b(19|20)\d{2}\b/g;
  const yearMatch = message.match(yearRegex);
  if (yearMatch) {
    carData.año = parseInt(yearMatch[0]);
  }
  
  // Extraer modelo (patrones comunes)
  const modelPatterns = [
    /\b(corolla|camry|civic|accord|focus|fusion|jetta|golf|sentra|altima)\b/i,
    /\b(x5|x3|e90|e46|w203|c200|c300|a3|a4|q3|q5)\b/i
  ];
  
  for (const pattern of modelPatterns) {
    const modelMatch = message.match(pattern);
    if (modelMatch) {
      carData.modelo = modelMatch[0].toLowerCase();
      break;
    }
  }
  
  return carData;
}

/**
 * Formatear resultados de búsqueda para mostrar al usuario
 */
export function formatSearchResults(matches: ProductMatch[], carData: CarData): string {
  if (matches.length === 0) {
    return "No encontré productos que coincidan con tu búsqueda. ¿Podrías ser más específico?";
  }
  
  let response = `Encontré ${matches.length} opciones:\n\n`;
  
  matches.slice(0, 5).forEach((match, index) => {
    const compatibility = match.carCompatibility ? "✅" : "⚠️";
    const confidence = match.confidence > 0.8 ? "🟢" : match.confidence > 0.5 ? "🟡" : "🔴";
    
    response += `${index + 1}. ${confidence} ${match.nombre}\n`;
    response += `   ${compatibility} Compatible: ${match.carCompatibility ? "Sí" : "Revisar"}\n`;
    if (match.marca) response += `   🚗 Marca: ${match.marca}\n`;
    if (match.año) response += `   📅 Año: ${match.año}\n`;
    response += `\n`;
  });
  
  if (matches.length > 5) {
    response += `... y ${matches.length - 5} opciones más.\n\n`;
  }
  
  response += "¿Cuál te interesa? Responde con el número o dime más detalles.";
  
  return response;
}

/**
 * Validar confirmación del usuario
 */
export function parseUserConfirmation(userResponse: string): {
  confirmed: boolean;
  selectedIndex?: number;
  needsClarification: boolean;
} {
  const response = userResponse.toLowerCase().trim();
  
  // Confirmaciones positivas
  const positivePatterns = [
    /^(sí|si|yes|ok|vale|perfecto|correcto|exacto)$/,
    /^(opción|opcion)\s*(\d+)$/,
    /^(\d+)$/
  ];
  
  // Confirmaciones negativas
  const negativePatterns = [
    /^(no|nop|ninguna|otro|diferente|buscar|busca)$/
  ];
  
  // Verificar confirmación positiva
  for (const pattern of positivePatterns) {
    const match = response.match(pattern);
    if (match) {
      if (match[2]) { // Número de opción
        return { confirmed: true, selectedIndex: parseInt(match[2]) - 1, needsClarification: false };
      } else if (match[1] && !isNaN(parseInt(match[1]))) { // Solo número
        return { confirmed: true, selectedIndex: parseInt(match[1]) - 1, needsClarification: false };
      } else {
        return { confirmed: true, needsClarification: false };
      }
    }
  }
  
  // Verificar confirmación negativa
  for (const pattern of negativePatterns) {
    if (pattern.test(response)) {
      return { confirmed: false, needsClarification: false };
    }
  }
  
  // Respuesta no clara
  return { confirmed: false, needsClarification: true };
}

/**
 * Generar sugerencias de búsqueda
 */
export function generateSearchSuggestions(userTerm: string): string[] {
  const suggestions = [
    "¿Podrías ser más específico? Por ejemplo: 'balatas delanteras Toyota Corolla'",
    "Intenta con términos como: filtro, bujías, aceite, frenos, suspensión",
    "¿Qué marca y modelo es tu auto? Eso me ayudaría a encontrar lo correcto"
  ];
  
  return suggestions;
}