-- Script para crear la tabla agents en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Habilitar extensión UUID si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla agents
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'supervisor')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_agents_username ON public.agents(username);
CREATE INDEX IF NOT EXISTS idx_agents_email ON public.agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_role ON public.agents(role);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON public.agents(is_active);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
CREATE TRIGGER update_agents_updated_at 
    BEFORE UPDATE ON public.agents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario admin por defecto (CAMBIAR CONTRASEÑA DESPUÉS DE MIGRACIÓN)
INSERT INTO public.agents (username, full_name, email, password, role, is_active)
VALUES ('admin', 'Administrador', 'admin@example.com', 'admin123', 'admin', true)
ON CONFLICT (username) DO NOTHING;

-- Comentarios en la tabla
COMMENT ON TABLE public.agents IS 'Tabla de agentes/usuarios del sistema WhatsApp Business';
COMMENT ON COLUMN public.agents.id IS 'ID único del agente';
COMMENT ON COLUMN public.agents.username IS 'Nombre de usuario único para login';
COMMENT ON COLUMN public.agents.full_name IS 'Nombre completo del agente';
COMMENT ON COLUMN public.agents.email IS 'Email del agente';
COMMENT ON COLUMN public.agents.password IS 'Contraseña hasheada con bcrypt';
COMMENT ON COLUMN public.agents.role IS 'Rol del agente: admin, agent, supervisor';
COMMENT ON COLUMN public.agents.is_active IS 'Si el agente está activo en el sistema';

-- Políticas RLS (Row Level Security) - Opcional pero recomendado
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Política para que los admin puedan ver todos los agentes
CREATE POLICY "Admins can view all agents" ON public.agents
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- Política para que los agentes puedan ver su propio perfil
CREATE POLICY "Agents can view own profile" ON public.agents
    FOR SELECT
    USING (auth.uid()::text = id::text);

-- Política para que los admin puedan crear/actualizar agentes
CREATE POLICY "Admins can manage agents" ON public.agents
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Grant permisos necesarios
GRANT ALL ON public.agents TO authenticated;
GRANT SELECT ON public.agents TO anon;
