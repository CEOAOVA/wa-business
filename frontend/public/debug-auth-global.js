/**
 * Script global de debug para autenticación
 * Se carga automáticamente en todas las páginas
 */

(function() {
    'use strict';
    
    console.log('🔧 Debug de Autenticación Global - WhatsApp Business Platform');
    console.log('============================================================');
    
    // Función para limpiar sesión
    function clearAuthSession() {
        console.log('🗑️ Limpiando sesión de autenticación...');
        
        // Limpiar localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('rememberAuth');
        
        // Limpiar sessionStorage
        sessionStorage.clear();
        
        // Limpiar cookies
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        console.log('✅ Sesión limpiada exitosamente');
        checkAuthStatus();
    }
    
    // Función para verificar estado de autenticación
    function checkAuthStatus() {
        console.log('🔍 Verificando estado de autenticación...');
        
        const token = localStorage.getItem('authToken');
        const rememberAuth = localStorage.getItem('rememberAuth');
        const sessionData = sessionStorage.length;
        
        console.log('📊 Estado actual:');
        console.log('  • Token de autenticación:', token ? '✅ Presente' : '❌ No encontrado');
        console.log('  • Recordar autenticación:', rememberAuth ? '✅ Activado' : '❌ No activado');
        console.log('  • Datos en sessionStorage:', sessionData > 0 ? `⚠️ ${sessionData} elementos` : '✅ Vacío');
        
        if (token) {
            try {
                // Verificar formato del token
                const parts = token.split('.');
                if (parts.length === 3) {
                    console.log('  • Formato del token: ✅ Válido (JWT)');
                    
                    // Decodificar payload
                    const payload = JSON.parse(atob(parts[1]));
                    console.log('  • Payload del token:', payload);
                    
                    // Verificar expiración
                    if (payload.exp) {
                        const currentTime = Math.floor(Date.now() / 1000);
                        const isExpired = payload.exp < currentTime;
                        console.log('  • Token expirado:', isExpired ? '❌ Sí' : '✅ No');
                        console.log('  • Expira en:', new Date(payload.exp * 1000).toLocaleString());
                    }
                } else {
                    console.log('  • Formato del token: ❌ Inválido');
                }
            } catch (error) {
                console.log('  • Error al decodificar token:', error.message);
            }
        }
        
        // Verificar cookies
        const cookies = document.cookie.split(';').filter(c => c.trim());
        console.log('  • Cookies:', cookies.length > 0 ? `⚠️ ${cookies.length} encontradas` : '✅ No hay cookies');
        
        return {
            hasToken: !!token,
            hasRememberAuth: !!rememberAuth,
            sessionDataCount: sessionData,
            cookiesCount: cookies.length
        };
    }
    
    // Función para forzar logout y redirección
    function forceLogout() {
        console.log('🚪 Forzando logout...');
        clearAuthSession();
        
        // Redirigir al login
        console.log('🔄 Redirigiendo al login...');
        window.location.href = '/login';
    }
    
    // Función para recargar la página
    function reloadPage() {
        console.log('🔄 Recargando página...');
        window.location.reload();
    }
    
    // Función para ir al login
    function goToLogin() {
        console.log('🚀 Navegando al login...');
        window.location.href = '/login';
    }
    
    // Función para ir a la página de limpieza
    function goToCleanupPage() {
        console.log('🔧 Abriendo página de limpieza...');
        window.open('/clear-session.html', '_blank');
    }
    
    // Función para limpiar y recargar
    function clearAndReload() {
        console.log('🧹 Limpiando y recargando...');
        clearAuthSession();
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
    
    // Hacer las funciones disponibles globalmente
    window.clearAuthSession = clearAuthSession;
    window.checkAuthStatus = checkAuthStatus;
    window.forceLogout = forceLogout;
    window.reloadPage = reloadPage;
    window.goToLogin = goToLogin;
    window.goToCleanupPage = goToCleanupPage;
    window.clearAndReload = clearAndReload;
    
    // También crear un objeto con todas las funciones
    window.authDebug = {
        clearAuthSession,
        checkAuthStatus,
        forceLogout,
        reloadPage,
        goToLogin,
        goToCleanupPage,
        clearAndReload
    };
    
    // Ejecutar verificación inicial
    console.log('\n📋 Comandos disponibles:');
    console.log('  • checkAuthStatus() - Verificar estado de autenticación');
    console.log('  • clearAuthSession() - Limpiar datos de sesión');
    console.log('  • forceLogout() - Forzar logout y redirección');
    console.log('  • reloadPage() - Recargar la página');
    console.log('  • goToLogin() - Ir al login');
    console.log('  • goToCleanupPage() - Abrir página de limpieza');
    console.log('  • clearAndReload() - Limpiar y recargar');
    console.log('  • authDebug.functionName() - Usar objeto authDebug');
    
    console.log('\n🔍 Verificación inicial:');
    checkAuthStatus();
    
    console.log('\n✅ Script de debug global cargado. Usa los comandos listados arriba.');
    
})(); 