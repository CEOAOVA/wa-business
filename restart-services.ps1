# Script PowerShell para reiniciar servicios con los nuevos cambios
# Uso: .\restart-services.ps1

Write-Host "🚀 Reiniciando servicios con cambios de WebSocket..." -ForegroundColor Yellow

# Función para matar procesos por nombre
function Stop-NodeProcess {
    param($ProcessName)
    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($processes) {
        Stop-Process -Name $ProcessName -Force
        Write-Host "✅ Proceso $ProcessName detenido" -ForegroundColor Green
    }
}

# Detener procesos anteriores
Write-Host "🛑 Deteniendo procesos anteriores..." -ForegroundColor Yellow
Stop-NodeProcess "node"

Start-Sleep -Seconds 2

# Backend
Write-Host "`n📦 Compilando Backend..." -ForegroundColor Yellow
Set-Location -Path "backend"

npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend compilado exitosamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error compilando backend" -ForegroundColor Red
    exit 1
}

# Iniciar backend
Write-Host "🚀 Iniciando Backend..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run start" -NoNewWindow -PassThru
Write-Host "✅ Backend iniciado" -ForegroundColor Green

# Frontend
Set-Location -Path "../frontend"
Write-Host "`n🎨 Iniciando Frontend..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run dev" -NoNewWindow -PassThru
Write-Host "✅ Frontend iniciado" -ForegroundColor Green

# Esperar un momento para que los servicios se estabilicen
Start-Sleep -Seconds 5

# Verificar servicios
Write-Host "`n🔍 Verificando servicios..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend respondiendo en http://localhost:3001" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend no responde" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Frontend respondiendo en http://localhost:5173" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend no responde" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ SERVICIOS REINICIADOS EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:5173"
Write-Host "🔌 Backend: http://localhost:3001"
Write-Host ""
Write-Host "🧪 Ahora puedes probar la conexión WebSocket:" -ForegroundColor Yellow
Write-Host "1. Abre http://localhost:5173 en el navegador"
Write-Host "2. Abre la consola (F12)"
Write-Host "3. Ejecuta: testWebSocket()"
Write-Host ""
Write-Host "Presiona Ctrl+C para detener todos los servicios" -ForegroundColor Yellow

# Mantener el script corriendo
Read-Host "Presiona Enter para salir"