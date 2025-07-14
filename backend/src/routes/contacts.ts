import express from 'express';
import { databaseService } from '../services/database.service';

const router = express.Router();

// GET /api/contacts - Obtener todos los contactos con filtros
router.get('/', async (req: any, res: any) => {
  try {
    const {
      limit,
      offset,
      search,
      isBlocked,
      isArchived,
      isFavorite,
      tagId,
      sortBy,
      sortOrder
    } = req.query;

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

    const result = await databaseService.getContacts(options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('❌ Error obteniendo contactos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo contactos',
      details: error.message
    });
  }
});

// GET /api/contacts/search - Buscar contactos
router.get('/search', async (req: any, res: any) => {
  try {
    const { q, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro de búsqueda "q" requerido'
      });
    }

    const contacts = await databaseService.searchContacts(
      q.toString(),
      limit ? parseInt(limit) : undefined
    );
    
    res.json({
      success: true,
      contacts,
      query: q,
      total: contacts.length
    });
  } catch (error: any) {
    console.error('❌ Error buscando contactos:', error);
    res.status(500).json({
      success: false,
      error: 'Error buscando contactos',
      details: error.message
    });
  }
});

// GET /api/contacts/:id - Obtener contacto por ID
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const contact = await databaseService.getContactById(id);
    
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
  } catch (error: any) {
    console.error('❌ Error obteniendo contacto:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo contacto',
      details: error.message
    });
  }
});

// PUT /api/contacts/:id - Actualizar contacto
router.put('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const {
      name,
      displayName,
      phone,
      email,
      notes,
      isBlocked,
      isArchived,
      isFavorite
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (notes !== undefined) updateData.notes = notes;
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

    const contact = await databaseService.updateContact(id, updateData);
    
    res.json({
      success: true,
      message: 'Contacto actualizado exitosamente',
      contact
    });
  } catch (error: any) {
    console.error('❌ Error actualizando contacto:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando contacto',
      details: error.message
    });
  }
});

// DELETE /api/contacts/:id - Eliminar contacto
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const success = await databaseService.deleteContact(id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Contacto eliminado exitosamente'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Contacto no encontrado o no se pudo eliminar'
      });
    }
  } catch (error: any) {
    console.error('❌ Error eliminando contacto:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando contacto',
      details: error.message
    });
  }
});

// POST /api/contacts/:id/block - Bloquear/desbloquear contacto
router.post('/:id/block', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const result = await databaseService.toggleBlockContact(id);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.isBlocked ? 'Contacto bloqueado' : 'Contacto desbloqueado',
        isBlocked: result.isBlocked
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Contacto no encontrado'
      });
    }
  } catch (error: any) {
    console.error('❌ Error bloqueando/desbloqueando contacto:', error);
    res.status(500).json({
      success: false,
      error: 'Error bloqueando/desbloqueando contacto',
      details: error.message
    });
  }
});

// POST /api/contacts/:id/favorite - Marcar/desmarcar como favorito
router.post('/:id/favorite', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const result = await databaseService.toggleFavoriteContact(id);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.isFavorite ? 'Contacto marcado como favorito' : 'Contacto desmarcado como favorito',
        isFavorite: result.isFavorite
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Contacto no encontrado'
      });
    }
  } catch (error: any) {
    console.error('❌ Error marcando/desmarcando favorito:', error);
    res.status(500).json({
      success: false,
      error: 'Error marcando/desmarcando favorito',
      details: error.message
    });
  }
});

// ===== RUTAS DE ETIQUETAS =====

// GET /api/contacts/tags - Obtener todas las etiquetas
router.get('/tags/all', async (req: any, res: any) => {
  try {
    const tags = await databaseService.getTags();
    
    res.json({
      success: true,
      tags
    });
  } catch (error: any) {
    console.error('❌ Error obteniendo etiquetas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo etiquetas',
      details: error.message
    });
  }
});

// POST /api/contacts/tags - Crear nueva etiqueta
router.post('/tags', async (req: any, res: any) => {
  try {
    const { name, color, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la etiqueta es requerido'
      });
    }

    const tag = await databaseService.createTag({
      name,
      color,
      description
    });
    
    res.json({
      success: true,
      message: 'Etiqueta creada exitosamente',
      tag
    });
  } catch (error: any) {
    console.error('❌ Error creando etiqueta:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando etiqueta',
      details: error.message
    });
  }
});

// PUT /api/contacts/tags/:tagId - Actualizar etiqueta
router.put('/tags/:tagId', async (req: any, res: any) => {
  try {
    const { tagId } = req.params;
    const { name, color, description } = req.body;

    const tag = await databaseService.updateTag(tagId, {
      name,
      color,
      description
    });
    
    res.json({
      success: true,
      message: 'Etiqueta actualizada exitosamente',
      tag
    });
  } catch (error: any) {
    console.error('❌ Error actualizando etiqueta:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando etiqueta',
      details: error.message
    });
  }
});

// DELETE /api/contacts/tags/:tagId - Eliminar etiqueta
router.delete('/tags/:tagId', async (req: any, res: any) => {
  try {
    const { tagId } = req.params;
    
    const success = await databaseService.deleteTag(tagId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Etiqueta eliminada exitosamente'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Etiqueta no encontrada'
      });
    }
  } catch (error: any) {
    console.error('❌ Error eliminando etiqueta:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando etiqueta',
      details: error.message
    });
  }
});

// POST /api/contacts/:id/tags/:tagId - Agregar etiqueta a contacto
router.post('/:id/tags/:tagId', async (req: any, res: any) => {
  try {
    const { id, tagId } = req.params;
    
    const success = await databaseService.addTagToContact(id, tagId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Etiqueta agregada al contacto exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No se pudo agregar la etiqueta al contacto'
      });
    }
  } catch (error: any) {
    console.error('❌ Error agregando etiqueta a contacto:', error);
    res.status(500).json({
      success: false,
      error: 'Error agregando etiqueta a contacto',
      details: error.message
    });
  }
});

// DELETE /api/contacts/:id/tags/:tagId - Quitar etiqueta de contacto
router.delete('/:id/tags/:tagId', async (req: any, res: any) => {
  try {
    const { id, tagId } = req.params;
    
    const success = await databaseService.removeTagFromContact(id, tagId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Etiqueta quitada del contacto exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No se pudo quitar la etiqueta del contacto'
      });
    }
  } catch (error: any) {
    console.error('❌ Error quitando etiqueta de contacto:', error);
    res.status(500).json({
      success: false,
      error: 'Error quitando etiqueta de contacto',
      details: error.message
    });
  }
});

// GET /api/contacts/tags/:tagId/contacts - Obtener contactos por etiqueta
router.get('/tags/:tagId/contacts', async (req: any, res: any) => {
  try {
    const { tagId } = req.params;
    const { limit, offset } = req.query;
    
    const contacts = await databaseService.getContactsByTag(
      tagId,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined
    );
    
    res.json({
      success: true,
      contacts,
      total: contacts.length
    });
  } catch (error: any) {
    console.error('❌ Error obteniendo contactos por etiqueta:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo contactos por etiqueta',
      details: error.message
    });
  }
});

export default router; 