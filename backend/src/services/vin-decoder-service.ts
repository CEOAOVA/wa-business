/**
 * Servicio para decodificar VIN (Vehicle Identification Number)
 * Usa API Ninjas para obtener información del vehículo
 */
import { getConfig } from '../config';

export interface VehicleInfo {
  vin: string;
  year: number;
  make: string;
  model: string;
  engine: string;
  transmission: string;
  drivetrain: string;
  fuelType: string;
  city_mpg: number;
  highway_mpg: number;
  cylinders: number;
  displacement: number;
  class: string;
}

export class VinDecoderService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.api-ninjas.com/v1/vinlookup';

  constructor() {
    const config = getConfig();
    this.apiKey = config.apiNinjasKey;
  }

  /**
   * Decodifica un VIN y retorna la información del vehículo
   * @param vin Número VIN del vehículo
   * @returns Información del vehículo o null si no se encuentra
   */
  async decodeVin(vin: string): Promise<VehicleInfo | null> {
    if (!this.apiKey) {
      console.warn('[VinDecoder] API key de API Ninjas no configurada');
      return null;
    }

    if (!this.isValidVin(vin)) {
      console.warn(`[VinDecoder] VIN inválido: ${vin}`);
      return null;
    }

    try {
      console.log(`[VinDecoder] Decodificando VIN: ${vin}`);
      
      const response = await fetch(`${this.baseUrl}?vin=${vin}`, {
        method: 'GET',
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || Object.keys(data).length === 0) {
        console.log(`[VinDecoder] No se encontró información para VIN: ${vin}`);
        return null;
      }

      const vehicleInfo: VehicleInfo = {
        vin: vin,
        year: data.year || 0,
        make: data.make || '',
        model: data.model || '',
        engine: data.engine || '',
        transmission: data.transmission || '',
        drivetrain: data.drivetrain || '',
        fuelType: data.fuel_type || '',
        city_mpg: data.city_mpg || 0,
        highway_mpg: data.highway_mpg || 0,
        cylinders: data.cylinders || 0,
        displacement: data.displacement || 0,
        class: data.class || ''
      };

      console.log(`[VinDecoder] VIN decodificado exitosamente: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`);
      return vehicleInfo;

    } catch (error) {
      console.error(`[VinDecoder] Error decodificando VIN ${vin}:`, error);
      return null;
    }
  }

  /**
   * Valida si un VIN tiene el formato correcto
   * @param vin VIN a validar
   * @returns true si es válido, false si no
   */
  private isValidVin(vin: string): boolean {
    if (!vin || typeof vin !== 'string') {
      return false;
    }

    // Limpiar espacios y convertir a mayúsculas
    const cleanVin = vin.trim().toUpperCase();
    
    // VIN debe tener exactamente 17 caracteres
    if (cleanVin.length !== 17) {
      return false;
    }

    // VIN no debe contener las letras I, O, o Q
    if (/[IOQ]/.test(cleanVin)) {
      return false;
    }

    // VIN debe contener solo números y letras permitidas
    if (!/^[0-9A-HJ-NPR-Z]{17}$/.test(cleanVin)) {
      return false;
    }

    return true;
  }

  /**
   * Limpia y normaliza un VIN
   * @param vin VIN sin procesar
   * @returns VIN limpio y normalizado
   */
  normalizeVin(vin: string): string {
    if (!vin) return '';
    
    return vin
      .trim()
      .toUpperCase()
      .replace(/[^0-9A-HJ-NPR-Z]/g, ''); // Eliminar caracteres no válidos
  }

  /**
   * Extrae posibles VINs de un texto
   * @param text Texto donde buscar VINs
   * @returns Array de VINs encontrados
   */
  extractVinsFromText(text: string): string[] {
    if (!text) return [];

    // Buscar secuencias de 17 caracteres que podrían ser VINs
    const vinPattern = /\b[0-9A-HJ-NPR-Z]{17}\b/g;
    const matches = text.match(vinPattern) || [];
    
    return matches.filter(match => this.isValidVin(match));
  }

  /**
   * Genera un resumen amigable de la información del vehículo
   * @param vehicleInfo Información del vehículo
   * @returns Resumen en texto
   */
  generateVehicleSummary(vehicleInfo: VehicleInfo): string {
    if (!vehicleInfo) return '';

    const parts = [];
    
    if (vehicleInfo.year) parts.push(vehicleInfo.year.toString());
    if (vehicleInfo.make) parts.push(vehicleInfo.make);
    if (vehicleInfo.model) parts.push(vehicleInfo.model);
    
    let summary = parts.join(' ');
    
    const details = [];
    if (vehicleInfo.engine) details.push(`Motor: ${vehicleInfo.engine}`);
    if (vehicleInfo.transmission) details.push(`Transmisión: ${vehicleInfo.transmission}`);
    if (vehicleInfo.fuelType) details.push(`Combustible: ${vehicleInfo.fuelType}`);
    
    if (details.length > 0) {
      summary += `\n${details.join(', ')}`;
    }
    
    return summary;
  }

  /**
   * Verifica si el servicio está disponible
   * @returns true si está disponible, false si no
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Obtiene información de configuración del servicio
   * @returns Información de configuración
   */
  getServiceInfo(): { available: boolean; apiConfigured: boolean } {
    return {
      available: this.isAvailable(),
      apiConfigured: !!this.apiKey
    };
  }
}

// Exportar instancia singleton
export const vinDecoderService = new VinDecoderService(); 