/**
 * Generador de IDs únicos para evitar duplicados en React
 */

let counter = 0;

export const generateUniqueId = (prefix: string = 'id'): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  counter = (counter + 1) % 10000;
  
  return `${prefix}_${timestamp}_${counter}_${random}`;
};

export const generateMessageId = (): string => {
  return generateUniqueId('msg');
};

export const generateWhatsAppId = (): string => {
  return generateUniqueId('wa');
}; 