# AT_Frontend - Vue.js 3 + Vite

Frontend de **AniToki**, plataforma de streaming de anime construida con Vue.js 3, Composition API, Vue Router 4 y Vite 6. Sistema completo con autenticación JWT, gestión de perfiles múltiples, watchlist, reproducción de video HLS y panel de administración.

## Características

- ✅ **Autenticación JWT** con localStorage
- ✅ **Sistema multi-perfil** (hasta 4 perfiles por usuario)
- ✅ **Watchlist personalizada** por perfil con sincronización en tiempo real
- ✅ **Seguimiento de progreso** ("Continuar viendo" automático)
- ✅ **Reproductor de video** con soporte M3U8/HLS (HLS.js)
- ✅ **Panel de administración** para gestionar animes y episodios
- ✅ **Recuperación de contraseña** vía email
- ✅ **Búsqueda y filtros** de animes
- ✅ **Categorías** navegables
- ✅ **Responsive design** (mobile, tablet, desktop)
- ✅ **SPA routing** con Vue Router 4
- ✅ **Deployment en Render** Static Site

## Requisitos

- Node.js 18+ (recomendado 20.x)
- npm 9+ o pnpm 8+

## Instalación (Desarrollo Local)

### 1. Clonar el repositorio

```bash
git clone https://github.com/ialgar367/AT_Frontend.git
cd AT_Frontend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar `.env.example` a `.env`:

```bash
# Windows
copy .env.example .env

# Linux/macOS
cp .env.example .env
```

Editar `.env` para desarrollo local:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Para producción crear `.env.production`:

```env
VITE_API_BASE_URL=https://anitoki-backend.onrender.com
```

### 4. Ejecutar servidor de desarrollo

```bash
npm run dev
```

Servidor en: **http://127.0.0.1:5173/**

### 5. Build para producción

```bash
npm run build
```

Los archivos se generan en `dist/` incluyendo `404.html` para routing de SPA.

## Tecnologías

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Vue.js | 3.x | Framework reactivo |
| Vue Router | 4.x | Routing de SPA |
| Vite | 6.0.5 | Build tool y dev server |
| HLS.js | 1.6.16+ | Reproducción de video M3U8 |
| Axios | 1.7.x | (opcional) HTTP client |

## Estructura del Proyecto

```
AT_Frontend/
├── package.json                # Dependencias y scripts
├── vite.config.js             # Configuración de Vite
├── render.yaml                # Configuración para Render
├── .env.example               # Plantilla de variables de entorno
├── .env                       # Variables de desarrollo (ignorado por git)
├── .env.production            # Variables de producción
│
├── public/
│   └── profiles/              # Avatares de perfiles (profile1.png, ...)
│
└── src/
    ├── App.vue                # Componente raíz
    ├── main.js                # Punto de entrada
    ├── style.css              # Estilos globales
    │
    ├── components/
    │   ├── AnimeCard.vue             # Tarjeta de anime (thumbnail, título, etc.)
    │   └── ContinueWatchingCard.vue  # Tarjeta "Continuar viendo"
    │
    ├── composables/
    │   ├── useAuth.js         # Autenticación JWT (login, logout, user)
    │   ├── useProfile.js      # Gestión de perfiles (loadProfile, selectProfile)
    │   └── useWatchlist.js    # Watchlist (addToWatchlist, removeFromWatchlist)
    │
    ├── router/
    │   └── index.js           # Rutas y navigation guards
    │
    └── views/
        ├── Login.vue                  # Página de login
        ├── Register.vue               # Página de registro
        ├── RecuperarContraseña.vue    # Solicitar reset de password
        ├── ResetPassword.vue          # Confirmar nueva password
        ├── Home.vue                   # Página principal (listado de animes)
        ├── WatchAnime.vue             # Reproductor de video
        ├── Categories.vue             # Página de categorías
        │
        ├── manager/
        │   └── ChooseProfile.vue      # Selección de perfil
        │
        └── backoffice/                # Panel de administración
            ├── AdminDashboard.vue     # Dashboard principal
            ├── AddAnime.vue           # Agregar anime
            ├── EditAnime.vue          # Editar anime
            └── ManageEpisodes.vue     # Gestionar episodios
```

## Rutas

### Rutas Públicas (sin autenticación)

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | Redirect → `/login` | Redirección a login |
| `/login` | Login.vue | Iniciar sesión |
| `/register` | Register.vue | Registrarse |
| `/recuperar-contrasena` | RecuperarContraseña.vue | Solicitar reset de password |
| `/reset-password` | ResetPassword.vue | Confirmar nueva password (con token) |

### Rutas Autenticadas (requieren JWT token)

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/manager/profiles` | ChooseProfile.vue | Seleccionar perfil |
| `/home` | Home.vue | Página principal con listado de animes |
| `/watch/:animeSlug/:episodeNumber` | WatchAnime.vue | Reproductor de video |
| `/categories` | Categories.vue | Navegación por categorías |

