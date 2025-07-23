import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRedirect from "./components/RoleRedirect";
import { ToastNotifications } from "./components/NotificationCenter";
import Login from "./pages/Login";
import Chats from "./pages/Chats";
import ClientChat from "./pages/ClientChat";
import WhatsAppTest from "./pages/WhatsAppTest";
import WebSocketTest from "./pages/WebSocketTest";
import Demo from "./pages/Demo";
import ImageTest from "./pages/ImageTest";
import AdminDashboard from "./pages/AdminDashboard";
import './App.css';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <div className="min-h-screen bg-gradient-dark particles-bg relative">
          {/* Elementos decorativos de fondo */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-yellow rounded-full opacity-10 animate-float"></div>
            <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-gradient-gold rounded-full opacity-10 animate-float" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-gray rounded-full opacity-5 animate-float" style={{ animationDelay: '2s' }}></div>
          </div>
          
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/image-test" element={<ImageTest />} />
            <Route path="/client-chat" element={<ClientChat />} />
            <Route path="/whatsapp-test" element={<WhatsAppTest />} />
            <Route path="/websocket-test" element={<WebSocketTest />} />
            
            {/* Ruta raíz con redirección automática según rol */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <RoleRedirect />
                </ProtectedRoute>
              } 
            />
            
            {/* Rutas para agentes */}
            <Route 
              path="/chats" 
              element={
                <ProtectedRoute requiredRole="agent">
                  <Chats />
                </ProtectedRoute>
              } 
            />
            
            {/* Rutas para administradores */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Ruta por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* Notificaciones toast globales */}
          <ToastNotifications />
        </div>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
