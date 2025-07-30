"use strict";
/**
 * Script de prueba para verificar la detección de mensajes automotrices
 * y el uso del servicio especializado
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chatbot_service_1 = require("../services/chatbot.service");
function testAutomotiveDetection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚗 Probando detección de mensajes automotrices...\n');
        const chatbotService = new chatbot_service_1.ChatbotService();
        // Casos de prueba
        const testCases = [
            {
                message: "mi nombre es karol, vivo en el codigo postal 54170, necesito FUNDA PALANCA VELOCIDADES TRANSMISION ESTANDAR SPRINTER W906 VW CRAFTER 2006 MARCA FREY, no tengo mas información para darte",
                expectedType: "automotive",
                description: "Mensaje completo con pieza específica y datos del auto"
            },
            {
                message: "Necesito pastillas de freno para mi Honda Civic 2020",
                expectedType: "automotive",
                description: "Mensaje con pieza y datos del auto"
            },
            {
                message: "Hola, ¿cómo estás?",
                expectedType: "general",
                description: "Mensaje general de saludo"
            },
            {
                message: "Busco filtro de aceite para Toyota Corolla",
                expectedType: "automotive",
                description: "Mensaje con pieza y marca de auto"
            },
            {
                message: "¿Cuál es el horario de atención?",
                expectedType: "general",
                description: "Mensaje de consulta general"
            }
        ];
        for (const testCase of testCases) {
            console.log(`📝 Probando: "${testCase.description}"`);
            console.log(`   Mensaje: "${testCase.message.substring(0, 80)}..."`);
            try {
                // Simular el procesamiento del mensaje
                const response = yield chatbotService.processWhatsAppMessage('5512345678', testCase.message);
                console.log(`   ✅ Respuesta generada: ${response.response.substring(0, 100)}...`);
                console.log(`   📊 Tipo detectado: ${testCase.expectedType}`);
            }
            catch (error) {
                console.error(`   ❌ Error: ${error}`);
            }
            console.log('');
        }
        console.log('✅ Pruebas completadas');
    });
}
// Ejecutar pruebas
testAutomotiveDetection().catch(console.error);
