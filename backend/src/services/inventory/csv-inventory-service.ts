/**
 * Servicio de inventario CSV para búsqueda de productos
 * Simula base de datos de productos para búsquedas
 */
import { normalizeForSearch } from '../../utils/text-processing';

export interface CsvInventoryRow {
  Clave?: string;
  codigo?: string;
  Nombre?: string;
  nombre?: string;
  Marca?: string;
  marca?: string;
  Categoria?: string;
  categoria?: string;
  Precio?: number;
  precio?: number;
  Descripcion?: string;
  descripcion?: string;
}

export class CsvInventoryService {
  private inventoryData: CsvInventoryRow[] = [];
  private isLoaded = false;

  constructor() {
    this.loadMockData();
  }

  /**
   * Carga datos simulados de inventario
   */
  private loadMockData(): void {
    // Datos simulados para demostración
    this.inventoryData = [
      // Aceites
      { Clave: 'ACE001', Nombre: 'Aceite Motor 5W30 Castrol GTX', Marca: 'Castrol', Categoria: 'Aceites', Precio: 450 },
      { Clave: 'ACE002', Nombre: 'Aceite Motor 10W40 Mobil 1', Marca: 'Mobil', Categoria: 'Aceites', Precio: 520 },
      { Clave: 'ACE003', Nombre: 'Aceite Transmisión ATF Dexron VI', Marca: 'Valvoline', Categoria: 'Aceites', Precio: 380 },
      
      // Filtros
      { Clave: 'FIL001', Nombre: 'Filtro Aceite Honda Civic 2018-2022', Marca: 'Honda', Categoria: 'Filtros', Precio: 220 },
      { Clave: 'FIL002', Nombre: 'Filtro Aire Toyota Corolla 2020-2023', Marca: 'Toyota', Categoria: 'Filtros', Precio: 180 },
      { Clave: 'FIL003', Nombre: 'Filtro Combustible Nissan Sentra', Marca: 'Nissan', Categoria: 'Filtros', Precio: 160 },
      { Clave: 'FIL004', Nombre: 'Filtro Cabina Volkswagen Jetta', Marca: 'Volkswagen', Categoria: 'Filtros', Precio: 140 },
      
      // Frenos
      { Clave: 'FRE001', Nombre: 'Balatas Delanteras Brembo Honda Civic', Marca: 'Brembo', Categoria: 'Frenos', Precio: 850 },
      { Clave: 'FRE002', Nombre: 'Balatas Traseras Akebono Toyota Corolla', Marca: 'Akebono', Categoria: 'Frenos', Precio: 680 },
      { Clave: 'FRE003', Nombre: 'Discos Freno Delanteros Nissan Sentra', Marca: 'Nissan', Categoria: 'Frenos', Precio: 1200 },
      { Clave: 'FRE004', Nombre: 'Pastillas Freno BMW Serie 3', Marca: 'BMW', Categoria: 'Frenos', Precio: 950 },
      
      // Suspensión
      { Clave: 'SUS001', Nombre: 'Amortiguador Delantero Monroe Honda Civic', Marca: 'Monroe', Categoria: 'Suspension', Precio: 1100 },
      { Clave: 'SUS002', Nombre: 'Amortiguador Trasero KYB Toyota Corolla', Marca: 'KYB', Categoria: 'Suspension', Precio: 980 },
      { Clave: 'SUS003', Nombre: 'Huesitos Delanteros Nissan Sentra', Marca: 'Nissan', Categoria: 'Suspension', Precio: 450 },
      { Clave: 'SUS004', Nombre: 'Rótula Inferior Volkswagen Jetta', Marca: 'Volkswagen', Categoria: 'Suspension', Precio: 320 },
      
      // Baterías
      { Clave: 'BAT001', Nombre: 'Batería 45AH LTH Honda Civic', Marca: 'LTH', Categoria: 'Baterias', Precio: 1800 },
      { Clave: 'BAT002', Nombre: 'Batería 60AH AC Delco Toyota Corolla', Marca: 'AC Delco', Categoria: 'Baterias', Precio: 2200 },
      { Clave: 'BAT003', Nombre: 'Batería 70AH Bosch Nissan Sentra', Marca: 'Bosch', Categoria: 'Baterias', Precio: 2500 },
      
      // Llantas
      { Clave: 'LLA001', Nombre: 'Llanta 195/65R15 Michelin Energy', Marca: 'Michelin', Categoria: 'Llantas', Precio: 1800 },
      { Clave: 'LLA002', Nombre: 'Llanta 205/55R16 Bridgestone Turanza', Marca: 'Bridgestone', Categoria: 'Llantas', Precio: 2100 },
      { Clave: 'LLA003', Nombre: 'Llanta 225/45R17 Continental Premium', Marca: 'Continental', Categoria: 'Llantas', Precio: 2800 },
      
      // Motor
      { Clave: 'MOT001', Nombre: 'Bujías NGK Iridium Honda Civic', Marca: 'NGK', Categoria: 'Motor', Precio: 180 },
      { Clave: 'MOT002', Nombre: 'Banda Serpentina Gates Toyota Corolla', Marca: 'Gates', Categoria: 'Motor', Precio: 380 },
      { Clave: 'MOT003', Nombre: 'Termostato Nissan Sentra 1.8L', Marca: 'Nissan', Categoria: 'Motor', Precio: 220 },
      { Clave: 'MOT004', Nombre: 'Radiador Honda Civic 2018-2022', Marca: 'Honda', Categoria: 'Motor', Precio: 3200 },
      
      // Transmisión
      { Clave: 'TRA001', Nombre: 'Kit Clutch Honda Civic Manual', Marca: 'Exedy', Categoria: 'Transmision', Precio: 4500 },
      { Clave: 'TRA002', Nombre: 'Bomba Clutch Toyota Corolla', Marca: 'Toyota', Categoria: 'Transmision', Precio: 580 },
      { Clave: 'TRA003', Nombre: 'Soporte Motor Nissan Sentra', Marca: 'Nissan', Categoria: 'Transmision', Precio: 890 },
      
      // Eléctrico
      { Clave: 'ELE001', Nombre: 'Alternador Honda Civic 2018-2022', Marca: 'Honda', Categoria: 'Electrico', Precio: 2800 },
      { Clave: 'ELE002', Nombre: 'Motor Arranque Toyota Corolla', Marca: 'Toyota', Categoria: 'Electrico', Precio: 3200 },
      { Clave: 'ELE003', Nombre: 'Sensor Oxígeno Nissan Sentra', Marca: 'Nissan', Categoria: 'Electrico', Precio: 1200 },
    ];

    this.isLoaded = true;
    console.log(`[CsvInventoryService] Cargados ${this.inventoryData.length} productos de demostración`);
  }

