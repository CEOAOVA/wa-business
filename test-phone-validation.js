/**
 * Script de prueba para validar números de teléfono
 * Verifica que los números mexicanos se procesen correctamente
 */

// Simular la función validatePhoneNumber del backend (versión corregida con lógica inteligente)
function validatePhoneNumber(phone) {
  try {
    // Remover todos los caracteres no numéricos
    let cleaned = phone.replace(/\D/g, '');
    
    // Verificar que tenga al menos 10 dígitos
    if (cleaned.length < 10) {
      return {
        isValid: false,
        formatted: phone,
        error: 'El número debe tener al menos 10 dígitos'
      };
    }
    
    // Si el número empieza con 52 (código de México), procesarlo correctamente
    if (cleaned.startsWith('52')) {
      // Si tiene exactamente 12 dígitos (52 + 10 dígitos), está bien formateado
      if (cleaned.length === 12) {
        return {
          isValid: true,
          formatted: cleaned,
          error: undefined
        };
      }
      // Si tiene exactamente 13 dígitos y empieza con 521, está bien formateado
      if (cleaned.length === 13 && cleaned.startsWith('521')) {
        return {
          isValid: true,
          formatted: cleaned,
          error: undefined
        };
      }
      // Si tiene más de 13 dígitos, verificar si es un número válido de México
      if (cleaned.length > 13) {
        // Si empieza con 521 (código de México + área), mantener el formato
        if (cleaned.startsWith('521')) {
          // Tomar los primeros 13 dígitos para mantener el formato correcto
          cleaned = cleaned.substring(0, 13);
          console.log(`📱 [PhoneValidation] Número mexicano con área truncado a 13 dígitos: ${cleaned}`);
          return {
            isValid: true,
            formatted: cleaned,
            error: undefined
          };
        } else {
          // Para otros casos, tomar los últimos 12 dígitos
          cleaned = cleaned.slice(-12);
          console.log(`📱 [PhoneValidation] Número con código 52 truncado a últimos 12 dígitos: ${cleaned}`);
          return {
            isValid: true,
            formatted: cleaned,
            error: undefined
          };
        }
      }
      // Si tiene menos de 12 dígitos pero empieza con 52, es inválido
      return {
        isValid: false,
        formatted: phone,
        error: 'Número mexicano incompleto (debe tener 12 dígitos con código 52)'
      };
    }
    
    // Si empieza con 1 (código de país), removerlo para México
    // SOLO si no es un número mexicano (no empieza con 52)
    if (cleaned.startsWith('1') && cleaned.length === 11 && !cleaned.startsWith('521')) {
      cleaned = cleaned.substring(1);
      console.log(`📱 [PhoneValidation] Removido código de país 1: ${cleaned}`);
    }
    
    // Si el número tiene más de 10 dígitos, tomar los últimos 10
    if (cleaned.length > 10) {
      cleaned = cleaned.slice(-10);
      console.log(`📱 [PhoneValidation] Número truncado a últimos 10 dígitos: ${cleaned}`);
    }
    
    // Verificar que sea un número válido de México (10 dígitos)
    if (cleaned.length !== 10) {
      return {
        isValid: false,
        formatted: phone,
        error: 'El número debe tener 10 dígitos (formato mexicano)'
      };
    }
    
    // Formatear para WhatsApp (código de país + número)
    const formatted = `52${cleaned}`;
    
    return {
      isValid: true,
      formatted,
      error: undefined
    };
  } catch (error) {
    return {
      isValid: false,
      formatted: phone,
      error: 'Error validando número de teléfono'
    };
  }
}

// Casos de prueba específicos para el problema reportado
const testCases = [
  // Caso específico del problema reportado
  { input: '5215549679734', expected: '5215549679734', description: 'Número mexicano completo con 52155 (CASO PROBLEMA)' },
  { input: '15549679734', expected: '5215549679734', description: 'Número mexicano sin código país (155)' },
  { input: '5549679734', expected: '525549679734', description: 'Número mexicano sin código país (55)' },
  
  // Números mexicanos correctos
  { input: '521551234567', expected: '521551234567', description: 'Número mexicano completo con 52' },
  { input: '1551234567', expected: '521551234567', description: 'Número mexicano sin código país' },
  { input: '551234567', expected: '52551234567', description: 'Número mexicano sin código país' },
  
  // Números con formato internacional
  { input: '+521551234567', expected: '521551234567', description: 'Número con +52' },
  { input: '52 155 123 4567', expected: '521551234567', description: 'Número con espacios' },
  { input: '52-155-123-4567', expected: '521551234567', description: 'Número con guiones' },
  
  // Números largos (deberían truncarse inteligentemente)
  { input: '521551234567890', expected: '5215512345678', description: 'Número largo con 521 (truncar a 13 dígitos)' },
  { input: '521234567890123', expected: '521234567890', description: 'Número largo con 52 (truncar últimos 12)' },
  { input: '1551234567890', expected: '521551234567', description: 'Número largo sin código país (truncar)' },
  
  // Casos inválidos
  { input: '123', expected: 'invalid', description: 'Número muy corto' },
  { input: '521234', expected: 'invalid', description: 'Número mexicano incompleto' },
];

console.log('🧪 Probando validación de números de teléfono (VERSIÓN FINAL)...\n');

testCases.forEach((testCase, index) => {
  console.log(`📱 Test ${index + 1}: ${testCase.description}`);
  console.log(`   Input: ${testCase.input}`);
  
  const result = validatePhoneNumber(testCase.input);
  
  if (testCase.expected === 'invalid') {
    if (!result.isValid) {
      console.log(`   ✅ PASÓ - Correctamente inválido: ${result.error}`);
    } else {
      console.log(`   ❌ FALLÓ - Debería ser inválido pero resultó válido: ${result.formatted}`);
    }
  } else {
    if (result.isValid && result.formatted === testCase.expected) {
      console.log(`   ✅ PASÓ - Resultado correcto: ${result.formatted}`);
    } else {
      console.log(`   ❌ FALLÓ - Esperado: ${testCase.expected}, Obtenido: ${result.formatted} (${result.error || 'sin error'})`);
    }
  }
  console.log('');
});

console.log('🎯 Pruebas completadas. Verifica que el caso específico 5215549679734 mantenga el "1" y no se convierta en 525549679734.');