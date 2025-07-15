# Script para probar webhook de WhatsApp usando IP directa
# Autor: Sistema de IA
# Fecha: $(Get-Date)

Write-Host "🔍 Probando webhook de WhatsApp con IP directa..." -ForegroundColor Yellow
Write-Host ""

# Configuración
$SERVER_IP = "85.31.235.249"
$VERIFY_TOKEN = "tu_token_secreto"  # Cambiar por el token real
$TEST_CHALLENGE = "test_challenge_" + (Get-Random -Maximum 999999)

# URL del webhook (usando IP directa)
$WEBHOOK_URL = "https://$SERVER_IP/api/chat/webhook"

Write-Host "🌐 Servidor: $SERVER_IP" -ForegroundColor Cyan
Write-Host "🔑 Token: $VERIFY_TOKEN" -ForegroundColor Cyan
Write-Host "🎯 Challenge: $TEST_CHALLENGE" -ForegroundColor Cyan
Write-Host ""

# Función para probar endpoint GET (verificación)
function Test-WebhookVerification {
    Write-Host "📋 PRUEBA 1: Verificación de webhook (GET)" -ForegroundColor Blue
    Write-Host "============================================" -ForegroundColor Blue
    
    try {
        $params = @{
            'hub.mode' = 'subscribe'
            'hub.verify_token' = $VERIFY_TOKEN
            'hub.challenge' = $TEST_CHALLENGE
        }
        
        $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
        $fullUrl = "$WEBHOOK_URL?$queryString"
        
        Write-Host "🔗 URL: $fullUrl" -ForegroundColor Gray
        Write-Host ""
        
        # Usar -SkipCertificateCheck si es posible (PowerShell 6+)
        $response = try {
            Invoke-WebRequest -Uri $fullUrl -Method GET -TimeoutSec 30 -UseBasicParsing
        } catch {
            # Si falla SSL, intentar con certificado ignorado
            Write-Host "⚠️  Error SSL, intentando sin verificación de certificado..." -ForegroundColor Yellow
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
            Invoke-WebRequest -Uri $fullUrl -Method GET -TimeoutSec 30 -UseBasicParsing
        }
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Respuesta exitosa (200)" -ForegroundColor Green
            Write-Host "📤 Contenido recibido: '$($response.Content)'" -ForegroundColor Green
            
            if ($response.Content -eq $TEST_CHALLENGE) {
                Write-Host "🎉 ÉXITO: El challenge fue devuelto correctamente!" -ForegroundColor Green
                return $true
            } else {
                Write-Host "❌ ERROR: Challenge esperado '$TEST_CHALLENGE', recibido '$($response.Content)'" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "❌ ERROR: Código de estado $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "❌ ERROR en la prueba: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "📋 Detalles: $($_.Exception)" -ForegroundColor Gray
        return $false
    }
}

# Función para probar endpoint POST (recepción de mensajes)
function Test-WebhookPost {
    Write-Host ""
    Write-Host "📋 PRUEBA 2: Recepción de mensaje (POST)" -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
    
    try {
        # Mensaje de prueba simulando webhook de WhatsApp
        $testMessage = @{
            object = "whatsapp_business_account"
            entry = @(
                @{
                    id = "test_entry_id"
                    changes = @(
                        @{
                            value = @{
                                messaging_product = "whatsapp"
                                metadata = @{
                                    display_phone_number = "1234567890"
                                    phone_number_id = "test_phone_id"
                                }
                                messages = @(
                                    @{
                                        from = "5212345678901"
                                        id = "test_message_id"
                                        timestamp = [Math]::Floor((Get-Date -UFormat %s))
                                        text = @{
                                            body = "Mensaje de prueba"
                                        }
                                        type = "text"
                                    }
                                )
                            }
                            field = "messages"
                        }
                    )
                }
            )
        }
        
        $jsonBody = $testMessage | ConvertTo-Json -Depth 10
        Write-Host "📤 Enviando mensaje de prueba..." -ForegroundColor Gray
        
        $response = try {
            Invoke-WebRequest -Uri $WEBHOOK_URL -Method POST -Body $jsonBody -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
        } catch {
            # Si falla SSL, intentar con certificado ignorado
            Write-Host "⚠️  Error SSL, intentando sin verificación de certificado..." -ForegroundColor Yellow
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
            Invoke-WebRequest -Uri $WEBHOOK_URL -Method POST -Body $jsonBody -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
        }
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Mensaje procesado exitosamente (200)" -ForegroundColor Green
            Write-Host "📤 Respuesta: '$($response.Content)'" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ ERROR: Código de estado $($response.StatusCode)" -ForegroundColor Red
            Write-Host "📤 Respuesta: '$($response.Content)'" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "❌ ERROR en la prueba: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Función para probar endpoint de debug
function Test-WebhookDebug {
    Write-Host ""
    Write-Host "📋 PRUEBA 3: Información de debug" -ForegroundColor Blue
    Write-Host "==================================" -ForegroundColor Blue
    
    try {
        $debugUrl = "$WEBHOOK_URL/debug"
        Write-Host "🔗 URL: $debugUrl" -ForegroundColor Gray
        
        $response = try {
            Invoke-WebRequest -Uri $debugUrl -Method GET -TimeoutSec 30 -UseBasicParsing
        } catch {
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
            Invoke-WebRequest -Uri $debugUrl -Method GET -TimeoutSec 30 -UseBasicParsing
        }
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Debug info obtenida exitosamente" -ForegroundColor Green
            $debugInfo = $response.Content | ConvertFrom-Json
            Write-Host "📋 Configuración actual:" -ForegroundColor Cyan
            Write-Host ($debugInfo | ConvertTo-Json -Depth 3) -ForegroundColor Gray
            return $true
        } else {
            Write-Host "❌ ERROR: Código de estado $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "❌ ERROR en la prueba: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Ejecutar pruebas
Write-Host "🚀 Iniciando pruebas del webhook..." -ForegroundColor Yellow
Write-Host ""

# Ignorar errores SSL para pruebas
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

$results = @{
    verification = Test-WebhookVerification
    post = Test-WebhookPost  
    debug = Test-WebhookDebug
}

# Resumen final
Write-Host ""
Write-Host "📊 RESUMEN DE PRUEBAS" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow
Write-Host "✅ Verificación de webhook: $($results.verification)" -ForegroundColor $(if($results.verification) {"Green"} else {"Red"})
Write-Host "✅ Recepción de mensajes: $($results.post)" -ForegroundColor $(if($results.post) {"Green"} else {"Red"})
Write-Host "✅ Información de debug: $($results.debug)" -ForegroundColor $(if($results.debug) {"Green"} else {"Red"})
Write-Host ""

if ($results.verification) {
    Write-Host "🎉 ¡El webhook está funcionando correctamente!" -ForegroundColor Green
    Write-Host "📝 Puedes configurarlo en Meta for Developers con:" -ForegroundColor Cyan
    Write-Host "   URL: https://dev-apiwaprueba.aova.mx/api/chat/webhook" -ForegroundColor White
    Write-Host "   Token: $VERIFY_TOKEN" -ForegroundColor White
} else {
    Write-Host "❌ Hay problemas con el webhook. Revisa:" -ForegroundColor Red
    Write-Host "   1. ¿Está el servicio funcionando en Coolify?" -ForegroundColor Yellow
    Write-Host "   2. ¿Es correcto el token de verificación?" -ForegroundColor Yellow
    Write-Host "   3. ¿Hay errores en los logs del backend?" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Presiona Enter para continuar..." -ForegroundColor Gray
Read-Host 