-- Script para crear tablas necesarias para la FASE 4 en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Tabla para webhooks fallidos (debugging y análisis)
CREATE TABLE IF NOT EXISTS public.failed_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    message_id VARCHAR(255),
    error_message TEXT,
    error_stack TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_failed_webhooks_request_id ON public.failed_webhooks(request_id);
CREATE INDEX IF NOT EXISTS idx_failed_webhooks_message_id ON public.failed_webhooks(message_id);
CREATE INDEX IF NOT EXISTS idx_failed_webhooks_created_at ON public.failed_webhooks(created_at);

-- 2. Tabla para métricas de procesamiento (opcional pero recomendada)
CREATE TABLE IF NOT EXISTS public.webhook_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(255) NOT NULL,
    message_type VARCHAR(50),
    processing_time_ms INTEGER,
    queue_time_ms INTEGER,
    status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_metrics_created_at ON public.webhook_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_metrics_status ON public.webhook_metrics(status);
CREATE INDEX IF NOT EXISTS idx_webhook_metrics_message_type ON public.webhook_metrics(message_type);

-- 3. Vista para análisis de rendimiento
CREATE OR REPLACE VIEW webhook_performance_stats AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_webhooks,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    AVG(processing_time_ms) as avg_processing_time,
    AVG(queue_time_ms) as avg_queue_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_time_ms) as p95_processing_time,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY processing_time_ms) as p99_processing_time
FROM webhook_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- 4. Función para limpiar datos antiguos (más de 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_data()
RETURNS void AS $$
BEGIN
    -- Eliminar webhooks fallidos antiguos
    DELETE FROM public.failed_webhooks 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Eliminar métricas antiguas
    DELETE FROM public.webhook_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    RAISE NOTICE 'Limpieza de datos antiguos completada';
END;
$$ LANGUAGE plpgsql;

-- Comentarios en las tablas
COMMENT ON TABLE public.failed_webhooks IS 'Almacena webhooks que fallaron en el procesamiento para debugging';
COMMENT ON TABLE public.webhook_metrics IS 'Métricas de rendimiento para el procesamiento de webhooks';
COMMENT ON VIEW webhook_performance_stats IS 'Vista agregada de estadísticas de rendimiento por hora';

-- Políticas RLS (si están habilitadas)
ALTER TABLE public.failed_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_metrics ENABLE ROW LEVEL SECURITY;

-- Política para que los admin puedan ver todos los datos
CREATE POLICY "Admins can view failed webhooks" ON public.failed_webhooks
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view webhook metrics" ON public.webhook_metrics
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'supervisor');
