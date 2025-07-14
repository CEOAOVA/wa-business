# INITIAL.md

---

## FEATURE:

Este proyecto consiste en una plataforma tipo “WhatsApp Web personalizada” para empresas, en la que cada agente se conecta con su cuenta a un panel web y responde mensajes de clientes a través de su propio número de WhatsApp Business, usando exclusivamente la API oficial de WhatsApp Cloud (de Meta).

El sistema incluye un chatbot automatizado que responde inicialmente a los clientes para recopilar datos útiles (como cotizaciones o intención de compra). Este chatbot está alimentado por una API externa de OpenRouter con la clave de acceso correspondiente, utilizando el modelo `google/gemini-2.5-flash-lite-preview-06-17`.

Cada agente tiene un número empresarial de WhatsApp verificado y asociado directamente a su cuenta. Si un agente no responde durante **10 minutos**, otro agente disponible puede tomar control temporal del número y continuar la conversación con el cliente, sin que este lo note.

La plataforma **no usa ninguna librería no oficial de WhatsApp** (como WhatsApp Web.js, Baileys o similares), y cumple con todas las políticas de Meta.

### Infraestructura técnica:
- **Frontend**: React 18 + TypeScript + Vite  
  Interfaz tipo WhatsApp Web para agentes, con chat en tiempo real, estado de conversaciones, y panel derecho con contexto y datos del cliente. Autenticación, vista por número, y notificaciones.
  
- **Backend**: Node.js + TypeScript  
  Módulo de autenticación, conexión con WhatsApp Business Cloud API, procesamiento de webhooks, sistema de ruteo de mensajes, integración con OpenRouter para respuestas del chatbot, y lógica de re-asignación automática por inactividad.

---

## EXAMPLES:

[Por llenar]

---

## DOCUMENTATION:

[Por llenar]

---

## OTHER CONSIDERATIONS:

El chatbot debe ser consciente del estado de la conversación. No debe iniciar siempre desde cero, sino continuar donde se quedó si ya estaba interactuando con el cliente.  
Esto implica que el sistema debe llevar un seguimiento del contexto por conversación y número: qué información ya se recopiló, si ya fue intervenido por un humano, si está en pausa, etc.

Se debe prevenir que dos agentes atiendan al mismo número al mismo tiempo. Toda reasignación de números entre agentes debe quedar registrada con marcas de tiempo y motivo (ej. por inactividad).

Las respuestas automáticas del chatbot deben distinguir entre:
- Primer contacto
- Continuación de flujo
- Reinicio forzado
- Escalada a humano

Finalmente, asegurarse que los agentes no respondan fuera de la ventana de 24h sin usar plantillas aprobadas.
ñ
---

## NOTA IMPORTANTE PARA DESARROLLO EN WINDOWS POWERSHELL

En PowerShell, el separador '&&' no es válido. Todos los comandos deben ejecutarse uno por uno para evitar errores de sintaxis.

---

