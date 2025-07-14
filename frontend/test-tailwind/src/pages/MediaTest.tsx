import React, { useState, useEffect } from 'react';
import { Upload, Download, FileText, BarChart3, Trash2, RefreshCw } from 'lucide-react';
import MediaUpload from '../components/MediaUpload';
import MediaMessage from '../components/MediaMessage';
import { useMediaUpload } from '../hooks/useMediaUpload';

const MediaTest: React.FC = () => {
  const [testMessages, setTestMessages] = useState<any[]>([]);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [supportedTypes, setSupportedTypes] = useState<any>(null);
  const [testContactId, setTestContactId] = useState('test-contact-123');
  const [showUpload, setShowUpload] = useState(false);

  const {
    isUploading,
    error,
    result,
    uploadFile,
    uploadAndSend,
    downloadFile,
    getSupportedTypes,
    getStorageStats,
    reset
  } = useMediaUpload({
    onSuccess: (result) => {
      console.log('✅ Upload exitoso:', result);
      // Agregar mensaje de prueba
      if (result.data) {
        const newMessage = {
          id: Date.now().toString(),
          type: result.data.whatsappMedia?.mimetype?.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
          mediaUrl: result.data.localFile?.url || '',
          mediaCaption: '',
          content: result.data.localFile?.originalName || 'Archivo multimedia',
          timestamp: new Date(),
          isOwn: true
        };
        setTestMessages(prev => [...prev, newMessage]);
      }
      loadStorageStats();
    },
    onError: (error) => {
      console.error('❌ Error en upload:', error);
    }
  });

  const loadStorageStats = async () => {
    const stats = await getStorageStats();
    setStorageStats(stats);
  };

  const loadSupportedTypes = async () => {
    const types = await getSupportedTypes();
    setSupportedTypes(types);
  };

  useEffect(() => {
    loadStorageStats();
    loadSupportedTypes();
  }, []);

  const handleUpload = async (file: File) => {
    try {
      await uploadFile(file);
    } catch (error) {
      console.error('Error en upload:', error);
    }
  };

  const handleUploadAndSend = async (file: File, caption?: string) => {
    try {
      await uploadAndSend(file, testContactId, caption);
    } catch (error) {
      console.error('Error en upload y envío:', error);
    }
  };

  const handleDownload = async (mediaUrl: string, filename: string) => {
    try {
      await downloadFile(mediaUrl, filename);
    } catch (error) {
      console.error('Error en descarga:', error);
    }
  };

  const clearTestMessages = () => {
    setTestMessages([]);
  };

  const addTestMessage = (type: string) => {
    const message = {
      id: Date.now().toString(),
      type: type,
      mediaUrl: type === 'IMAGE' ? 'https://via.placeholder.com/300x200' : undefined,
      mediaCaption: type === 'IMAGE' ? 'Imagen de prueba' : undefined,
      content: `Mensaje de prueba ${type}`,
      timestamp: new Date(),
      isOwn: Math.random() > 0.5
    };
    setTestMessages(prev => [...prev, message]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Sistema Multimedia - Pruebas
            </h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Upload className="mr-2 h-4 w-4" />
                {showUpload ? 'Ocultar' : 'Mostrar'} Upload
              </button>
              <button
                onClick={loadStorageStats}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </button>
            </div>
          </div>

          {/* Estado del sistema */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm font-medium">Estado del Sistema</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Uploading:</span>
                  <span className={isUploading ? 'text-orange-500' : 'text-green-500'}>
                    {isUploading ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Último resultado:</span>
                  <span className={result ? 'text-green-500' : 'text-gray-400'}>
                    {result ? 'Exitoso' : 'Ninguno'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-purple-500 mr-2" />
                <span className="text-sm font-medium">Estadísticas</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {storageStats ? (
                  <>
                    <div className="flex justify-between">
                      <span>Archivos:</span>
                      <span>{storageStats.storage?.totalFiles || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tamaño:</span>
                      <span>{storageStats.formattedSize || '0 MB'}</span>
                    </div>
                  </>
                ) : (
                  <span className="text-gray-400">Cargando...</span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Download className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm font-medium">Tipos Soportados</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {supportedTypes ? (
                  <>
                    <div className="flex justify-between">
                      <span>Imágenes:</span>
                      <span>{supportedTypes.supportedTypes?.images?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Documentos:</span>
                      <span>{supportedTypes.supportedTypes?.documents?.length || 0}</span>
                    </div>
                  </>
                ) : (
                  <span className="text-gray-400">Cargando...</span>
                )}
              </div>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex items-center">
                <span className="text-red-600 font-medium">Error:</span>
                <span className="ml-2 text-red-600">{error}</span>
                <button
                  onClick={reset}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de Upload */}
          {showUpload && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Upload de Archivos</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID de Contacto de Prueba
                </label>
                <input
                  type="text"
                  value={testContactId}
                  onChange={(e) => setTestContactId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ID del contacto para pruebas"
                />
              </div>
              <MediaUpload
                onUpload={handleUpload}
                onUploadAndSend={handleUploadAndSend}
                isUploading={isUploading}
                contactId={testContactId}
              />
            </div>
          )}

          {/* Panel de Pruebas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Mensajes de Prueba</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => addTestMessage('IMAGE')}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  + Imagen
                </button>
                <button
                  onClick={() => addTestMessage('DOCUMENT')}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  + Documento
                </button>
                <button
                  onClick={() => addTestMessage('AUDIO')}
                  className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                >
                  + Audio
                </button>
                <button
                  onClick={clearTestMessages}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {testMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay mensajes de prueba.
                  <br />
                  Sube un archivo o crea mensajes de prueba.
                </div>
              ) : (
                testMessages.map((message) => (
                  <MediaMessage
                    key={message.id}
                    message={message}
                    onDownload={handleDownload}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Información detallada */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Información del Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Tipos de Archivo Soportados</h3>
              {supportedTypes && (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Imágenes:</span>
                    <div className="text-gray-600 ml-2">
                      {supportedTypes.supportedTypes?.images?.join(', ')}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Videos:</span>
                    <div className="text-gray-600 ml-2">
                      {supportedTypes.supportedTypes?.videos?.join(', ')}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Audio:</span>
                    <div className="text-gray-600 ml-2">
                      {supportedTypes.supportedTypes?.audio?.join(', ')}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Documentos:</span>
                    <div className="text-gray-600 ml-2">
                      {supportedTypes.supportedTypes?.documents?.slice(0, 3).join(', ')}
                      {supportedTypes.supportedTypes?.documents?.length > 3 && '...'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-2">Límites del Sistema</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tamaño máximo de archivo:</span>
                  <span className="font-medium">16 MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Archivos por upload:</span>
                  <span className="font-medium">1</span>
                </div>
                <div className="flex justify-between">
                  <span>Formatos soportados:</span>
                  <span className="font-medium">
                    {supportedTypes ? 
                      Object.values(supportedTypes.supportedTypes || {}).reduce((acc: number, arr: any) => acc + arr.length, 0) : 
                      'Cargando...'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaTest; 