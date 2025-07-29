export interface CarData {
  marca?: string;
  modelo?: string;
  año?: number;
  litraje?: string;
}

export interface ProductMatch {
  clave: string;
  nombre: string;
  confidence: number;
  carCompatibility: boolean;
  marca?: string;
  modelo?: string;
  año?: string;
}

export interface ProductDetails {
  pieza: string;
  nombre?: string;
  marca?: string;
  modelo?: string;
  año?: string;
  precio?: number;
  stock?: number;
  descripcion?: string;
  compatibilidad?: string[];
}

export interface SearchResult {
  normalizedTerm: string;
  matches: ProductMatch[];
  totalFound: number;
  searchTime: number;
  hasExactMatch: boolean;
  suggestions?: string[];
}

export interface ConfirmationResult {
  confirmed: boolean;
  selectedProduct?: ProductMatch;
  nextStep: 'show_details' | 'search_again' | 'suggest_alternatives';
}

export interface ProductSearchFlow {
  step: 'normalize' | 'search' | 'confirm' | 'details' | 'complete';
  userTerm: string;
  normalizedTerm?: string;
  carData?: CarData;
  searchResults?: SearchResult;
  selectedProduct?: ProductMatch;
  productDetails?: ProductDetails;
  error?: string;
}

export interface ProductSearchOptions {
  limit?: number;
  includeInactive?: boolean;
  requireExactMatch?: boolean;
  minConfidence?: number;
}