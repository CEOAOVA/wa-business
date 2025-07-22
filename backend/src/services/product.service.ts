import { databaseService } from './database.service';
import { unifiedCatalogService, UnifiedSearchResult } from './unified-catalog.service';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  metadata?: {
    brand?: string;
    compatibility?: string[];
    engine?: string[];
    location?: string;
    type?: string;
    quantity?: number;
    images?: string[];
    imageCount?: number;
    mainImage?: string;
    source?: string;
  };
}

export interface ProductSearchResult {
  products: Product[];
  totalFound: number;
  searchTerm: string;
  executionTime: number;
}

export interface PriceQuote {
  products: {
    product: Product;
    quantity: number;
    subtotal: number;
  }[];
  total: number;
  currency: string;
  validUntil: Date;
  quoteId: string;
}

export class ProductService {
  constructor() {
    console.log('🛍️ ProductService inicializado - INTEGRADO con catálogo unificado');
  }

  /**
   * Buscar productos usando el catálogo unificado de Supabase
   */
  async searchProductsUnified(searchTerm: string, options: {
    limit?: number;
    includeImages?: boolean;
    includeBasic?: boolean;
    includeConcepts?: boolean;
    category?: string;
  } = {}): Promise<{
    unifiedResults: UnifiedSearchResult;
    products: Product[];
    totalFound: number;
    searchTerm: string;
    executionTime: number;
  }> {
    const startTime = Date.now();
    const { 
      limit = 10, 
      includeImages = true, 
      includeBasic = true, 
      includeConcepts = true,
      category 
    } = options;

    try {
      console.log(`[ProductService] Búsqueda unificada: "${searchTerm}"`);

      // Buscar en el catálogo unificado
      const unifiedResults = await unifiedCatalogService.searchUnified(searchTerm, {
        limit,
        searchInImages: includeImages,
        searchInBasic: includeBasic,
        searchInConcepts: includeConcepts,
        category
      });

      // Convertir resultados a formato Product estándar
      const products = this.convertUnifiedToProducts(unifiedResults, limit);

      const executionTime = Date.now() - startTime;

      console.log(`[ProductService] Búsqueda unificada completada: ${products.length} productos en ${executionTime}ms`);

      return {
        unifiedResults,
        products,
        totalFound: unifiedResults.totalResults,
        searchTerm,
        executionTime
      };
    } catch (error) {
      console.error('[ProductService] Error en búsqueda unificada:', error);
      
      return {
        unifiedResults: {
          basicProducts: [],
          conceptMappings: [],
          productsWithImages: [],
          totalResults: 0,
          searchTime: 0,
          query: searchTerm
        },
        products: [],
        totalFound: 0,
        searchTerm,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Buscar productos por término de búsqueda (método principal)
   */
  async searchProducts(searchTerm: string, options: {
    limit?: number;
    filters?: {
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
      inStock?: boolean;
    };
  } = {}): Promise<ProductSearchResult> {
    const startTime = Date.now();
    const { limit = 10, filters = {} } = options;

    try {
      console.log(`[ProductService] Buscando productos: "${searchTerm}"`);

      // PRIORIZAR búsqueda unificada en Supabase
      const unifiedSearch = await this.searchProductsUnified(searchTerm, { 
        limit: limit * 2 // Buscar más para filtrar después
      });

      let products = unifiedSearch.products;

      // Aplicar filtros adicionales si se especifican
      if (filters.brand) {
        products = products.filter((p: any) => 
          p.metadata?.brand?.toLowerCase().includes(filters.brand!.toLowerCase())
        );
      }

      if (filters.minPrice !== undefined) {
        products = products.filter((p: any) => p.price >= filters.minPrice!);
      }

      if (filters.maxPrice !== undefined) {
        products = products.filter((p: any) => p.price <= filters.maxPrice!);
      }

      if (filters.inStock) {
        products = products.filter((p: any) => p.stock > 0);
      }

      // Si no hay resultados en Supabase, usar fallback
      if (products.length === 0) {
        console.log('[ProductService] Sin resultados en Supabase, usando fallback...');
        products = await databaseService.searchChatbotProducts(searchTerm, limit);
      }

      const executionTime = Date.now() - startTime;

      console.log(`[ProductService] Encontrados ${products.length} productos en ${executionTime}ms`);

      return {
        products: products.slice(0, limit),
        totalFound: Math.max(products.length, unifiedSearch.totalFound),
        searchTerm,
        executionTime
      };
    } catch (error) {
      console.error('[ProductService] Error buscando productos:', error);
      
      // Retornar resultados vacíos en caso de error
      return {
        products: [],
        totalFound: 0,
        searchTerm,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Buscar productos por vehículo específico
   */
  async searchByVehicle(vehicle: {
    brand: string;
    model: string;
    year?: number;
    engine?: string;
  }, partType?: string): Promise<ProductSearchResult> {
    console.log(`[ProductService] Buscando por vehículo: ${vehicle.brand} ${vehicle.model} ${vehicle.year || ''}`);

    // Construir término de búsqueda más específico
    let searchTerm = `${vehicle.brand} ${vehicle.model}`;
    if (partType) {
      searchTerm = `${partType} ${searchTerm}`;
    }

    // Buscar productos con filtros de compatibilidad
    const result = await this.searchProducts(searchTerm, {
      filters: {
        brand: vehicle.brand,
        inStock: true
      }
    });

    // Filtrar por compatibilidad específica si está en metadata
    const compatibleProducts = result.products.filter(product => {
      const compatibility = product.metadata?.compatibility || [];
      return compatibility.some(model => 
        model.toLowerCase().includes(vehicle.model.toLowerCase())
      );
    });

    if (compatibleProducts.length > 0) {
      result.products = compatibleProducts;
      result.totalFound = compatibleProducts.length;
    }

    return result;
  }

  /**
   * Obtener producto por SKU
   */
  async getProductBySku(sku: string): Promise<Product | null> {
    try {
      console.log(`[ProductService] Obteniendo producto por SKU: ${sku}`);

      const searchResult = await this.searchProducts(sku, { limit: 1 });
      const product = searchResult.products.find(p => p.sku === sku);

      if (product) {
        console.log(`[ProductService] Producto encontrado: ${product.name}`);
        return product;
      } else {
        console.log(`[ProductService] Producto no encontrado para SKU: ${sku}`);
        return null;
      }
    } catch (error) {
      console.error('[ProductService] Error obteniendo producto por SKU:', error);
      return null;
    }
  }

  /**
   * Generar cotización para una lista de productos
   */
  async generateQuote(items: { sku: string; quantity: number }[]): Promise<PriceQuote | null> {
    try {
      console.log(`[ProductService] Generando cotización para ${items.length} productos`);

      const quoteProducts = [];
      let total = 0;

      for (const item of items) {
        const product = await this.getProductBySku(item.sku);
        
        if (product) {
          const subtotal = product.price * item.quantity;
          
          quoteProducts.push({
            product,
            quantity: item.quantity,
            subtotal
          });
          
          total += subtotal;
        } else {
          console.warn(`[ProductService] Producto no encontrado para cotización: ${item.sku}`);
        }
      }

      if (quoteProducts.length === 0) {
        console.log('[ProductService] No se encontraron productos válidos para la cotización');
        return null;
      }

      const quote: PriceQuote = {
        products: quoteProducts,
        total,
        currency: 'MXN',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        quoteId: `QUOTE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      };

      console.log(`[ProductService] Cotización generada: ${quote.quoteId} por $${total.toFixed(2)} MXN`);
      return quote;
    } catch (error) {
      console.error('[ProductService] Error generando cotización:', error);
      return null;
    }
  }

  /**
   * Verificar disponibilidad de stock
   */
  async checkStock(sku: string, quantity: number = 1): Promise<{
    available: boolean;
    currentStock: number;
    requestedQuantity: number;
    sku: string;
  }> {
    try {
      const product = await this.getProductBySku(sku);
      
      if (!product) {
        return {
          available: false,
          currentStock: 0,
          requestedQuantity: quantity,
          sku
        };
      }

      return {
        available: product.stock >= quantity,
        currentStock: product.stock,
        requestedQuantity: quantity,
        sku
      };
    } catch (error) {
      console.error('[ProductService] Error verificando stock:', error);
      return {
        available: false,
        currentStock: 0,
        requestedQuantity: quantity,
        sku
      };
    }
  }

  /**
   * Obtener productos populares o recomendados
   */
  async getPopularProducts(limit: number = 5): Promise<Product[]> {
    console.log(`[ProductService] Obteniendo productos populares (límite: ${limit})`);

    try {
      // Para la simulación, usar búsquedas de términos populares
      const popularSearches = ['pastillas', 'filtro', 'bujias', 'aceite'];
      let allProducts: Product[] = [];

      for (const term of popularSearches) {
        const result = await this.searchProducts(term, { limit: 2 });
        allProducts = allProducts.concat(result.products);
      }

      // Remover duplicados por SKU
      const uniqueProducts = allProducts.filter((product, index, self) =>
        index === self.findIndex(p => p.sku === product.sku)
      );

      return uniqueProducts.slice(0, limit);
    } catch (error) {
      console.error('[ProductService] Error obteniendo productos populares:', error);
      return [];
    }
  }

  /**
   * Convertir resultados del catálogo unificado al formato Product estándar
   */
  private convertUnifiedToProducts(unifiedResults: UnifiedSearchResult, limit: number): Product[] {
    const products: Product[] = [];

    // Convertir productos con imágenes
    unifiedResults.productsWithImages.forEach((item, index) => {
      if (products.length >= limit) return;

      products.push({
        id: item.id,
        sku: `IMG-${item.id.slice(-8)}`,
        name: item.titulo,
        description: `Categoría: ${item.categoria || 'Sin categoría'}`,
        price: 0, // Precio por cotizar
        stock: 1, // Asumir disponible
        metadata: {
          brand: this.extractBrandFromTitle(item.titulo),
          type: item.categoria || 'Autopartes',
          images: this.extractImages(item),
          imageCount: item.total_images,
          mainImage: item.main_image_url
        }
      });
    });

    // Convertir productos básicos
    unifiedResults.basicProducts.forEach((item, index) => {
      if (products.length >= limit) return;

      products.push({
        id: item.id,
        sku: item.clave || `BASIC-${item.id.slice(-8)}`,
        name: item.nombre,
        description: 'Producto del catálogo básico',
        price: 0, // Precio por cotizar
        stock: 1, // Asumir disponible
        metadata: {
          brand: this.extractBrandFromTitle(item.nombre),
          type: 'Autopartes',
          source: 'basic_catalog'
        }
      });
    });

    return products;
  }

  /**
   * Extraer marca del título del producto
   */
  private extractBrandFromTitle(title: string): string | undefined {
    const commonBrands = [
      'BMW', 'MERCEDES', 'AUDI', 'VOLKSWAGEN', 'PORSCHE', 'FORD', 'NISSAN',
      'TOYOTA', 'HONDA', 'MAZDA', 'HYUNDAI', 'KIA', 'CHRYSLER', 'JEEP',
      'MAHLE', 'BOSCH', 'FREY', 'EMBLER', 'VIKA'
    ];

    const upperTitle = title.toUpperCase();
    const foundBrand = commonBrands.find(brand => upperTitle.includes(brand));
    return foundBrand;
  }

  /**
   * Extraer URLs de imágenes del producto
   */
  private extractImages(item: any): string[] {
    const images: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const imageKey = `imagen_${i}`;
      if (item[imageKey] && item[imageKey].trim()) {
        images.push(item[imageKey]);
      }
    }
    return images;
  }

  /**
   * Simular procesamiento de pedido (integración ERP futura)
   */
  async processOrder(quote: PriceQuote, customerInfo: {
    name?: string;
    phone: string;
    address?: string;
  }): Promise<{
    success: boolean;
    orderId?: string;
    erpOrderId?: string;
    estimatedDelivery?: Date;
    error?: string;
  }> {
    try {
      console.log(`[ProductService] Procesando pedido para cotización: ${quote.quoteId}`);

      // Verificar stock antes de procesar
      for (const item of quote.products) {
        const stockCheck = await this.checkStock(item.product.sku, item.quantity);
        if (!stockCheck.available) {
          return {
            success: false,
            error: `Stock insuficiente para ${item.product.name}. Disponible: ${stockCheck.currentStock}, Solicitado: ${item.quantity}`
          };
        }
      }

      // Crear pedido en la base de datos
      const orderDetails = {
        quoteId: quote.quoteId,
        customerInfo,
        products: quote.products.map(item => ({
          sku: item.product.sku,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.subtotal
        })),
        total: quote.total,
        currency: quote.currency
      };

      const orderResult = await databaseService.createChatbotOrder({
        orderDetails,
        status: 'pending'
      });

      if (orderResult.success) {
        console.log(`[ProductService] Pedido creado exitosamente: ${orderResult.orderId}`);
        
        return {
          success: true,
          orderId: orderResult.orderId,
          erpOrderId: orderResult.erpOrderId,
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 días
        };
      } else {
        return {
          success: false,
          error: 'Error creando pedido en la base de datos'
        };
      }
    } catch (error) {
      console.error('[ProductService] Error procesando pedido:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

// Instancia singleton
export const productService = new ProductService(); 