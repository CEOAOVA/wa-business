# Embler Frontend

Frontend unificado para el sistema de WhatsApp Business con chatbot IA.

## 🎨 Paleta de Colores

- **Amarillo Principal**: `#FFD600`
- **Amarillo Claro**: `#FFE55C`
- **Amarillo Oscuro**: `#E6C200`
- **Negro Principal**: `#0A0A0A`
- **Negro Oscuro**: `#000000`
- **Gris**: `#1A1A1A`
- **Gris Claro**: `#2A2A2A`

## 🚀 Tecnologías

- **React 19** con TypeScript
- **Vite** para desarrollo rápido
- **Tailwind CSS** con configuración personalizada
- **Framer Motion** para animaciones
- **Zustand** para manejo de estado
- **Socket.io** para comunicación en tiempo real
- **Axios** para APIs

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
├── pages/              # Páginas de la aplicación
├── services/           # Servicios de API
├── hooks/              # Custom hooks
├── context/            # Contextos de React
├── stores/             # Stores de Zustand
├── types/              # Tipos TypeScript
├── utils/              # Utilidades
├── constants/          # Constantes
├── chatbot/            # Lógica del chatbot
└── assets/             # Recursos estáticos
```

## 🛠️ Scripts Disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run lint` - Ejecutar ESLint
- `npm run preview` - Vista previa de producción

## 🎯 Características Principales

- **Chat en tiempo real** con WhatsApp Business
- **Chatbot IA** integrado
- **Subida de medios** (imágenes, audio, documentos)
- **Interfaz moderna** con glassmorphism
- **Responsive design**
- **Animaciones fluidas**

## 🔧 Configuración

1. Instalar dependencias: `npm install`
2. Configurar variables de entorno (ver `env.example`)
3. Ejecutar: `npm run dev`

## 🐳 Docker

```bash
# Construir imagen
docker build -t embler-frontend .

# Ejecutar contenedor
docker run -p 80:80 embler-frontend
```
