# 🧪 Script de Prueba del Webhook de WhatsApp
# Simula exactamente lo que hace Facebook para validar el webhook

param(
    [string]$WebhookUrl = "https://dev-apiwaprueba.aova.mx/api/chat/webhook",
    [string]$VerifyToken = "TU_TOKEN_AQUI"
)

Write-Host "🧪 Probando Webhook de WhatsApp..." -ForegroundColor Cyan
Write-Host "📍 URL: $WebhookUrl" -ForegroundColor Gray
Write-Host "🔑 Token: $($VerifyToken.Substring(0, [Math]::Min(10, $VerifyToken.Length)))..." -ForegroundColor Gray

# Test 1: Verificar conectividad básica
Write-Host "`n1. 🌐 Verificando conectividad básica..." -ForegroundColor Yellow
try {
    $basicTest = Invoke-WebRequest -Uri $WebhookUrl -Method GET -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Servidor responde - Status: $($basicTest.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error de conectividad: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "⚠️ Asegúrate de que el SSL funciona correctamente" -ForegroundColor Orange
    exit 1
}

# Test 2: Simulación exacta de verificación de Facebook
Write-Host "`n2. 🔐 Simulando verificación de Facebook..." -ForegroundColor Yellow

$challengeTest = "test_challenge_" + (Get-Random -Maximum 999999)
$verificationUrl = "$WebhookUrl" + "?hub.mode=subscribe&hub.challenge=$challengeTest&hub.verify_token=$VerifyToken"

Write-Host "📝 URL completa de verificación:" -ForegroundColor Gray
Write-Host "$verificationUrl" -ForegroundColor DarkGray

try {
    $verifyResponse = Invoke-WebRequest -Uri $verificationUrl -Method GET -UseBasicParsing -TimeoutSec 15
    
    $responseContent = $verifyResponse.Content.Trim()
    
    Write-Host "✅ Respuesta del servidor - Status: $($verifyResponse.StatusCode)" -ForegroundColor Green
    Write-Host "📄 Contenido de respuesta: '$responseContent'" -ForegroundColor Green
    
    if ($responseContent -eq $challengeTest) {
        Write-Host "🎉 ¡WEBHOOK VALIDACIÓN EXITOSA!" -ForegroundColor Green
        Write-Host "✅ El servidor devolvió el challenge correcto" -ForegroundColor Green
        Write-Host "📱 Puedes configurar este webhook en Meta for Developers" -ForegroundColor Green
    } else {
        Write-Host "❌ WEBHOOK VALIDACIÓN FALLIDA" -ForegroundColor Red
        Write-Host "❌ Esperado: '$challengeTest'" -ForegroundColor Red
        Write-Host "❌ Recibido: '$responseContent'" -ForegroundColor Red
    }
    
} catch {
    $errorMsg = $_.Exception.Message
    
    if ($errorMsg -like "*403*" -or $errorMsg -like "*Forbidden*") {
        Write-Host "❌ ERROR 403 - Token de verificación incorrecto" -ForegroundColor Red
        Write-Host "🔧 Verifica que WEBHOOK_VERIFY_TOKEN en .env coincida exactamente" -ForegroundColor Orange
        Write-Host "🔧 Token usado en prueba: $VerifyToken" -ForegroundColor Orange
    } elseif ($errorMsg -like "*400*" -or $errorMsg -like "*Bad Request*") {
        Write-Host "❌ ERROR 400 - Parámetros inválidos" -ForegroundColor Red
        Write-Host "🔧 Revisa la implementación del endpoint GET /api/chat/webhook" -ForegroundColor Orange
    } elseif ($errorMsg -like "*500*") {
        Write-Host "❌ ERROR 500 - Error interno del servidor" -ForegroundColor Red
        Write-Host "🔧 Revisa los logs del backend para más detalles" -ForegroundColor Orange
    } else {
        Write-Host "❌ Error inesperado: $errorMsg" -ForegroundColor Red
    }
}

# Test 3: Verificar configuración de headers
Write-Host "`n3. 📋 Verificando headers de respuesta..." -ForegroundColor Yellow
try {
    $headersTest = Invoke-WebRequest -Uri $WebhookUrl -Method GET -UseBasicParsing -TimeoutSec 10
    
    Write-Host "📄 Headers importantes:" -ForegroundColor Gray
    if ($headersTest.Headers.ContainsKey("Content-Type")) {
        Write-Host "   Content-Type: $($headersTest.Headers.'Content-Type')" -ForegroundColor DarkGray
    }
    if ($headersTest.Headers.ContainsKey("Server")) {
        Write-Host "   Server: $($headersTest.Headers.'Server')" -ForegroundColor DarkGray
    }
    if ($headersTest.Headers.ContainsKey("X-Powered-By")) {
        Write-Host "   X-Powered-By: $($headersTest.Headers.'X-Powered-By')" -ForegroundColor DarkGray
    }
    
} catch {
    Write-Host "⚠️ No se pudieron obtener headers adicionales" -ForegroundColor Orange
}

Write-Host "`n📋 RESUMEN DE PRUEBAS:" -ForegroundColor Cyan
Write-Host "1. ✅ Conectividad básica" -ForegroundColor Green
Write-Host "2. ❓ Validación del webhook (ver arriba)" -ForegroundColor Yellow
Write-Host "3. ✅ Headers verificados" -ForegroundColor Green

Write-Host "`n🔧 CONFIGURACIÓN PARA META FOR DEVELOPERS:" -ForegroundColor Cyan
Write-Host "   Callback URL: $WebhookUrl" -ForegroundColor White
Write-Host "   Verify Token: $VerifyToken" -ForegroundColor White

Write-Host "`n💡 SOLUCIÓN DE PROBLEMAS:" -ForegroundColor Cyan
Write-Host "   1. Si falla token: Verifica WEBHOOK_VERIFY_TOKEN en backend/.env" -ForegroundColor Gray
Write-Host "   2. Si falla SSL: Ejecuta .\ssl-verification-commands.ps1" -ForegroundColor Gray
Write-Host "   3. Si falla 500: Revisa logs del contenedor backend en Coolify" -ForegroundColor Gray 