  /**
   * Busca productos por nombre con flexibilidad en el orden de palabras
   */
  searchByNombre(text: string): CsvInventoryRow[] {
    if (!text || !this.isLoaded) return [];

    console.log(`[CsvInventoryService] Buscando: "${text}" en ${this.inventoryData.length} productos`);

    // Normalizar texto de búsqueda
    const normalizedText = normalizeForSearch(text);
    console.log(`[CsvInventoryService] Texto normalizado: "${normalizedText}"`);

    // Extraer tokens de búsqueda
    const searchTokens = normalizedText.split(' ').filter(token => token.length > 2);
    console.log(`[CsvInventoryService] Tokens de búsqueda: [${searchTokens.join(', ')}]`);

    if (searchTokens.length === 0) return [];

    // Buscar coincidencias
    const results = this.inventoryData.filter(row => {
      const nombre = normalizeForSearch(row.Nombre || row.nombre || '');
      const marca = normalizeForSearch(row.Marca || row.marca || '');
      const categoria = normalizeForSearch(row.Categoria || row.categoria || '');
      const descripcion = normalizeForSearch(row.Descripcion || row.descripcion || '');
      
      const fullText = `${nombre} ${marca} ${categoria} ${descripcion}`.toLowerCase();
      
      // Verificar si todos los tokens están presentes
      return searchTokens.every(token => 
        fullText.includes(token.toLowerCase())
      );
    });

    console.log(`[CsvInventoryService] Encontrados ${results.length} resultados`);
    
    // Mostrar primeros resultados para debug
    if (results.length > 0) {
      console.log(`[CsvInventoryService] Primeros resultados:`, 
        results.slice(0, 3).map(r => `${r.Clave || r.codigo} - ${r.Nombre || r.nombre}`)
      );
    }

    return results;
  }

  /**
   * Busca producto por código exacto
   */
  searchByCodigo(codigo: string): CsvInventoryRow | null {
    if (!codigo || !this.isLoaded) return null;

    const normalizedCodigo = codigo.trim().toUpperCase();
    
    const result = this.inventoryData.find(row => {
      const rowCodigo = (row.Clave || row.codigo || '').trim().toUpperCase();
      return rowCodigo === normalizedCodigo;
    });

    if (result) {
      console.log(`[CsvInventoryService] Producto encontrado por código ${codigo}: ${result.Nombre || result.nombre}`);
    } else {
      console.log(`[CsvInventoryService] No se encontró producto con código: ${codigo}`);
    }

    return result || null;
  }