### Rutas de Administración (requieren admin)

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/backoffice` | AdminDashboard.vue | Dashboard de admin |
| `/backoffice/add-anime` | AddAnime.vue | Agregar anime |
| `/backoffice/edit-anime/:id` | EditAnime.vue | Editar anime |
| `/backoffice/manage-episodes/:id` | ManageEpisodes.vue | Gestionar episodios |

## Composables

### useAuth.js

Maneja toda la autenticación JWT del frontend:

```javascript
import { useAuth } from '@/composables/useAuth'

const { 
  currentUser,          // Usuario autenticado
  isAuthenticated,      // Estado de autenticación
  login,                // (username, password) => Promise
  logout,               // () => void
  register,             // (username, email, password) => Promise
  authenticatedFetch    // (url, options) => Promise (añade Bearer token)
} = useAuth()

// Login
await login('usuario', 'password123')

// Registro
await register('nuevo', 'email@example.com', 'password')

// Logout
logout()

// Fetch con JWT automático
const response = await authenticatedFetch('/api/manager/profiles/')
```

**Funcionalidades:**
- Guarda tokens (`access` y `refresh`) en `localStorage`
- Auto-refresca el token `access` cuando expira (60 min)
- Proporciona `authenticatedFetch` que añade automáticamente header `Authorization: Bearer {token}`

### useProfile.js

Gestiona el sistema multi-perfil:

```javascript
import { useProfile } from '@/composables/useProfile'

const { 
  currentProfile,       // Perfil actualmente seleccionado
  selectProfile,        // (profileId, remember) => void
  loadProfile,          // () => Promise
  clearProfile          // () => void
} = useProfile()

// Seleccionar perfil
selectProfile(1, true) // true = recordar en localStorage

// Cargar perfil actual
await loadProfile()

// Limpiar perfil (logout)
clearProfile()
```

**Funcionalidades:**
- Guarda perfil seleccionado en `localStorage` (si remember=true) o `sessionStorage`
- Carga datos del perfil desde la API
- Se usa como contexto para watchlist y progreso

### useWatchlist.js

Gestiona la watchlist del perfil actual:

```javascript
import { useWatchlist } from '@/composables/useWatchlist'

const { 
  watchlistAnimes,      // Array de animes en watchlist
  loadWatchlist,        // () => Promise
  addToWatchlist,       // (animeId) => Promise
  removeFromWatchlist,  // (animeId) => Promise
  isInWatchlist         // (animeId) => boolean
} = useWatchlist()

// Cargar watchlist
await loadWatchlist()

// Agregar anime
await addToWatchlist(6) // One Piece

// Eliminar anime
await removeFromWatchlist(6)

// Verificar si está en watchlist
if (isInWatchlist(6)) {
  console.log('One Piece está en tu watchlist')
}
```

**Funcionalidades:**
- Todos los métodos incluyen automáticamente `profile_id` del perfil actual
- Cache en memoria para evitar llamadas innecesarias
- Sincronización con backend vía API REST

## Componentes Principales

### AnimeCard.vue

Tarjeta de anime reutilizable:

```vue
<template>
  <AnimeCard :anime="anime" @click="goToWatch" />
</template>

<script setup>
import AnimeCard from '@/components/AnimeCard.vue'

const anime = {
  id: 6,
  title: 'One Piece',
  thumbnail: 'https://...',
  anime_slug: 'one-piece',
  episode_count: 50
}
</script>
```

**Props:**
- `anime` (Object): Datos del anime

**Características:**
- Thumbnail con lazy loading
- Título y detalles
- Hover effect

### ContinueWatchingCard.vue

Tarjeta "Continuar viendo":

```vue
<template>
  <ContinueWatchingCard :anime="anime" :progress="progress" />
</template>

<script setup>
const progress = {
  current_episode: 5,
  watched: false
}
</script>
```

**Props:**
- `anime` (Object): Datos del anime
- `progress` (Object): Progreso de visualización

**Características:**
- Muestra episodio actual
- Botón "Continuar viendo"
- Barra de progreso

## Reproductor de Video

El componente `WatchAnime.vue` usa **HLS.js** para reproducir videos M3U8:

```javascript
import Hls from 'hls.js'

