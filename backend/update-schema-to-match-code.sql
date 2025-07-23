-- ========================================
-- SCRIPT DE ACTUALIZACIÓN: Hacer que las tablas coincidan con el código
-- Ejecutar en Supabase SQL Editor
-- ========================================

-- ========================================
-- 1. ACTUALIZAR TABLA AGENTS
-- ========================================

-- Agregar columnas faltantes a agents
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS username VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Actualizar datos existentes
UPDATE agents 
SET 
  username = email,
  full_name = name
WHERE username IS NULL OR full_name IS NULL;

-- Hacer username NOT NULL después de actualizar
ALTER TABLE agents 
ALTER COLUMN username SET NOT NULL,
ALTER COLUMN full_name SET NOT NULL;

-- ========================================
-- 2. ACTUALIZAR TABLA CONTACTS
-- ========================================

-- Renombrar columna phone_number a phone
ALTER TABLE contacts 
RENAME COLUMN phone_number TO phone;

-- Agregar columnas faltantes
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- ========================================
-- 3. ACTUALIZAR TABLA CONVERSATIONS
-- ========================================

-- Agregar columnas faltantes
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- 4. ACTUALIZAR TABLA MESSAGES
-- ========================================

-- Agregar columnas faltantes
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- ========================================
-- 5. CREAR FUNCIÓN PARA INCREMENTAR UNREAD_COUNT
-- ========================================

CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN unread_count + 1;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. VERIFICAR ESTRUCTURA FINAL
-- ========================================

-- Mostrar estructura de agents
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'agents' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Mostrar estructura de contacts
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'contacts' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Mostrar estructura de conversations
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'conversations' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Mostrar estructura de messages
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' AND table_schema = 'public'
ORDER BY ordinal_position; 