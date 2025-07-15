# 🔧 Comandos de Verificación SSL - WhatsApp Backend
# Ejecutar estos comandos para verificar el progreso del SSL

Write-Host "🔍 Verificando SSL para dev-apiwaprueba.aova.mx..." -ForegroundColor Cyan

# 1. Verificar conectividad básica
Write-Host "`n1. Verificando conectividad al puerto 443..." -ForegroundColor Yellow
Test-NetConnection dev-apiwaprueba.aova.mx -Port 443

# 2. Verificar si el certificado SSL es válido
Write-Host "`n2. Verificando certificado SSL..." -ForegroundColor Yellow
try {
    $request = [Net.HttpWebRequest]::Create("https://dev-apiwaprueba.aova.mx/health")
    $response = $request.GetResponse()
    Write-Host "✅ SSL FUNCIONA! - Código de respuesta: $($response.StatusCode)" -ForegroundColor Green
    $response.Close()
} catch {
    $errorMsg = $_.Exception.InnerException.Message
    if ($errorMsg -like "*certificado remoto no es válido*") {
        Write-Host "❌ SSL AÚN NO FUNCIONA - Certificado inválido" -ForegroundColor Red
        Write-Host "⏱️ Espera 2-3 minutos más o prueba alternativas de certresolver" -ForegroundColor Orange
    } else {
        Write-Host "❌ Error: $errorMsg" -ForegroundColor Red
    }
}

# 3. Verificar endpoint del webhook específicamente
Write-Host "`n3. Verificando endpoint del webhook..." -ForegroundColor Yellow
try {
    $webhookRequest = [Net.HttpWebRequest]::Create("https://dev-apiwaprueba.aova.mx/api/chat/webhook")
    $webhookRequest.Method = "GET"
    $webhookResponse = $webhookRequest.GetResponse()
    Write-Host "✅ Webhook endpoint responde - Código: $($webhookResponse.StatusCode)" -ForegroundColor Green
    $webhookResponse.Close()
} catch {
    Write-Host "⚠️ Webhook endpoint error (normal si SSL no funciona aún): $($_.Exception.Message)" -ForegroundColor Orange
}

# 4. Probar con parámetros de verificación de WhatsApp
Write-Host "`n4. Probando verificación de webhook (simulando Facebook)..." -ForegroundColor Yellow
try {
    $verifyUrl = "https://dev-apiwaprueba.aova.mx/api/chat/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=TU_TOKEN_AQUI"
    Write-Host "URL de prueba: $verifyUrl" -ForegroundColor Gray
    Write-Host "⚠️ Reemplaza 'TU_TOKEN_AQUI' con tu WEBHOOK_VERIFY_TOKEN real" -ForegroundColor Orange
} catch {
    Write-Host "❌ Error en verificación: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📋 RESUMEN:" -ForegroundColor Cyan
Write-Host "✅ Si aparece 'SSL FUNCIONA!' arriba, puedes configurar el webhook en WhatsApp" -ForegroundColor Green
Write-Host "❌ Si aparece 'SSL AÚN NO FUNCIONA', espera unos minutos o prueba alternativas" -ForegroundColor Red
Write-Host "📱 URL del webhook para WhatsApp: https://dev-apiwaprueba.aova.mx/api/chat/webhook" -ForegroundColor Cyan

Write-Host "`n🔄 Para volver a probar, ejecuta este script nuevamente" -ForegroundColor Gray 