if (Hls.isSupported()) {
  const hls = new Hls()
  hls.loadSource('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8')
  hls.attachMedia(videoElement)
} else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
  // Safari nativo
  videoElement.src = url
}
```

**Funcionalidades:**
- Reproducción de archivos M3U8 (HLS)
- Controles nativos del navegador
- Descripción y detalles del episodio
- Navegación entre episodios
- Botón "Continuar viendo" si hay progreso previo
- Actualización automática de progreso

## Autenticación y Guards

### Navigation Guards (router/index.js)

```javascript
router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth()
  const { currentUser } = useAuth()

  // Rutas públicas
  if (to.meta.public) {
    return next()
  }

  // Requiere autenticación
  if (!isAuthenticated.value) {
    return next('/login')
  }

  // Requiere admin
  if (to.meta.requiresAdmin && currentUser.value?.username !== 'admin') {
    return next('/home')
  }

  next()
})
```

**Meta campos:**
- `public: true` - Ruta pública (login, register)
- `requiresAuth: true` - Requiere JWT token (default)
- `requiresAdmin: true` - Solo usuario `admin`

## Deployment en Render

### URLs del Proyecto

- **Frontend**: https://anitoki-frontend.onrender.com
- **Backend API**: https://anitoki-backend.onrender.com
- **GitHub Frontend**: https://github.com/ialgar367/AT_Frontend

### Configuración

**render.yaml:**
```yaml
services:
  - type: web
    name: anitoki-frontend
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

**package.json build script:**
```json
{
  "scripts": {
    "build": "vite build && node -e \"require('fs').copyFileSync('dist/index.html', 'dist/404.html')\"
  }
}
```

El script crea `404.html` (copia de `index.html`) para que Render redirija todas las rutas a la aplicación Vue.

**Variables de Entorno en Render:**
```env
VITE_API_BASE_URL=https://anitoki-backend.onrender.com
```

### Limitaciones Free Tier

- **Static Site**: Gratis permanente
- **Bandwidth**: 100GB/mes gratis
- **Deploy**: Automático al hacer push a GitHub

### F5 Refresh (SPA Routing)

Render Static Sites necesitan configuración especial para SPAs:

1. **404.html** → Copia de index.html (para que Render sirva la app en rutas no existentes)
2. **render.yaml** → Rewrite rules (redirecciona todas las rutas a index.html)

Sin esto, refrescar la página (F5) en `/home` o `/watch/...` daría error 404.

## Desarrollo

### Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview de build
npm run preview

# Linting (si se configura)
npm run lint
```

### Agregar Nueva Vista

1. Crear archivo en `src/views/NuevaVista.vue`
2. Registrar ruta en `src/router/index.js`:

```javascript
{
  path: '/nueva-ruta',
  component: () => import('@/views/NuevaVista.vue'),
  meta: { requiresAuth: true }
}
```

### Agregar Nuevo Composable

1. Crear archivo en `src/composables/useNuevo.js`
2. Exportar función composable:

```javascript
import { ref } from 'vue'

export function useNuevo() {
  const data = ref(null)
  
  const loadData = async () => {
    // lógica
  }
  
  return {
    data,
    loadData
  }
}
```

## Estilos

- **CSS Puro** con variables CSS
- **Tema oscuro** por defecto
- **Color principal**: Púrpura (`#812e96`)
- **Responsive**: Mobile-first approach

Estilos globales en `src/style.css`:

```css
:root {
  --primary-color: #812e96;
  --bg-color: #0a0a0a;
  --text-color: #ffffff;
}
```

## Responsive

La aplicación está optimizada para:
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

Breakpoints en CSS:

```css
/* Mobile */
@media (max-width: 768px) {
  /* ... */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1024px) {
  /* ... */
}

/* Desktop */
@media (min-width: 1024px) {
  /* ... */
}
```

## Workflow de Git

```bash
# Desarrollo local
git checkout -b feature/nueva-funcionalidad
# ... hacer cambios ...
git add .
git commit -m "feat: descripción"
git push origin feature/nueva-funcionalidad

# Merge a main
git checkout main
git merge feature/nueva-funcionalidad
git push origin main
# Render auto-despliega al detectar push a main
```

## Mejoras Futuras

- [ ] Implementar Pinia para state management global
- [ ] Agregar Vitest para tests unitarios
- [ ] Implementar Cypress/Playwright para E2E tests
- [ ] Sistema de notificaciones en tiempo real
- [ ] Modo oscuro/claro (toggle)
- [ ] Soporte multi-idioma (i18n)
- [ ] Lazy loading de rutas y componentes
- [ ] PWA (Progressive Web App)
- [ ] Optimización de imágenes (WebP)
- [ ] Sistema de comentarios/ratings

## Licencia

Proyecto de fin de curso - AniToki 2026

## Autor

**Izan Algar** - [@ialgar367](https://github.com/ialgar367)
**Juan Gonzalez** - [@JuanGonzalez759](https://github.com/JuanGonzalez759)