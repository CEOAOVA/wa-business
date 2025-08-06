The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [[object Object]]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:110
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:123 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: [async (conversationId) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await dashboardApiService.getConversationMessages(conversationId);
      if (response.success && response.data) {
        response.data.forEach((message) => {
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              id: message.id,
              content: message.content,
              senderId: message.sender_id,
              chatId: conversationId,
              timestamp: new Date(message.created_at),
              type: message.type || "text",
              created_at: message.created_at
            }
          });
        });
      }
    } catch (error) {
      console.error("Error cargando mensajes de conversación:", error);
      dispatch({ type: "SET_ERROR", payload: "Error cargando mensajes" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }]
Incoming: []
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:123
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:156 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [20000, 8000]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:156
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:207 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: [dark]
Incoming: [0, [object Object], (connectionState) => set((state) => {
      state.connection = { ...state.connection, ...connectionState };
    }), () => set((state) => {
      state.connection.retryCount = 0;
    }), () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        const now = Date.now();
        lastPingTimeRef.current = now;
        console.log("💓 Enviando heartbeat...");
        socketRef.current.emit("ping", { timestamp: now });
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn("⚠️ Heartbeat timeout - reconectando...");
          setConnectionQuality("poor");
          socketRef.current?.disconnect();
        }, finalConfig.heartbeatTimeout);
      }
    }, finalConfig.heartbeatInterval);
  }, (notification) => set((state) => {
      const newNotification = {
        ...notification,
        id: generateMessageId(),
        timestamp: /* @__PURE__ */ new Date(),
        isRead: false
      };
      state.notifications.unshift(newNotification);
    }), (chat) => {
    console.log("📋 [AppContextOptimized] Seleccionando chat:", chat.id);
    dispatch({ type: "SET_CURRENT_CHAT", payload: chat });
    const chatId = chat.id.replace("conv-", "");
    console.log("📨 [AppContextOptimized] Cargando mensajes para conversación:", chatId);
    loadConversationMessages(chatId).catch((error) => {
      console.error("❌ [AppContextOptimized] Error cargando mensajes:", error);
    });
  }, (notification) => {
    const newNotification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random()}`,
      timestamp: /* @__PURE__ */ new Date()
    };
    dispatch({ type: "ADD_NOTIFICATION", payload: newNotification });
  }, (chatId) => {
    dispatch({
      type: "UPDATE_CHAT",
      payload: {
        id: chatId,
        clientId: chatId,
        clientName: "Cliente",
        clientPhone: "",
        assignedAgentId: null,
        lastMessage: null,
        unreadCount: 0,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        tags: [],
        priority: "medium",
        status: "open"
      }
    });
  }]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:207
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:454 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [0, 10, async (conversationId) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await dashboardApiService.getConversationMessages(conversationId);
      if (response.success && response.data) {
        response.data.forEach((message) => {
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              id: message.id,
              content: message.content,
              senderId: message.sender_id,
              chatId: conversationId,
              timestamp: new Date(message.created_at),
              type: message.type || "text",
              created_at: message.created_at
            }
          });
        });
      }
    } catch (error) {
      console.error("Error cargando mensajes de conversación:", error);
      dispatch({ type: "SET_ERROR", payload: "Error cargando mensajes" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, () => set((state) => {
      state.connection.retryCount += 1;
    }), () => {
    if (isConnectingRef.current || socketRef.current?.connected) {
      console.log("🌐 WebSocket ya está conectando/conectado");
      return;
    }
    isConnectingRef.current = true;
    connectionStartTimeRef.current = Date.now();
    console.log(`🔌 Conectando a WebSocket... (intento ${retryCount + 1}/${finalConfig.maxRetries})`);
    setConnectionState({
      isConnecting: true,
      connectionError: void 0
    });
    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (error) {
        console.warn("⚠️ Error limpiando socket anterior:", error);
      }
      socketRef.current = null;
    }
    const authToken2 = localStorage.getItem("authToken");
    if (!authToken2) {
      console.error("❌ No hay token de autenticación");
      setConnectionError("No hay token de autenticación - Inicia sesión");
      isConnectingRef.current = false;
      addNotification({
        type: "error",
        title: "No autenticado",
        message: "Por favor inicia sesión para continuar",
        isRead: false
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 2e3);
      return;
    }
    if (authToken2.length < 100) {
      console.error("❌ Token parece inválido (muy corto)");
      localStorage.removeItem("authToken");
      window.location.href = "/login";
      return;
    }
    console.log("🔐 Token encontrado, longitud:", authToken2.length);
    console.log("🔐 Primeros 30 caracteres:", authToken2.substring(0, 30) + "...");
    console.log("🌐 Conectando a:", BACKEND_URL);
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      // Solo websocket como el backend requiere
      auth: {
        token: authToken2
        // Sin "Bearer " - solo el token
      },
      query: {
        token: authToken2
        // Respaldo en query params
      },
      timeout: 3e4,
      // Aumentar timeout a 30 segundos
      forceNew: true,
      reconnection: false,
      // Manejar reconexión manualmente
      autoConnect: true,
      closeOnBeforeunload: false,
      upgrade: false,
      // No upgrade porque solo usamos websocket
      reconnectionAttempts: 0,
      // Deshabilitar reconexión automática
      withCredentials: true
      // Para CORS
    });
    socket.on("connect", () => {
      const connectionTime = Date.now() - connectionStartTimeRef.current;
      console.log(`✅ WebSocket conectado en ${connectionTime}ms:`, socket.id);
      setIsConnected(true);
      setConnectionError(null);
      setRetryCount(0);
      isConnectingRef.current = false;
      setConnectionState({
        isConnected: true,
        isConnecting: false,
        lastConnected: /* @__PURE__ */ new Date(),
        connectionError: void 0,
        retryCount: 0
      });
      resetRetryCount();
      setupHeartbeat();
      processMessageQueue();
      addNotification({
        type: "success",
        title: "Conectado",
        message: `Conexión establecida en ${connectionTime}ms`,
        isRead: false
      });
    });
    socket.on("disconnect", (reason) => {
      console.log("❌ WebSocket desconectado:", reason);
      setIsConnected(false);
      isConnectingRef.current = false;
      clearTimeouts();
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        connectionError: reason || "Desconexión desconocida"
      });
      if (reason !== "io client disconnect" && finalConfig.reconnectOnClose) {
        handleReconnect();
      }
    });
    socket.on("connect_error", (error) => {
      console.error("❌ Error de conexión WebSocket:", {
        type: error.type || "unknown",
        message: error.message || "Connection failed",
        data: error.data || null
      });
      if (error.message?.includes("auth") || error.message?.includes("Invalid") || error.message?.includes("No authentication")) {
        console.error("❌ Token inválido o expirado, requiere nuevo login");
        localStorage.removeItem("authToken");
        addNotification({
          type: "error",
          title: "Sesión expirada",
          message: "Por favor inicia sesión nuevamente",
          isRead: false
        });
      }
      setConnectionError(error.message);
      setIsConnected(false);
      isConnectingRef.current = false;
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        connectionError: error.message
      });
      if (finalConfig.autoReconnect && !error.message?.includes("auth") && !error.message?.includes("token")) {
        handleReconnect();
      }
    });
    socket.on("pong", handlePong);
    socket.on("new_message", (data) => {
      console.log("📨 Nuevo mensaje recibido:", data);
      try {
        const message = {
          id: data.message.id,
          chatId: data.message.conversationId,
          senderId: data.message.from,
          content: data.message.message,
          type: data.message.type,
          timestamp: new Date(data.message.timestamp),
          isRead: data.message.read,
          isDelivered: true,
          status: "delivered",
          metadata: {
            waMessageId: data.message.waMessageId,
            clientId: data.message.clientId
          }
        };
        addMessage(message);
        const chat = {
          id: data.conversation.id,
          clientId: data.conversation.contactId,
          clientName: data.conversation.contactName,
          clientPhone: data.conversation.contactId,
          unreadCount: data.conversation.unreadCount,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          tags: [],
          priority: "medium",
          status: "open",
          aiMode: "active"
        };
        addChat(chat);
        console.log("✅ Mensaje procesado y agregado al store");
      } catch (error) {
        console.error("❌ Error procesando mensaje WebSocket:", error);
      }
    });
    socket.on("conversation_updated", (data) => {
      console.log("📝 Conversación actualizada:", data);
      try {
        updateChat(data.conversationId, {
          unreadCount: data.unreadCount,
          updatedAt: /* @__PURE__ */ new Date()
        });
        console.log("✅ Conversación actualizada en el store");
      } catch (error) {
        console.error("❌ Error actualizando conversación WebSocket:", error);
      }
    });
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Intento de reconexión ${attemptNumber}`);
    });
    socket.on("reconnect_failed", () => {
      console.error("❌ Falló la reconexión automática");
    });
    socketRef.current = socket;
  }, (notification) => set((state) => {
      const newNotification = {
        ...notification,
        id: generateMessageId(),
        timestamp: /* @__PURE__ */ new Date(),
        isRead: false
      };
      state.notifications.unshift(newNotification);
    })]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:454
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:481 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [(chat) => {
    console.log("📋 [AppContextOptimized] Seleccionando chat:", chat.id);
    dispatch({ type: "SET_CURRENT_CHAT", payload: chat });
    const chatId = chat.id.replace("conv-", "");
    console.log("📨 [AppContextOptimized] Cargando mensajes para conversación:", chatId);
    loadConversationMessages(chatId).catch((error) => {
      console.error("❌ [AppContextOptimized] Error cargando mensajes:", error);
    });
  }, (connectionState) => set((state) => {
      state.connection = { ...state.connection, ...connectionState };
    })]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:481
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:514 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [() => {
    console.log("🔌 Desconectando WebSocket...");
    clearTimeouts();
    if (socketRef.current) {
      try {
        if (socketRef.current.connected) {
          console.log("🔌 Socket activo, desconectando...");
          socketRef.current.disconnect();
        } else {
          console.log("🔌 Socket no está conectado, solo limpiando referencia");
        }
      } catch (error) {
        console.warn("⚠️ Error durante desconexión:", error);
      } finally {
        socketRef.current = null;
      }
    }
    setIsConnected(false);
    setConnectionError(null);
    setRetryCount(0);
    isConnectingRef.current = false;
    setConnectionState({
      isConnected: false,
      isConnecting: false,
      connectionError: void 0,
      retryCount: 0
    });
  }, () => {
    if (isConnectingRef.current || socketRef.current?.connected) {
      console.log("🌐 WebSocket ya está conectando/conectado");
      return;
    }
    isConnectingRef.current = true;
    connectionStartTimeRef.current = Date.now();
    console.log(`🔌 Conectando a WebSocket... (intento ${retryCount + 1}/${finalConfig.maxRetries})`);
    setConnectionState({
      isConnecting: true,
      connectionError: void 0
    });
    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (error) {
        console.warn("⚠️ Error limpiando socket anterior:", error);
      }
      socketRef.current = null;
    }
    const authToken2 = localStorage.getItem("authToken");
    if (!authToken2) {
      console.error("❌ No hay token de autenticación");
      setConnectionError("No hay token de autenticación - Inicia sesión");
      isConnectingRef.current = false;
      addNotification({
        type: "error",
        title: "No autenticado",
        message: "Por favor inicia sesión para continuar",
        isRead: false
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 2e3);
      return;
    }
    if (authToken2.length < 100) {
      console.error("❌ Token parece inválido (muy corto)");
      localStorage.removeItem("authToken");
      window.location.href = "/login";
      return;
    }
    console.log("🔐 Token encontrado, longitud:", authToken2.length);
    console.log("🔐 Primeros 30 caracteres:", authToken2.substring(0, 30) + "...");
    console.log("🌐 Conectando a:", BACKEND_URL);
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      // Solo websocket como el backend requiere
      auth: {
        token: authToken2
        // Sin "Bearer " - solo el token
      },
      query: {
        token: authToken2
        // Respaldo en query params
      },
      timeout: 3e4,
      // Aumentar timeout a 30 segundos
      forceNew: true,
      reconnection: false,
      // Manejar reconexión manualmente
      autoConnect: true,
      closeOnBeforeunload: false,
      upgrade: false,
      // No upgrade porque solo usamos websocket
      reconnectionAttempts: 0,
      // Deshabilitar reconexión automática
      withCredentials: true
      // Para CORS
    });
    socket.on("connect", () => {
      const connectionTime = Date.now() - connectionStartTimeRef.current;
      console.log(`✅ WebSocket conectado en ${connectionTime}ms:`, socket.id);
      setIsConnected(true);
      setConnectionError(null);
      setRetryCount(0);
      isConnectingRef.current = false;
      setConnectionState({
        isConnected: true,
        isConnecting: false,
        lastConnected: /* @__PURE__ */ new Date(),
        connectionError: void 0,
        retryCount: 0
      });
      resetRetryCount();
      setupHeartbeat();
      processMessageQueue();
      addNotification({
        type: "success",
        title: "Conectado",
        message: `Conexión establecida en ${connectionTime}ms`,
        isRead: false
      });
    });
    socket.on("disconnect", (reason) => {
      console.log("❌ WebSocket desconectado:", reason);
      setIsConnected(false);
      isConnectingRef.current = false;
      clearTimeouts();
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        connectionError: reason || "Desconexión desconocida"
      });
      if (reason !== "io client disconnect" && finalConfig.reconnectOnClose) {
        handleReconnect();
      }
    });
    socket.on("connect_error", (error) => {
      console.error("❌ Error de conexión WebSocket:", {
        type: error.type || "unknown",
        message: error.message || "Connection failed",
        data: error.data || null
      });
      if (error.message?.includes("auth") || error.message?.includes("Invalid") || error.message?.includes("No authentication")) {
        console.error("❌ Token inválido o expirado, requiere nuevo login");
        localStorage.removeItem("authToken");
        addNotification({
          type: "error",
          title: "Sesión expirada",
          message: "Por favor inicia sesión nuevamente",
          isRead: false
        });
      }
      setConnectionError(error.message);
      setIsConnected(false);
      isConnectingRef.current = false;
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        connectionError: error.message
      });
      if (finalConfig.autoReconnect && !error.message?.includes("auth") && !error.message?.includes("token")) {
        handleReconnect();
      }
    });
    socket.on("pong", handlePong);
    socket.on("new_message", (data) => {
      console.log("📨 Nuevo mensaje recibido:", data);
      try {
        const message = {
          id: data.message.id,
          chatId: data.message.conversationId,
          senderId: data.message.from,
          content: data.message.message,
          type: data.message.type,
          timestamp: new Date(data.message.timestamp),
          isRead: data.message.read,
          isDelivered: true,
          status: "delivered",
          metadata: {
            waMessageId: data.message.waMessageId,
            clientId: data.message.clientId
          }
        };
        addMessage(message);
        const chat = {
          id: data.conversation.id,
          clientId: data.conversation.contactId,
          clientName: data.conversation.contactName,
          clientPhone: data.conversation.contactId,
          unreadCount: data.conversation.unreadCount,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          tags: [],
          priority: "medium",
          status: "open",
          aiMode: "active"
        };
        addChat(chat);
        console.log("✅ Mensaje procesado y agregado al store");
      } catch (error) {
        console.error("❌ Error procesando mensaje WebSocket:", error);
      }
    });
    socket.on("conversation_updated", (data) => {
      console.log("📝 Conversación actualizada:", data);
      try {
        updateChat(data.conversationId, {
          unreadCount: data.unreadCount,
          updatedAt: /* @__PURE__ */ new Date()
        });
        console.log("✅ Conversación actualizada en el store");
      } catch (error) {
        console.error("❌ Error actualizando conversación WebSocket:", error);
      }
    });
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Intento de reconexión ${attemptNumber}`);
    });
    socket.on("reconnect_failed", () => {
      console.error("❌ Falló la reconexión automática");
    });
    socketRef.current = socket;
  }, () => set((state) => {
      state.connection.retryCount = 0;
    })]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:514
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:542 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: []
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:542
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:550 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [50]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:550
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:571 React has detected a change in the order of Hooks called by AppProviderOptimized. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks

   Previous render            Next render
   ------------------------------------------------------
1. useReducer                 useReducer
2. useState                   useState
3. useState                   useState
4. useState                   useState
5. useState                   useState
6. useState                   useState
7. useRef                     useRef
8. useRef                     useRef
9. useRef                     useRef
10. useRef                    useRef
11. useRef                    useRef
12. useRef                    useRef
13. useRef                    useRef
14. useRef                    useRef
15. useSyncExternalStore      useSyncExternalStore
16. useDebugValue             useDebugValue
17. useCallback               useCallback
18. useCallback               useCallback
19. useCallback               useCallback
20. useCallback               useCallback
21. useCallback               useCallback
22. useCallback               useCallback
23. useCallback               useCallback
24. useCallback               useCallback
25. useCallback               useCallback
26. useCallback               useCallback
27. useCallback               useCallback
28. useCallback               useCallback
29. useCallback               useEffect
   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

updateHookTypesDev @ react-dom-client.development.js:5436
useEffect @ react-dom-client.development.js:23158
exports.useEffect @ react.development.js:1186
useWebSocketOptimized @ useWebSocketOptimized.ts:571
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:110 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [[object Object]]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:110
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14462
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:123 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: [async (conversationId) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await dashboardApiService.getConversationMessages(conversationId);
      if (response.success && response.data) {
        response.data.forEach((message) => {
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              id: message.id,
              content: message.content,
              senderId: message.sender_id,
              chatId: conversationId,
              timestamp: new Date(message.created_at),
              type: message.type || "text",
              created_at: message.created_at
            }
          });
        });
      }
    } catch (error) {
      console.error("Error cargando mensajes de conversación:", error);
      dispatch({ type: "SET_ERROR", payload: "Error cargando mensajes" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }]
Incoming: []
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:123
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14462
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:156 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [20000, 8000]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:156
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14462
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:207 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: [dark]
Incoming: [0, [object Object], (connectionState) => set((state) => {
      state.connection = { ...state.connection, ...connectionState };
    }), () => set((state) => {
      state.connection.retryCount = 0;
    }), () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        const now = Date.now();
        lastPingTimeRef.current = now;
        console.log("💓 Enviando heartbeat...");
        socketRef.current.emit("ping", { timestamp: now });
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn("⚠️ Heartbeat timeout - reconectando...");
          setConnectionQuality("poor");
          socketRef.current?.disconnect();
        }, finalConfig.heartbeatTimeout);
      }
    }, finalConfig.heartbeatInterval);
  }, (notification) => set((state) => {
      const newNotification = {
        ...notification,
        id: generateMessageId(),
        timestamp: /* @__PURE__ */ new Date(),
        isRead: false
      };
      state.notifications.unshift(newNotification);
    }), (chat) => {
    console.log("📋 [AppContextOptimized] Seleccionando chat:", chat.id);
    dispatch({ type: "SET_CURRENT_CHAT", payload: chat });
    const chatId = chat.id.replace("conv-", "");
    console.log("📨 [AppContextOptimized] Cargando mensajes para conversación:", chatId);
    loadConversationMessages(chatId).catch((error) => {
      console.error("❌ [AppContextOptimized] Error cargando mensajes:", error);
    });
  }, (notification) => {
    const newNotification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random()}`,
      timestamp: /* @__PURE__ */ new Date()
    };
    dispatch({ type: "ADD_NOTIFICATION", payload: newNotification });
  }, (chatId) => {
    dispatch({
      type: "UPDATE_CHAT",
      payload: {
        id: chatId,
        clientId: chatId,
        clientName: "Cliente",
        clientPhone: "",
        assignedAgentId: null,
        lastMessage: null,
        unreadCount: 0,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        tags: [],
        priority: "medium",
        status: "open"
      }
    });
  }]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:207
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14462
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:454 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [0, 10, async (conversationId) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await dashboardApiService.getConversationMessages(conversationId);
      if (response.success && response.data) {
        response.data.forEach((message) => {
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              id: message.id,
              content: message.content,
              senderId: message.sender_id,
              chatId: conversationId,
              timestamp: new Date(message.created_at),
              type: message.type || "text",
              created_at: message.created_at
            }
          });
        });
      }
    } catch (error) {
      console.error("Error cargando mensajes de conversación:", error);
      dispatch({ type: "SET_ERROR", payload: "Error cargando mensajes" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, () => set((state) => {
      state.connection.retryCount += 1;
    }), () => {
    if (isConnectingRef.current || socketRef.current?.connected) {
      console.log("🌐 WebSocket ya está conectando/conectado");
      return;
    }
    isConnectingRef.current = true;
    connectionStartTimeRef.current = Date.now();
    console.log(`🔌 Conectando a WebSocket... (intento ${retryCount + 1}/${finalConfig.maxRetries})`);
    setConnectionState({
      isConnecting: true,
      connectionError: void 0
    });
    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (error) {
        console.warn("⚠️ Error limpiando socket anterior:", error);
      }
      socketRef.current = null;
    }
    const authToken2 = localStorage.getItem("authToken");
    if (!authToken2) {
      console.error("❌ No hay token de autenticación");
      setConnectionError("No hay token de autenticación - Inicia sesión");
      isConnectingRef.current = false;
      addNotification({
        type: "error",
        title: "No autenticado",
        message: "Por favor inicia sesión para continuar",
        isRead: false
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 2e3);
      return;
    }
    if (authToken2.length < 100) {
      console.error("❌ Token parece inválido (muy corto)");
      localStorage.removeItem("authToken");
      window.location.href = "/login";
      return;
    }
    console.log("🔐 Token encontrado, longitud:", authToken2.length);
    console.log("🔐 Primeros 30 caracteres:", authToken2.substring(0, 30) + "...");
    console.log("🌐 Conectando a:", BACKEND_URL);
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      // Solo websocket como el backend requiere
      auth: {
        token: authToken2
        // Sin "Bearer " - solo el token
      },
      query: {
        token: authToken2
        // Respaldo en query params
      },
      timeout: 3e4,
      // Aumentar timeout a 30 segundos
      forceNew: true,
      reconnection: false,
      // Manejar reconexión manualmente
      autoConnect: true,
      closeOnBeforeunload: false,
      upgrade: false,
      // No upgrade porque solo usamos websocket
      reconnectionAttempts: 0,
      // Deshabilitar reconexión automática
      withCredentials: true
      // Para CORS
    });
    socket.on("connect", () => {
      const connectionTime = Date.now() - connectionStartTimeRef.current;
      console.log(`✅ WebSocket conectado en ${connectionTime}ms:`, socket.id);
      setIsConnected(true);
      setConnectionError(null);
      setRetryCount(0);
      isConnectingRef.current = false;
      setConnectionState({
        isConnected: true,
        isConnecting: false,
        lastConnected: /* @__PURE__ */ new Date(),
        connectionError: void 0,
        retryCount: 0
      });
      resetRetryCount();
      setupHeartbeat();
      processMessageQueue();
      addNotification({
        type: "success",
        title: "Conectado",
        message: `Conexión establecida en ${connectionTime}ms`,
        isRead: false
      });
    });
    socket.on("disconnect", (reason) => {
      console.log("❌ WebSocket desconectado:", reason);
      setIsConnected(false);
      isConnectingRef.current = false;
      clearTimeouts();
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        connectionError: reason || "Desconexión desconocida"
      });
      if (reason !== "io client disconnect" && finalConfig.reconnectOnClose) {
        handleReconnect();
      }
    });
    socket.on("connect_error", (error) => {
      console.error("❌ Error de conexión WebSocket:", {
        type: error.type || "unknown",
        message: error.message || "Connection failed",
        data: error.data || null
      });
      if (error.message?.includes("auth") || error.message?.includes("Invalid") || error.message?.includes("No authentication")) {
        console.error("❌ Token inválido o expirado, requiere nuevo login");
        localStorage.removeItem("authToken");
        addNotification({
          type: "error",
          title: "Sesión expirada",
          message: "Por favor inicia sesión nuevamente",
          isRead: false
        });
      }
      setConnectionError(error.message);
      setIsConnected(false);
      isConnectingRef.current = false;
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        connectionError: error.message
      });
      if (finalConfig.autoReconnect && !error.message?.includes("auth") && !error.message?.includes("token")) {
        handleReconnect();
      }
    });
    socket.on("pong", handlePong);
    socket.on("new_message", (data) => {
      console.log("📨 Nuevo mensaje recibido:", data);
      try {
        const message = {
          id: data.message.id,
          chatId: data.message.conversationId,
          senderId: data.message.from,
          content: data.message.message,
          type: data.message.type,
          timestamp: new Date(data.message.timestamp),
          isRead: data.message.read,
          isDelivered: true,
          status: "delivered",
          metadata: {
            waMessageId: data.message.waMessageId,
            clientId: data.message.clientId
          }
        };
        addMessage(message);
        const chat = {
          id: data.conversation.id,
          clientId: data.conversation.contactId,
          clientName: data.conversation.contactName,
          clientPhone: data.conversation.contactId,
          unreadCount: data.conversation.unreadCount,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          tags: [],
          priority: "medium",
          status: "open",
          aiMode: "active"
        };
        addChat(chat);
        console.log("✅ Mensaje procesado y agregado al store");
      } catch (error) {
        console.error("❌ Error procesando mensaje WebSocket:", error);
      }
    });
    socket.on("conversation_updated", (data) => {
      console.log("📝 Conversación actualizada:", data);
      try {
        updateChat(data.conversationId, {
          unreadCount: data.unreadCount,
          updatedAt: /* @__PURE__ */ new Date()
        });
        console.log("✅ Conversación actualizada en el store");
      } catch (error) {
        console.error("❌ Error actualizando conversación WebSocket:", error);
      }
    });
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Intento de reconexión ${attemptNumber}`);
    });
    socket.on("reconnect_failed", () => {
      console.error("❌ Falló la reconexión automática");
    });
    socketRef.current = socket;
  }, (notification) => set((state) => {
      const newNotification = {
        ...notification,
        id: generateMessageId(),
        timestamp: /* @__PURE__ */ new Date(),
        isRead: false
      };
      state.notifications.unshift(newNotification);
    })]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:454
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14462
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:481 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [(chat) => {
    console.log("📋 [AppContextOptimized] Seleccionando chat:", chat.id);
    dispatch({ type: "SET_CURRENT_CHAT", payload: chat });
    const chatId = chat.id.replace("conv-", "");
    console.log("📨 [AppContextOptimized] Cargando mensajes para conversación:", chatId);
    loadConversationMessages(chatId).catch((error) => {
      console.error("❌ [AppContextOptimized] Error cargando mensajes:", error);
    });
  }, (connectionState) => set((state) => {
      state.connection = { ...state.connection, ...connectionState };
    })]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:481
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14462
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:514 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [() => {
    console.log("🔌 Desconectando WebSocket...");
    clearTimeouts();
    if (socketRef.current) {
      try {
        if (socketRef.current.connected) {
          console.log("🔌 Socket activo, desconectando...");
          socketRef.current.disconnect();
        } else {
          console.log("🔌 Socket no está conectado, solo limpiando referencia");
        }
      } catch (error) {
        console.warn("⚠️ Error durante desconexión:", error);
      } finally {
        socketRef.current = null;
      }
    }
    setIsConnected(false);
    setConnectionError(null);
    setRetryCount(0);
    isConnectingRef.current = false;
    setConnectionState({
      isConnected: false,
      isConnecting: false,
      connectionError: void 0,
      retryCount: 0
    });
  }, () => {
    if (isConnectingRef.current || socketRef.current?.connected) {
      console.log("🌐 WebSocket ya está conectando/conectado");
      return;
    }
    isConnectingRef.current = true;
    connectionStartTimeRef.current = Date.now();
    console.log(`🔌 Conectando a WebSocket... (intento ${retryCount + 1}/${finalConfig.maxRetries})`);
    setConnectionState({
      isConnecting: true,
      connectionError: void 0
    });
    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (error) {
        console.warn("⚠️ Error limpiando socket anterior:", error);
      }
      socketRef.current = null;
    }
    const authToken2 = localStorage.getItem("authToken");
    if (!authToken2) {
      console.error("❌ No hay token de autenticación");
      setConnectionError("No hay token de autenticación - Inicia sesión");
      isConnectingRef.current = false;
      addNotification({
        type: "error",
        title: "No autenticado",
        message: "Por favor inicia sesión para continuar",
        isRead: false
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 2e3);
      return;
    }
    if (authToken2.length < 100) {
      console.error("❌ Token parece inválido (muy corto)");
      localStorage.removeItem("authToken");
      window.location.href = "/login";
      return;
    }
    console.log("🔐 Token encontrado, longitud:", authToken2.length);
    console.log("🔐 Primeros 30 caracteres:", authToken2.substring(0, 30) + "...");
    console.log("🌐 Conectando a:", BACKEND_URL);
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      // Solo websocket como el backend requiere
      auth: {
        token: authToken2
        // Sin "Bearer " - solo el token
      },
      query: {
        token: authToken2
        // Respaldo en query params
      },
      timeout: 3e4,
      // Aumentar timeout a 30 segundos
      forceNew: true,
      reconnection: false,
      // Manejar reconexión manualmente
      autoConnect: true,
      closeOnBeforeunload: false,
      upgrade: false,
      // No upgrade porque solo usamos websocket
      reconnectionAttempts: 0,
      // Deshabilitar reconexión automática
      withCredentials: true
      // Para CORS
    });
    socket.on("connect", () => {
      const connectionTime = Date.now() - connectionStartTimeRef.current;
      console.log(`✅ WebSocket conectado en ${connectionTime}ms:`, socket.id);
      setIsConnected(true);
      setConnectionError(null);
      setRetryCount(0);
      isConnectingRef.current = false;
      setConnectionState({
        isConnected: true,
        isConnecting: false,
        lastConnected: /* @__PURE__ */ new Date(),
        connectionError: void 0,
        retryCount: 0
      });
      resetRetryCount();
      setupHeartbeat();
      processMessageQueue();
      addNotification({
        type: "success",
        title: "Conectado",
        message: `Conexión establecida en ${connectionTime}ms`,
        isRead: false
      });
    });
    socket.on("disconnect", (reason) => {
      console.log("❌ WebSocket desconectado:", reason);
      setIsConnected(false);
      isConnectingRef.current = false;
      clearTimeouts();
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        connectionError: reason || "Desconexión desconocida"
      });
      if (reason !== "io client disconnect" && finalConfig.reconnectOnClose) {
        handleReconnect();
      }
    });
    socket.on("connect_error", (error) => {
      console.error("❌ Error de conexión WebSocket:", {
        type: error.type || "unknown",
        message: error.message || "Connection failed",
        data: error.data || null
      });
      if (error.message?.includes("auth") || error.message?.includes("Invalid") || error.message?.includes("No authentication")) {
        console.error("❌ Token inválido o expirado, requiere nuevo login");
        localStorage.removeItem("authToken");
        addNotification({
          type: "error",
          title: "Sesión expirada",
          message: "Por favor inicia sesión nuevamente",
          isRead: false
        });
      }
      setConnectionError(error.message);
      setIsConnected(false);
      isConnectingRef.current = false;
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        connectionError: error.message
      });
      if (finalConfig.autoReconnect && !error.message?.includes("auth") && !error.message?.includes("token")) {
        handleReconnect();
      }
    });
    socket.on("pong", handlePong);
    socket.on("new_message", (data) => {
      console.log("📨 Nuevo mensaje recibido:", data);
      try {
        const message = {
          id: data.message.id,
          chatId: data.message.conversationId,
          senderId: data.message.from,
          content: data.message.message,
          type: data.message.type,
          timestamp: new Date(data.message.timestamp),
          isRead: data.message.read,
          isDelivered: true,
          status: "delivered",
          metadata: {
            waMessageId: data.message.waMessageId,
            clientId: data.message.clientId
          }
        };
        addMessage(message);
        const chat = {
          id: data.conversation.id,
          clientId: data.conversation.contactId,
          clientName: data.conversation.contactName,
          clientPhone: data.conversation.contactId,
          unreadCount: data.conversation.unreadCount,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          tags: [],
          priority: "medium",
          status: "open",
          aiMode: "active"
        };
        addChat(chat);
        console.log("✅ Mensaje procesado y agregado al store");
      } catch (error) {
        console.error("❌ Error procesando mensaje WebSocket:", error);
      }
    });
    socket.on("conversation_updated", (data) => {
      console.log("📝 Conversación actualizada:", data);
      try {
        updateChat(data.conversationId, {
          unreadCount: data.unreadCount,
          updatedAt: /* @__PURE__ */ new Date()
        });
        console.log("✅ Conversación actualizada en el store");
      } catch (error) {
        console.error("❌ Error actualizando conversación WebSocket:", error);
      }
    });
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Intento de reconexión ${attemptNumber}`);
    });
    socket.on("reconnect_failed", () => {
      console.error("❌ Falló la reconexión automática");
    });
    socketRef.current = socket;
  }, () => set((state) => {
      state.connection.retryCount = 0;
    })]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:514
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14462
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:542 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: []
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:542
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14462
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
useWebSocketOptimized.ts:550 The final argument passed to useCallback changed size between renders. The order and size of this array must remain constant.

