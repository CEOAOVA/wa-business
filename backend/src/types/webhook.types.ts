/**
 * Tipos para webhooks de WhatsApp Business API
 */

// Tipos de mensajes soportados
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker' | 'contacts' | 'interactive' | 'button' | 'reaction' | 'order' | 'unknown';

// Mensaje de texto
export interface TextMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text';
  text: {
    body: string;
  };
}

// Mensaje multimedia
export interface MediaMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  [key: string]: {
    id: string;
    mime_type?: string;
    sha256?: string;
    caption?: string;
  } | string;
}

// Mensaje de ubicación
export interface LocationMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'location';
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

// Mensaje de contactos
export interface ContactsMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'contacts';
  contacts: Array<{
    name: {
      formatted_name: string;
      first_name?: string;
      last_name?: string;
    };
    phones?: Array<{
      phone: string;
      type?: string;
    }>;
  }>;
}

// Mensaje interactivo
export interface InteractiveMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'interactive';
  interactive: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

// Unión de todos los tipos de mensaje
export type WhatsAppMessage = TextMessage | MediaMessage | LocationMessage | ContactsMessage | InteractiveMessage;

// Estado del mensaje
export interface MessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
  }>;
}

// Estructura del webhook
export interface WhatsAppWebhook {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: WhatsAppMessage[];
        statuses?: MessageStatus[];
        errors?: Array<{
          code: number;
          title: string;
          message?: string;
          error_data?: {
            details: string;
          };
        }>;
      };
      field: string;
    }>;
  }>;
}

// Payload procesado para el servicio
export interface ProcessedWebhookPayload {
  requestId: string;
  payload: WhatsAppWebhook;
  messageId?: string;
  priority?: 'high' | 'normal' | 'low';
  timestamp?: string;
}