  /**
   * Busca productos por categoría
   */
  searchByCategoria(categoria: string): CsvInventoryRow[] {
    if (!categoria || !this.isLoaded) return [];

    const normalizedCategoria = normalizeForSearch(categoria);
    
    return this.inventoryData.filter(row => {
      const rowCategoria = normalizeForSearch(row.Categoria || row.categoria || '');
      return rowCategoria.includes(normalizedCategoria);
    });
  }

  /**
   * Busca productos por marca
   */
  searchByMarca(marca: string): CsvInventoryRow[] {
    if (!marca || !this.isLoaded) return [];

    const normalizedMarca = normalizeForSearch(marca);
    
    return this.inventoryData.filter(row => {
      const rowMarca = normalizeForSearch(row.Marca || row.marca || '');
      return rowMarca.includes(normalizedMarca);
    });
  }

  /**
   * Búsqueda combinada (nombre, código, marca, categoría)
   */
  searchGeneral(query: string): CsvInventoryRow[] {
    if (!query || !this.isLoaded) return [];

    console.log(`[CsvInventoryService] Búsqueda general: "${query}"`);

    // Intentar búsqueda por código primero
    const byCode = this.searchByCodigo(query);
    if (byCode) {
      console.log(`[CsvInventoryService] Encontrado por código exacto`);
      return [byCode];
    }

    // Búsqueda por nombre
    const byName = this.searchByNombre(query);
    if (byName.length > 0) {
      console.log(`[CsvInventoryService] Encontrados ${byName.length} por nombre`);
      return byName;
    }

    // Búsqueda por marca
    const byMarca = this.searchByMarca(query);
    if (byMarca.length > 0) {
      console.log(`[CsvInventoryService] Encontrados ${byMarca.length} por marca`);
      return byMarca;
    }

    // Búsqueda por categoría
    const byCategoria = this.searchByCategoria(query);
    if (byCategoria.length > 0) {
      console.log(`[CsvInventoryService] Encontrados ${byCategoria.length} por categoría`);
      return byCategoria;
    }

    console.log(`[CsvInventoryService] Sin resultados para: "${query}"`);
    return [];
  }

  /**
   * Obtiene todas las categorías disponibles
   */
  getCategories(): string[] {
    if (!this.isLoaded) return [];

    const categories = new Set<string>();
    this.inventoryData.forEach(row => {
      const categoria = row.Categoria || row.categoria;
      if (categoria) categories.add(categoria);
    });

    return Array.from(categories);
  }

  /**
   * Obtiene todas las marcas disponibles
   */
  getMarcas(): string[] {
    if (!this.isLoaded) return [];

    const marcas = new Set<string>();
    this.inventoryData.forEach(row => {
      const marca = row.Marca || row.marca;
      if (marca) marcas.add(marca);
    });

    return Array.from(marcas);
  }

  /**
   * Obtiene estadísticas del inventario
   */
  getStats(): {
    totalProducts: number;
    categories: number;
    marcas: number;
    averagePrice: number;
    isLoaded: boolean;
  } {
    if (!this.isLoaded) {
      return {
        totalProducts: 0,
        categories: 0,
        marcas: 0,
        averagePrice: 0,
        isLoaded: false
      };
    }

    const categories = this.getCategories();
    const marcas = this.getMarcas();
    
    const prices = this.inventoryData
      .map(row => row.Precio || row.precio || 0)
      .filter(price => price > 0);
    
    const averagePrice = prices.length > 0 
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
      : 0;

    return {
      totalProducts: this.inventoryData.length,
      categories: categories.length,
      marcas: marcas.length,
      averagePrice: Math.round(averagePrice),
      isLoaded: this.isLoaded
    };
  }

  /**
   * Agrega productos al inventario (para pruebas)
   */
  addProducts(products: CsvInventoryRow[]): void {
    this.inventoryData.push(...products);
    console.log(`[CsvInventoryService] Agregados ${products.length} productos. Total: ${this.inventoryData.length}`);
  }

  /**
   * Limpia el inventario
   */
  clear(): void {
    this.inventoryData = [];
    this.isLoaded = false;
    console.log(`[CsvInventoryService] Inventario limpiado`);
  }

  /**
   * Recarga los datos
   */
  reload(): void {
    this.clear();
    this.loadMockData();
  }
}

// Exportar instancia singleton
export const csvInventoryService = new CsvInventoryService(); 