import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

// Extensiones de tipos para Express
declare global {
  namespace Express {
    interface Request {
      params: any;
      query: any;
      body: any;
    }
    
    interface Response {
      status(code: number): Response;
      json(data: any): Response;
      send(data: any): Response;
      sendFile(path: string): void;
      redirect(url: string): void;
    }
  }
}

// Re-exportar tipos para uso en el proyecto
export { Request, Response } from 'express'; 