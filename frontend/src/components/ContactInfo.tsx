import React, { useState, useEffect } from 'react';
import { contactsApiService } from '../services/contacts-api';
import type { ContactInfo, ConversationInfo } from '../services/contacts-api';

interface ContactInfoProps {
  phoneNumber: string;
  onContactUpdate?: (contact: ContactInfo) => void;
}

interface ContactInfoData {
  contact: ContactInfo;
  conversation: ConversationInfo | null;
}

const ContactInfoComponent: React.FC<ContactInfoProps> = ({ phoneNumber, onContactUpdate }) => {
  const [contactData, setContactData] = useState<ContactInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    postal_code: ''
  });

  useEffect(() => {
    loadContactInfo();
  }, [phoneNumber]);

  const loadContactInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await contactsApiService.getContactByPhone(phoneNumber);
      
      if (data) {
        setContactData(data);
        setEditForm({
          name: data.contact.name || '',
          email: data.contact.email || '',
          postal_code: data.contact.postal_code || ''
        });
      } else {
        setError('No se pudo cargar la información del contacto');
      }
    } catch (err) {
      setError('Error cargando información del contacto');
      console.error('Error loading contact info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (contactData) {
      setEditForm({
        name: contactData.contact.name || '',
        email: contactData.contact.email || '',
        postal_code: contactData.contact.postal_code || ''
      });
    }
  };

  const handleSave = async () => {
    if (!contactData) return;

    try {
      const success = await contactsApiService.updateContact(contactData.contact.id, {
        name: editForm.name,
        email: editForm.email,
        postal_code: editForm.postal_code
      });

      if (success) {
        // Recargar información actualizada
        await loadContactInfo();
        setIsEditing(false);
        
        if (onContactUpdate && contactData) {
          onContactUpdate(contactData.contact);
        }
      } else {
        setError('Error actualizando contacto');
      }
    } catch (err) {
      setError('Error actualizando contacto');
      console.error('Error updating contact:', err);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-red-600 text-sm">
          <p className="font-medium">Error</p>
          <p>{error}</p>
          <button 
            onClick={loadContactInfo}
            className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!contactData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-gray-500 text-sm">
          <p>No se encontró información del contacto</p>
        </div>
      </div>
    );
  }

  const { contact, conversation } = contactData;
  const formattedInfo = contactsApiService.formatContactInfo(contact);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Información del Cliente</h3>
        <button
          onClick={isEditing ? handleCancel : handleEdit}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isEditing ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del cliente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código Postal
            </label>
            <input
              type="text"
              value={editForm.postal_code}
              onChange={(e) => handleInputChange('postal_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="12345"
              maxLength={5}
            />
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Guardar
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-gray-900">
              {formattedInfo.displayName}
            </span>
            {formattedInfo.hasCompleteInfo && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Completo
              </span>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-gray-600">{formattedInfo.displayPhone}</span>
            </div>

            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-600">{formattedInfo.displayEmail}</span>
            </div>

            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-gray-600">CP: {formattedInfo.displayPostalCode}</span>
            </div>
          </div>

          {conversation && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Estado: {conversation.status}</span>
                <span>IA: {conversation.ai_mode}</span>
                {conversation.takeover_mode && (
                  <span>Modo: {conversation.takeover_mode}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactInfoComponent; 