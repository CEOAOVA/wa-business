"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_service_1 = require("../services/database.service");
const supabase_database_service_1 = require("../services/supabase-database.service");
const router = express_1.default.Router();
// GET /api/contacts - Obtener todos los contactos con filtros
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { limit, offset, search, isBlocked, isArchived, isFavorite, tagId, sortBy, sortOrder } = req.query;
        const options = {
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
            search: search || undefined,
            isBlocked: isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined,
            isArchived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
            isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
            tagId: tagId || undefined,
            sortBy: sortBy || undefined,
            sortOrder: sortOrder || undefined
        };
        const result = yield database_service_1.databaseService.getContacts(options);
        res.json(Object.assign({ success: true }, result));
    }
    catch (error) {
        console.error('❌ Error obteniendo contactos:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo contactos',
            details: error.message
        });
    }
}));
// GET /api/contacts/search - Buscar contactos
router.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q, limit } = req.query;
        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Parámetro de búsqueda "q" requerido'
            });
        }
        const contacts = yield database_service_1.databaseService.searchContacts(q.toString(), limit ? parseInt(limit) : undefined);
        res.json({
            success: true,
            contacts,
            query: q,
            total: contacts.length
        });
    }
    catch (error) {
        console.error('❌ Error buscando contactos:', error);
        res.status(500).json({
            success: false,
            error: 'Error buscando contactos',
            details: error.message
        });
    }
}));
// GET /api/contacts/:id - Obtener contacto por ID
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const contact = yield database_service_1.databaseService.getContactById(id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contacto no encontrado'
            });
        }
        res.json({
            success: true,
            contact
        });
    }
    catch (error) {
        console.error('❌ Error obteniendo contacto:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo contacto',
            details: error.message
        });
    }
}));
// PUT /api/contacts/:id - Actualizar contacto
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, displayName, phone, email, notes, isBlocked, isArchived, isFavorite } = req.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (displayName !== undefined)
            updateData.displayName = displayName;
        if (phone !== undefined)
            updateData.phone = phone;
        if (email !== undefined)
            updateData.email = email;
        if (notes !== undefined)
            updateData.notes = notes;
        if (isBlocked !== undefined)
            updateData.isBlocked = isBlocked;
        if (isArchived !== undefined)
            updateData.isArchived = isArchived;
        if (isFavorite !== undefined)
            updateData.isFavorite = isFavorite;
        const contact = yield database_service_1.databaseService.updateContact(id, updateData);
        res.json({
            success: true,
            message: 'Contacto actualizado exitosamente',
            contact
        });
    }
    catch (error) {
        console.error('❌ Error actualizando contacto:', error);
        res.status(500).json({
            success: false,
            error: 'Error actualizando contacto',
            details: error.message
        });
    }
}));
// DELETE /api/contacts/:id - Eliminar contacto
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const success = yield database_service_1.databaseService.deleteContact(id);
        if (success) {
            res.json({
                success: true,
                message: 'Contacto eliminado exitosamente'
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Contacto no encontrado o no se pudo eliminar'
            });
        }
    }
    catch (error) {
        console.error('❌ Error eliminando contacto:', error);
        res.status(500).json({
            success: false,
            error: 'Error eliminando contacto',
            details: error.message
        });
    }
}));
// POST /api/contacts/:id/block - Bloquear/desbloquear contacto
router.post('/:id/block', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield database_service_1.databaseService.toggleBlockContact(id);
        if (result.success) {
            res.json({
                success: true,
                message: result.isBlocked ? 'Contacto bloqueado' : 'Contacto desbloqueado',
                isBlocked: result.isBlocked
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Contacto no encontrado'
            });
        }
    }
    catch (error) {
        console.error('❌ Error bloqueando/desbloqueando contacto:', error);
        res.status(500).json({
            success: false,
            error: 'Error bloqueando/desbloqueando contacto',
            details: error.message
        });
    }
}));
// POST /api/contacts/:id/favorite - Marcar/desmarcar como favorito
router.post('/:id/favorite', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield database_service_1.databaseService.toggleFavoriteContact(id);
        if (result.success) {
            res.json({
                success: true,
                message: result.isFavorite ? 'Contacto marcado como favorito' : 'Contacto desmarcado como favorito',
                isFavorite: result.isFavorite
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Contacto no encontrado'
            });
        }
    }
    catch (error) {
        console.error('❌ Error marcando/desmarcando favorito:', error);
        res.status(500).json({
            success: false,
            error: 'Error marcando/desmarcando favorito',
            details: error.message
        });
    }
}));
// ===== RUTAS DE ETIQUETAS =====
// GET /api/contacts/tags - Obtener todas las etiquetas
router.get('/tags/all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tags = yield database_service_1.databaseService.getTags();
        res.json({
            success: true,
            tags
        });
    }
    catch (error) {
        console.error('❌ Error obteniendo etiquetas:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo etiquetas',
            details: error.message
        });
    }
}));
// POST /api/contacts/tags - Crear nueva etiqueta
router.post('/tags', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, color, description } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'El nombre de la etiqueta es requerido'
            });
        }
        const tag = yield database_service_1.databaseService.createTag({
            name,
            color,
            description
        });
        res.json({
            success: true,
            message: 'Etiqueta creada exitosamente',
            tag
        });
    }
    catch (error) {
        console.error('❌ Error creando etiqueta:', error);
        res.status(500).json({
            success: false,
            error: 'Error creando etiqueta',
            details: error.message
        });
    }
}));
// PUT /api/contacts/tags/:tagId - Actualizar etiqueta
router.put('/tags/:tagId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tagId } = req.params;
        const { name, color, description } = req.body;
        const tag = yield database_service_1.databaseService.updateTag(tagId, {
            name,
            color,
            description
        });
        res.json({
            success: true,
            message: 'Etiqueta actualizada exitosamente',
            tag
        });
    }
    catch (error) {
        console.error('❌ Error actualizando etiqueta:', error);
        res.status(500).json({
            success: false,
            error: 'Error actualizando etiqueta',
            details: error.message
        });
    }
}));
// DELETE /api/contacts/tags/:tagId - Eliminar etiqueta
router.delete('/tags/:tagId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tagId } = req.params;
        const success = yield database_service_1.databaseService.deleteTag(tagId);
        if (success) {
            res.json({
                success: true,
                message: 'Etiqueta eliminada exitosamente'
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Etiqueta no encontrada'
            });
        }
    }
    catch (error) {
        console.error('❌ Error eliminando etiqueta:', error);
        res.status(500).json({
            success: false,
            error: 'Error eliminando etiqueta',
            details: error.message
        });
    }
}));
// POST /api/contacts/:id/tags/:tagId - Agregar etiqueta a contacto
router.post('/:id/tags/:tagId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, tagId } = req.params;
        const success = yield database_service_1.databaseService.addTagToContact(id, tagId);
        if (success) {
            res.json({
                success: true,
                message: 'Etiqueta agregada al contacto exitosamente'
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: 'No se pudo agregar la etiqueta al contacto'
            });
        }
    }
    catch (error) {
        console.error('❌ Error agregando etiqueta a contacto:', error);
        res.status(500).json({
            success: false,
            error: 'Error agregando etiqueta a contacto',
            details: error.message
        });
    }
}));
// DELETE /api/contacts/:id/tags/:tagId - Quitar etiqueta de contacto
router.delete('/:id/tags/:tagId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, tagId } = req.params;
        const success = yield database_service_1.databaseService.removeTagFromContact(id, tagId);
        if (success) {
            res.json({
                success: true,
                message: 'Etiqueta quitada del contacto exitosamente'
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: 'No se pudo quitar la etiqueta del contacto'
            });
        }
    }
    catch (error) {
        console.error('❌ Error quitando etiqueta de contacto:', error);
        res.status(500).json({
            success: false,
            error: 'Error quitando etiqueta de contacto',
            details: error.message
        });
    }
}));
// GET /api/contacts/tags/:tagId/contacts - Obtener contactos por etiqueta
router.get('/tags/:tagId/contacts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tagId } = req.params;
        const { limit, offset } = req.query;
        const contacts = yield database_service_1.databaseService.getContactsByTag(tagId, limit ? parseInt(limit) : undefined, offset ? parseInt(offset) : undefined);
        res.json({
            success: true,
            contacts,
            total: contacts.length
        });
    }
    catch (error) {
        console.error('❌ Error obteniendo contactos por etiqueta:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo contactos por etiqueta',
            details: error.message
        });
    }
}));
/**
 * GET /api/contacts/conversation/:phoneNumber
 * Obtener información de contacto de una conversación por número de teléfono
 */
