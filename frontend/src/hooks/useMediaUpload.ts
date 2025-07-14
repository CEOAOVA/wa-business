import { useState, useCallback } from 'react';

interface UseMediaUploadOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  apiBaseUrl?: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  data?: any;
}

export const useMediaUpload = (options: UseMediaUploadOptions = {}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const { onSuccess, onError, apiBaseUrl = 'http://localhost:3002' } = options;

  const uploadFile = useCallback(async (file: File): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiBaseUrl}/api/media/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result: UploadResult = await response.json();
      
      if (result.success) {
        setResult(result);
        onSuccess?.(result);
      } else {
        throw new Error(result.message || 'Error desconocido');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Error subiendo archivo';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [apiBaseUrl, onSuccess, onError]);

  const uploadAndSend = useCallback(async (
    file: File, 
    to: string, 
    caption?: string
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('to', to);
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch(`${apiBaseUrl}/api/media/upload-and-send`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result: UploadResult = await response.json();
      
      if (result.success) {
        setResult(result);
        onSuccess?.(result);
      } else {
        throw new Error(result.message || 'Error desconocido');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Error subiendo y enviando archivo';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [apiBaseUrl, onSuccess, onError]);

  const downloadFile = useCallback(async (mediaUrl: string, filename: string) => {
    try {
      const response = await fetch(mediaUrl);
      
      if (!response.ok) {
        throw new Error(`Error descargando archivo: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const errorMessage = err.message || 'Error descargando archivo';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  const getSupportedTypes = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/media/types`);
      
      if (!response.ok) {
        throw new Error(`Error obteniendo tipos soportados: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Error obteniendo tipos soportados';
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [apiBaseUrl, onError]);

  const getStorageStats = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/media/stats`);
      
      if (!response.ok) {
        throw new Error(`Error obteniendo estadísticas: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Error obteniendo estadísticas';
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [apiBaseUrl, onError]);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setUploadProgress(0);
  }, []);

  return {
    // Estado
    isUploading,
    uploadProgress,
    error,
    result,
    
    // Funciones
    uploadFile,
    uploadAndSend,
    downloadFile,
    getSupportedTypes,
    getStorageStats,
    reset,
  };
}; 