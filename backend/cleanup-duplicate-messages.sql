-- Script SQL para limpiar mensajes duplicados del chatbot
-- Elimina mensajes que tienen whatsapp_message_id NULL y metadata que empieza con chatbotId

-- Primero, verificar cuántos mensajes duplicados existen
SELECT 
    COUNT(*) as total_duplicates,
    COUNT(CASE WHEN whatsapp_message_id IS NULL THEN 1 END) as null_whatsapp_id,
    COUNT(CASE WHEN metadata::text LIKE '%chatbotId%' THEN 1 END) as with_chatbot_id
FROM messages 
WHERE whatsapp_message_id IS NULL 
    AND metadata IS NOT NULL 
    AND metadata::text LIKE '%chatbotId%';

-- Mostrar algunos ejemplos de mensajes duplicados
SELECT 
    id,
    conversation_id,
    sender_type,
    content,
    message_type,
    whatsapp_message_id,
    metadata,
    created_at
FROM messages 
WHERE whatsapp_message_id IS NULL 
    AND metadata IS NOT NULL 
    AND metadata::text LIKE '%chatbotId%'
ORDER BY created_at DESC
LIMIT 10;

-- Eliminar mensajes duplicados (EJECUTAR SOLO DESPUÉS DE VERIFICAR)
-- DELETE FROM messages 
-- WHERE whatsapp_message_id IS NULL 
--     AND metadata IS NOT NULL 
--     AND metadata::text LIKE '%chatbotId%';

-- Verificar que se eliminaron correctamente
-- SELECT COUNT(*) as remaining_duplicates
-- FROM messages 
-- WHERE whatsapp_message_id IS NULL 
--     AND metadata IS NOT NULL 
--     AND metadata::text LIKE '%chatbotId%';

-- Opcional: Crear un índice para mejorar el rendimiento de futuras consultas
-- CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id_metadata 
-- ON messages (whatsapp_message_id, metadata) 
-- WHERE whatsapp_message_id IS NULL AND metadata IS NOT NULL; 