router.get('/conversation/:phoneNumber', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phoneNumber } = req.params;
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'phoneNumber es requerido'
            });
        }
        console.log(`[ContactsRouter] Obteniendo información de contacto para: ${phoneNumber}`);
        // Obtener contacto por número de teléfono
        const contact = yield supabase_database_service_1.supabaseDatabaseService.getContactByPhone(phoneNumber);
        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contacto no encontrado'
            });
        }
        // Obtener conversación asociada
        const conversation = yield supabase_database_service_1.supabaseDatabaseService.getOrCreateConversation(phoneNumber);
        return res.json({
            success: true,
            contact: {
                id: contact.id,
                phone: contact.phone,
                name: contact.name,
                email: contact.email,
                postal_code: contact.postal_code,
                is_blocked: contact.is_blocked,
                is_favorite: contact.is_favorite,
                created_at: contact.created_at,
                updated_at: contact.updated_at,
                metadata: contact.metadata
            },
            conversation: conversation ? {
                id: conversation.id,
                status: conversation.status,
                ai_mode: conversation.ai_mode,
                assigned_agent_id: conversation.assigned_agent_id,
                unread_count: conversation.unread_count,
                last_message_at: conversation.last_message_at,
                takeover_mode: conversation.takeover_mode,
                created_at: conversation.created_at,
                updated_at: conversation.updated_at
            } : null
        });
    }
    catch (error) {
        console.error('[ContactsRouter] Error obteniendo información de contacto:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
}));
/**
 * PUT /api/contacts/:contactId
 * Actualizar información de contacto (incluyendo código postal)
 */
