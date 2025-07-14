import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ToastNotifications } from "./components/NotificationCenter";
import Login from "./pages/Login";
import Chats from "./pages/Chats";
import ClientChat from "./pages/ClientChat";
import WhatsAppTest from "./pages/WhatsAppTest";
import './App.css';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <div className="min-h-screen bg-embler-dark">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/client-chat" element={<ClientChat />} />
            <Route path="/whatsapp-test" element={<WhatsAppTest />} />
            <Route 
              path="/chats" 
              element={
                <ProtectedRoute>
                  <Chats />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          
          {/* Notificaciones toast globales */}
          <ToastNotifications />
        </div>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
