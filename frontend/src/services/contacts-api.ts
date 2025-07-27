/**
 * Servicio de API para contactos
 * Maneja las operaciones relacionadas con contactos y su información
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ContactInfo {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  postal_code?: string;
  is_blocked: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export interface ConversationInfo {
  id: string;
  status: 'active' | 'waiting' | 'closed';
  ai_mode: 'active' | 'inactive' | 'paused';
  assigned_agent_id?: string;
  unread_count: number;
  last_message_at?: string;
  takeover_mode?: 'spectator' | 'takeover' | 'ai_only';
  created_at: string;
  updated_at: string;
}

export interface ContactConversationData {
  contact: ContactInfo;
  conversation: ConversationInfo | null;
}

export interface UpdateContactRequest {
  name?: string;
  email?: string;
  postal_code?: string;
  is_blocked?: boolean;
  is_favorite?: boolean;
  metadata?: any;
}

class ContactsApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Obtener información de contacto de una conversación por número de teléfono
   */
  async getContactByPhone(phoneNumber: string): Promise<ContactConversationData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/contacts/conversation/${phoneNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[ContactsApi] Contacto no encontrado para: ${phoneNumber}`);
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log(`[ContactsApi] Información de contacto obtenida para: ${phoneNumber}`, data);
        return data;
      } else {
        console.error(`[ContactsApi] Error obteniendo contacto: ${data.error}`);
        return null;
      }
    } catch (error) {
      console.error('[ContactsApi] Error en getContactByPhone:', error);
      return null;
    }
  }

  /**
   * Actualizar información de contacto
   */
  async updateContact(contactId: string, data: UpdateContactRequest): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`[ContactsApi] Contacto ${contactId} actualizado exitosamente`);
        return true;
      } else {
        console.error(`[ContactsApi] Error actualizando contacto: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('[ContactsApi] Error en updateContact:', error);
      return false;
    }
  }

  /**
   * Formatear código postal para mostrar
   */
  formatPostalCode(postalCode?: string): string {
    if (!postalCode) return 'No especificado';
    
    // Formato para códigos postales mexicanos (5 dígitos)
    if (postalCode.length === 5) {
      return postalCode;
    }
    
    // Formato para códigos postales con formato especial
    if (postalCode.length > 5) {
      return postalCode.substring(0, 5) + '-' + postalCode.substring(5);
    }
    
    return postalCode;
  }

  /**
   * Formatear información de contacto para mostrar
   */
  formatContactInfo(contact: ContactInfo): {
    displayName: string;
    displayPhone: string;
    displayEmail: string;
    displayPostalCode: string;
    hasCompleteInfo: boolean;
  } {
    const displayName = contact.name || 'Sin nombre';
    const displayPhone = contact.phone || 'Sin teléfono';
    const displayEmail = contact.email || 'Sin email';
    const displayPostalCode = this.formatPostalCode(contact.postal_code);
    
    const hasCompleteInfo = !!(contact.name && contact.email && contact.postal_code);
    
    return {
      displayName,
      displayPhone,
      displayEmail,
      displayPostalCode,
      hasCompleteInfo
    };
  }
}

export const contactsApiService = new ContactsApiService(); 