# AT_Frontend - Vue 3 Application

Frontend de Anitoki construido con Vue 3, Vue Router y Vite.

## Requisitos

- Node.js 18+ y npm

### Instalación de Node.js

**Windows:**
- Descargar desde: https://nodejs.org/

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install -y nodejs npm
```

**macOS:**
```bash
brew install node
```

## Instalación

```bash
npm install
```

## Ejecución

### Modo desarrollo

```bash
npm run dev
```

Aplicación en: **http://127.0.0.1:5173/**

### Build de producción

```bash
npm run build
```

Los archivos se generan en `dist/`

### Preview de producción

```bash
npm run preview
```

## Estructura

```
AT_Frontend/
├── package.json
├── vite.config.js
├── public/
│   └── profiles/
└── src/
    ├── App.vue
    ├── main.js
    ├── style.css
    ├── components/
    │   └── AnimeCard.vue
    ├── composables/
    │   └── useAuth.js
    ├── router/
    │   └── index.js
    └── views/
        ├── Login.vue
        ├── Register.vue
        ├── Home.vue
        ├── manager/
        │   └── ChooseProfile.vue
        └── backoffice/
            ├── AdminDashboard.vue
            └── AddAnime.vue
```

## Rutas

### Públicas
- `/login` - Página de login
- `/register` - Página de registro

### Requiere Autenticación
- `/home` - Página principal
- `/manager/profiles` - Selección de perfiles

### Requiere Admin
- `/backoffice` - Dashboard de administración
- `/backoffice/add-anime` - Agregar anime

```bash
npm run preview
```

## 📁 Estructura

```
AT_Frontend/
├── package.json
├── vite.config.js          # Configuración de Vite con proxy
├── .env.example            # Variables de entorno de ejemplo
├── Dockerfile              # Para Docker
├── public/
│   └── profiles/           # Avatares de perfiles
└── src/
    ├── App.vue             # Componente raíz
    ├── main.js             # Punto de entrada
    ├── style.css           # Estilos globales
    ├── components/
    │   └── AnimeCard.vue   # Tarjeta de anime
    ├── composables/
    │   └── useAuth.js      # Lógica de autenticación
    ├── router/
    │   └── index.js        # Rutas y guards
    └── views/
        ├── Login.vue
        ├── Register.vue
        ├── Home.vue
        ├── manager/
        │   └── ChooseProfile.vue
        └── backoffice/
            ├── AdminDashboard.vue
            └── AddAnime.vue
```

## 🛣️ Rutas

### Públicas
- `/` → Redirige a `/login`
- `/login` → Página de login
- `/register` → Página de registro

### Requiere Autenticación
- `/home` → Página principal
- `/manager/profiles` → Selección de perfiles

### Requiere Admin
- `/backoffice` → Dashboard de administración
- `/backoffice/add-anime` → Agregar nuevo anime

## 🔐 Autenticación

El composable `useAuth` maneja toda la autenticación:

```javascript
import { useAuth } from '@/composables/useAuth'

const { currentUser, login, logout, register } = useAuth()

// Login
await login('username', 'password')

// Registro
await register('username', 'email', 'password')

// Logout
await logout()

// Usuario actual
console.log(currentUser.value)
```

## 🔧 Configuración

### Variables de Entorno

Copiar `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

### Proxy de Vite

El archivo `vite.config.js` está configurado para hacer proxy de `/api` al backend:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
    },
  },
}
```

Esto permite hacer peticiones a `/api/auth/login/` desde el frontend sin problemas de CORS.

## 🎨 Estilos

- Framework CSS: **Tailwind CSS** (utility-first)
- Animaciones personalizadas en componentes
- Tema oscuro por defecto
- Color principal: Púrpura (`#812e96`)

## 📱 Responsive

La aplicación está optimizada para:
- Desktop (1920px+)
- Tablet (768px+)
- Mobile (320px+)

## 🐳 Docker

Ver [DOCKER_GUIDE.md](../DOCKER_GUIDE.md) en la raíz del proyecto.

Inicio rápido:

```bash
cd ..
docker-compose up
```

## 🔨 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview de build
npm run preview

# Linting (si lo configuras)
npm run lint

# Formateo con Prettier (si lo configuras)
npm run format
```

## 🚀 Mejoras Futuras Sugeridas

- [ ] Agregar Pinia para state management global
- [ ] Implementar Vitest para tests unitarios
- [ ] Agregar Cypress para tests E2E
- [ ] Implementar i18n para múltiples idiomas
- [ ] Lazy loading de rutas
- [ ] Progressive Web App (PWA)
- [ ] Optimización de imágenes
- [ ] Sistema de notificaciones

## 📝 Convenciones de Código

- Componentes en PascalCase: `AnimeCard.vue`
- Composables en camelCase: `useAuth.js`
- Estilos scoped en componentes
- Props con validación de tipos
- Eventos con nombres descriptivos

## 🌐 Navegadores Soportados

- Chrome/Edge (últimas 2 versiones)
- Firefox (últimas 2 versiones)
- Safari (últimas 2 versiones)

## 🤝 Conectando con el Backend

El frontend se comunica con el backend a través de:

1. **Autenticación**: Sesiones de Django con cookies
2. **CSRF**: Tokens CSRF en cada petición POST
3. **CORS**: Configurado en el backend para permitir localhost:5173
4. **Proxy**: Vite proxy para evitar problemas de CORS en desarrollo

Asegúrate de que el backend esté corriendo antes de iniciar el frontend.
├── vite.config.js           # Configuración Vite + proxy
├── index.html
└── src/
    ├── main.js              # Entry point
    ├── App.vue              # Componente raíz
    ├── style.css            # Estilos globales
    ├── router/
    │   └── index.js         # Vue Router + guards
    ├── views/               # Páginas
    │   ├── Login.vue        # Página login
    │   ├── Register.vue     # Página registro
    │   └── Home.vue         # Panel principal
    └── composables/
        └── useAuth.js       # Composable autenticación
```

## Rutas

- `/` - Redirige a `/login`
- `/login` - Página de login (requiere guest)
- `/register` - Página de registro (requiere guest)
- `/home` - Panel principal (requiere autenticación)

## Composables

### useAuth

Composable para gestionar autenticación:

```javascript
import { useAuth } from './composables/useAuth'

const { currentUser, login, register, logout, loadCurrentUser } = useAuth()
```

**Métodos:**
- `loadCurrentUser()` - Carga usuario actual desde API
- `register(username, email, password)` - Registra nuevo usuario
- `login(username, password)` - Inicia sesión
- `logout()` - Cierra sesión

**Estado:**
- `currentUser` - Objeto ref con datos del usuario o null

## Configuración del proxy

Vite está configurado para hacer proxy de `/api` al backend Django:

```javascript
// vite.config.js
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
}
```

Esto permite hacer llamadas a `/api/...` desde Vue sin problemas de CORS.

## Dependencias principales

- Vue 3.5+
- Vue Router 4.5+
- Vite 6.0+

## Notas de desarrollo

El frontend consume la API del backend Django. Asegúrate de que el backend esté corriendo en `http://127.0.0.1:8000` antes de iniciar el frontend.
