const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/env.local' });

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Configuración de Supabase no encontrada');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActiveSessions() {
    console.log('🔍 Verificando sesiones activas...\n');
    
    try {
        // 1. Verificar sesiones de autenticación en Supabase
        console.log('📊 1. Sesiones de Autenticación (Supabase):');
        const { data: sessions, error: sessionsError } = await supabase.auth.admin.listSessions();
        
        if (sessionsError) {
            console.log('❌ Error al obtener sesiones:', sessionsError.message);
        } else {
            console.log(`✅ ${sessions.length} sesiones activas encontradas`);
            
            if (sessions.length > 0) {
                sessions.forEach((session, index) => {
                    console.log(`\n   Sesión ${index + 1}:`);
                    console.log(`   • Usuario ID: ${session.user_id}`);
                    console.log(`   • Creada: ${new Date(session.created_at).toLocaleString()}`);
                    console.log(`   • Última actividad: ${new Date(session.updated_at).toLocaleString()}`);
                    console.log(`   • IP: ${session.ip || 'No disponible'}`);
                    console.log(`   • User Agent: ${session.user_agent ? session.user_agent.substring(0, 50) + '...' : 'No disponible'}`);
                });
            }
        }
        
        // 2. Verificar usuarios activos en la tabla agents
        console.log('\n📊 2. Usuarios Activos (Tabla agents):');
        const { data: agents, error: agentsError } = await supabase
            .from('agents')
            .select('*')
            .eq('is_active', true)
            .order('last_login', { ascending: false });
        
        if (agentsError) {
            console.log('❌ Error al obtener agentes:', agentsError.message);
        } else {
            console.log(`✅ ${agents.length} usuarios activos encontrados`);
            
            if (agents.length > 0) {
                agents.forEach((agent, index) => {
                    console.log(`\n   Usuario ${index + 1}:`);
                    console.log(`   • ID: ${agent.id}`);
                    console.log(`   • Email: ${agent.email}`);
                    console.log(`   • Nombre: ${agent.full_name}`);
                    console.log(`   • Rol: ${agent.role}`);
                    console.log(`   • Último login: ${agent.last_login ? new Date(agent.last_login).toLocaleString() : 'Nunca'}`);
                    console.log(`   • Creado: ${new Date(agent.created_at).toLocaleString()}`);
                });
            }
        }
        
        // 3. Verificar conversaciones activas
        console.log('\n📊 3. Conversaciones Activas:');
        const { data: conversations, error: conversationsError } = await supabase
            .from('conversations')
            .select('*')
            .eq('status', 'active')
            .order('updated_at', { ascending: false });
        
        if (conversationsError) {
            console.log('❌ Error al obtener conversaciones:', conversationsError.message);
        } else {
            console.log(`✅ ${conversations.length} conversaciones activas encontradas`);
            
            if (conversations.length > 0) {
                conversations.forEach((conversation, index) => {
                    console.log(`\n   Conversación ${index + 1}:`);
                    console.log(`   • ID: ${conversation.id}`);
                    console.log(`   • Usuario: ${conversation.user_id}`);
                    console.log(`   • Teléfono: ${conversation.phone_number}`);
                    console.log(`   • POS: ${conversation.point_of_sale_id}`);
                    console.log(`   • AI Mode: ${conversation.ai_mode}`);
                    console.log(`   • Agente asignado: ${conversation.assigned_agent_id || 'Ninguno'}`);
                    console.log(`   • Última actualización: ${new Date(conversation.updated_at).toLocaleString()}`);
                });
            }
        }
        
        // 4. Verificar mensajes recientes
        console.log('\n📊 4. Mensajes Recientes (últimas 24 horas):');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .gte('timestamp', yesterday.toISOString())
            .order('timestamp', { ascending: false })
            .limit(10);
        
        if (messagesError) {
            console.log('❌ Error al obtener mensajes:', messagesError.message);
        } else {
            console.log(`✅ ${messages.length} mensajes recientes encontrados`);
            
            if (messages.length > 0) {
                messages.forEach((message, index) => {
                    console.log(`\n   Mensaje ${index + 1}:`);
                    console.log(`   • ID: ${message.id}`);
                    console.log(`   • Conversación: ${message.conversation_id}`);
                    console.log(`   • Rol: ${message.role}`);
                    console.log(`   • Contenido: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`);
                    console.log(`   • Timestamp: ${new Date(message.timestamp).toLocaleString()}`);
                });
            }
        }
        
        console.log('\n🎉 Verificación completada');
        
    } catch (error) {
        console.error('❌ Error general:', error.message);
    }
}

// Ejecutar verificación
checkActiveSessions().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
}); 