Previous: []
Incoming: [50]
areHookInputsEqual @ react-dom-client.development.js:5479
updateCallback @ react-dom-client.development.js:6595
useCallback @ react-dom-client.development.js:23149
exports.useCallback @ react.development.js:1160
useWebSocketOptimized @ useWebSocketOptimized.ts:550
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14462
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
react-dom-client.development.js:5478 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at areHookInputsEqual (react-dom-client.development.js:5478:36)
    at updateEffectImpl (react-dom-client.development.js:6509:7)
    at Object.useEffect (react-dom-client.development.js:23159:9)
    at exports.useEffect (react.development.js:1186:25)
    at useWebSocketOptimized (useWebSocketOptimized.ts:571:3)
    at AppProviderOptimized (AppContextOptimized.tsx:278:7)
    at react-stack-bottom-frame (react-dom-client.development.js:23863:20)
    at renderWithHooks (react-dom-client.development.js:5529:22)
    at updateFunctionComponent (react-dom-client.development.js:8897:19)
    at beginWork (react-dom-client.development.js:10522:18)
areHookInputsEqual @ react-dom-client.development.js:5478
updateEffectImpl @ react-dom-client.development.js:6509
useEffect @ react-dom-client.development.js:23159
exports.useEffect @ react.development.js:1186
useWebSocketOptimized @ useWebSocketOptimized.ts:571
AppProviderOptimized @ AppContextOptimized.tsx:278
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateFunctionComponent @ react-dom-client.development.js:8897
beginWork @ react-dom-client.development.js:10522
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14462
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
react-dom-client.development.js:8283 An error occurred in the <AppProviderOptimized> component.

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://react.dev/link/error-boundaries to learn more about error boundaries.