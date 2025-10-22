# Recomiéndame Coach - Mobile App

Aplicación móvil React Native para conectar con el backend de Recomiéndame Coach.

## Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar la URL del backend
Edita el archivo `config/api.ts` y cambia la URL base según tu entorno:

```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:3000'  // Tu backend local
    : 'https://tu-backend-produccion.com', // Tu backend en producción
};
```

### 3. Ejecutar la aplicación
```bash
# Iniciar el servidor de desarrollo
npm start

# Para iOS
npm run ios

# Para Android
npm run android

# Para web
npm run web
```

## Estructura del proyecto

```
├── config/          # Configuración de la API
├── contexts/        # Contextos de React (AuthContext)
├── hooks/           # Hooks personalizados
├── screens/         # Pantallas de la aplicación
├── services/        # Servicios para comunicarse con la API
├── types/           # Tipos TypeScript
└── assets/          # Recursos (imágenes, iconos)
```

## Funcionalidades implementadas

### ✅ Autenticación
- Login de usuarios
- Manejo de tokens JWT
- Persistencia de sesión con AsyncStorage

### ✅ Gestión de Coaches
- Listado de coaches disponibles
- Información detallada de cada coach
- Sistema de calificaciones

### 🚧 Próximas funcionalidades
- Registro de usuarios
- Búsqueda y filtros de coaches
- Reserva de sesiones
- Recomendaciones personalizadas
- Perfil de usuario
- Chat en tiempo real

## Servicios disponibles

### AuthService
- `login()` - Iniciar sesión
- `register()` - Registrar usuario
- `logout()` - Cerrar sesión
- `getProfile()` - Obtener perfil del usuario

### CoachService
- `getAllCoaches()` - Obtener todos los coaches
- `getCoachById()` - Obtener coach por ID
- `searchCoaches()` - Buscar coaches con filtros
- `getRecommendations()` - Obtener recomendaciones

### SessionService
- `getUserSessions()` - Obtener sesiones del usuario
- `bookSession()` - Reservar una sesión
- `cancelSession()` - Cancelar sesión
- `completeSession()` - Completar sesión

## Configuración del backend

Asegúrate de que tu backend esté ejecutándose y tenga habilitado CORS para permitir conexiones desde la aplicación móvil.

## Notas importantes

1. **Desarrollo local**: Si estás probando en un dispositivo físico, cambia `localhost` por la IP de tu computadora en `config/api.ts`

2. **CORS**: Asegúrate de que tu backend tenga configurado CORS correctamente

3. **Tokens**: Los tokens JWT se almacenan automáticamente en AsyncStorage y se incluyen en todas las peticiones autenticadas