router.put('/:contactId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { contactId } = req.params;
        const { name, email, postal_code, is_blocked, is_favorite, metadata } = req.body;
        if (!contactId) {
            return res.status(400).json({
                success: false,
                error: 'contactId es requerido'
            });
        }
        console.log(`[ContactsRouter] Actualizando contacto ${contactId} con código postal: ${postal_code}`);
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (email !== undefined)
            updateData.email = email;
        if (postal_code !== undefined)
            updateData.postal_code = postal_code;
        if (is_blocked !== undefined)
            updateData.is_blocked = is_blocked;
        if (is_favorite !== undefined)
            updateData.is_favorite = is_favorite;
        if (metadata !== undefined)
            updateData.metadata = metadata;
        const success = yield supabase_database_service_1.supabaseDatabaseService.updateContactWithPostalCode(contactId, updateData);
        if (!success) {
            return res.status(500).json({
                success: false,
                error: 'Error actualizando contacto'
            });
        }
        return res.json({
            success: true,
            message: 'Contacto actualizado exitosamente'
        });
    }
    catch (error) {
        console.error('[ContactsRouter] Error actualizando contacto:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
}));
/**
 * POST /api/contacts/migrate
 * Ejecutar migración para agregar campo postal_code a contacts
 */
router.post('/migrate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[ContactsRouter] Ejecutando migración de postal_code...');
        const result = yield supabase_database_service_1.supabaseDatabaseService.addPostalCodeToContacts();
        if (result.success) {
            return res.json({
                success: true,
                message: 'Migración completada exitosamente',
                details: 'Campo postal_code agregado a la tabla contacts'
            });
        }
        else {
            return res.status(500).json({
                success: false,
                error: result.error || 'Error en migración'
            });
        }
    }
    catch (error) {
        console.error('[ContactsRouter] Error en migración:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
}));
exports.default = router;
