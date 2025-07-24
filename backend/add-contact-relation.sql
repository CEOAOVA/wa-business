-- Script para agregar relación entre conversations y contacts
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna contact_id a conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- 2. Actualizar contact_id basado en contact_phone
UPDATE conversations 
SET contact_id = contacts.id
FROM contacts 
WHERE conversations.contact_phone = contacts.phone;

-- 3. Hacer contact_id NOT NULL después de actualizar
ALTER TABLE conversations 
ALTER COLUMN contact_id SET NOT NULL;

-- 4. Crear índice para performance
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);

-- 5. Verificar la relación
SELECT 
  c.id as conversation_id,
  c.contact_phone,
  c.contact_id,
  ct.name as contact_name,
  ct.phone as contact_phone
FROM conversations c
LEFT JOIN contacts ct ON c.contact_id = ct.id; 