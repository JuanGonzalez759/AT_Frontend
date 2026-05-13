<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProfile } from '../composables/useProfile'
import AnimeCard from '../components/AnimeCard.vue'

const router = useRouter()
const { currentUser, logout, loadCurrentUser } = useAuth()
const { currentProfile, loadProfile } = useProfile()

// Mobile menu
const mobileMenuOpen = ref(false)

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const dropdownOpen = ref(false)
const selectedCategory = ref('all')
const allAnimes = ref([])
const isLoading = ref(true)
const selectedType = ref('all')
const selectedStatus = ref('all')
const selectedYear = ref('all')
const sortBy = ref('rating')

const categories = [
  { id: 'all', name: 'Todos', gradient: 'from-purple-500 to-pink-500' },
  { id: 'action', name: 'Acción', gradient: 'from-red-500 to-orange-500' },
  { id: 'adventure', name: 'Aventura', gradient: 'from-green-500 to-teal-500' },
  { id: 'comedy', name: 'Comedia', gradient: 'from-yellow-500 to-orange-400' },
  { id: 'drama', name: 'Drama', gradient: 'from-indigo-500 to-purple-500' },
  { id: 'fantasy', name: 'Fantasía', gradient: 'from-purple-600 to-blue-500' },
  { id: 'romance', name: 'Romance', gradient: 'from-pink-500 to-rose-500' },
  { id: 'sci-fi', name: 'Ciencia Ficción', gradient: 'from-cyan-500 to-blue-600' },
  { id: 'thriller', name: 'Thriller', gradient: 'from-gray-700 to-gray-900' },
  { id: 'horror', name: 'Horror', gradient: 'from-red-900 to-black' },
  { id: 'mystery', name: 'Misterio', gradient: 'from-purple-900 to-indigo-900' },
  { id: 'sports', name: 'Deportes', gradient: 'from-green-600 to-emerald-500' },
  { id: 'slice-of-life', name: 'Slice of Life', gradient: 'from-lime-500 to-green-400' },
  { id: 'supernatural', name: 'Sobrenatural', gradient: 'from-violet-600 to-purple-700' },
]

const filteredAnimes = computed(() => {
  let filtered = allAnimes.value

  // Filtrar por categoría
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(anime => {
      const genre = anime.genre?.toLowerCase() || ''
      const category = selectedCategory.value.toLowerCase()
      
      const categoryMap = {
        'action': ['action', 'acción'],
        'adventure': ['adventure', 'aventura'],
        'comedy': ['comedy', 'comedia'],
        'drama': ['drama'],
        'fantasy': ['fantasy', 'fantasía'],
        'romance': ['romance'],
        'sci-fi': ['sci-fi', 'science fiction', 'ciencia ficción'],
        'thriller': ['thriller', 'suspense'],
        'horror': ['horror', 'terror'],
        'mystery': ['mystery', 'misterio'],
        'sports': ['sports', 'deportes'],
        'slice-of-life': ['slice of life', 'vida cotidiana'],
        'supernatural': ['supernatural', 'sobrenatural']
      }
      
      const genres = categoryMap[category] || [category]
      return genres.some(g => genre.includes(g))
    })
  }

  // Ordenar
  if (sortBy.value === 'rating') {
    filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0))
  } else if (sortBy.value === 'recent') {
    filtered = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } else if (sortBy.value === 'title') {
    filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title))
  }

  return filtered
})

const animeCount = computed(() => {
  return filteredAnimes.value.length
})

async function loadAnimes() {
  isLoading.value = true
  try {
    const response = await fetch('/api/backoffice/public/animes/?page_size=100', {
      credentials: 'include'
    })
    if (response.ok) {
      const data = await response.json()
      const animes = data.results || data
      
      allAnimes.value = animes.map(anime => ({
        animeId: anime.id,
        title: anime.title,
        subtitle: `${anime.year} • ${anime.genre}`,
        genre: anime.genre,
        image: anime.cover_image,
        episodeCount: anime.episode_count || 0,
        audioType: anime.audio_type || 'SUB',
        ageRating: anime.age_rating,
        isSimulcast: anime.is_simulcast,
        rating: anime.rating,
        created_at: anime.created_at,
        progress: 0,
        isDemoContent: anime.id !== 6, // One Piece (ID 6) es el único licenciado
        contentType: anime.content_type || 'SERIE'
      }))
    }
  } catch (error) {
    console.error('Error loading animes:', error)
  } finally {
    isLoading.value = false
  }
}

async function handleLogout() {
  try {
    await logout()
    router.push('/login')
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  }
}

onMounted(async () => {
  const user = await loadCurrentUser()
  if (!user) {
    router.push('/login')
    return
  }
  await loadProfile()
  await loadAnimes()
})
</script>

<template>
  <div class="categories-container">
    <!-- Header estilo Crunchyroll -->
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo" @click="router.push('/home')" />
          <nav class="nav-links">
            <a @click="router.push('/categories')" class="nav-link" style="cursor: pointer;">Explorar</a>
            <a @click="router.push('/analytics')" class="nav-link" style="cursor: pointer;">Analytics</a>
          </nav>
        </div>
        <div class="header-right">
          <!-- Hamburger menu button (mobile) -->
          <button class="btn-hamburger" @click="toggleMobileMenu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <button class="btn-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
          
          <button 
            v-if="currentUser?.username === 'admin'" 
            @click="router.push('/backoffice')" 
            class="btn-admin"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Gestión
          </button>
          
          <button class="btn-watchlist" @click="router.push('/my-list')">Mi Lista</button>
          
          <div v-if="currentUser" class="user-controls">
            <button @click="router.push('/manager/profiles')" class="btn-profile">
              <img v-if="currentProfile?.avatar" :src="currentProfile.avatar" :alt="currentProfile.name" class="profile-avatar" />
              <span v-else>{{ currentUser.username.charAt(0).toUpperCase() }}</span>
            </button>
            <button class="btn-logout" @click="handleLogout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Navigation Menu -->
      <div class="mobile-menu" :class="{ open: mobileMenuOpen }">
        <div class="mobile-menu-header">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo" />
          <button class="btn-close" @click="toggleMobileMenu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <nav class="mobile-nav-links">
          <a @click="router.push('/categories'); toggleMobileMenu()" class="mobile-nav-link">Explorar</a>
          <a @click="router.push('/analytics'); toggleMobileMenu()" class="mobile-nav-link">Analytics</a>
          <a @click="router.push('/my-list'); toggleMobileMenu()" class="mobile-nav-link">Mi Lista</a>
          <a v-if="currentUser?.username === 'admin'" @click="router.push('/backoffice'); toggleMobileMenu()" class="mobile-nav-link">Gestión</a>
        </nav>
        <div class="mobile-menu-footer">
          <button v-if="currentUser" @click="handleLogout; toggleMobileMenu()" class="btn-logout-mobile">
            Cerrar Sesión
          </button>
        </div>
      </div>
      <div v-if="mobileMenuOpen" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
    </header>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">Explora por Categorías</h1>
        <p class="hero-subtitle">Descubre nuevos animes por género y encuentra tu próxima serie favorita</p>
      </div>
    </section>

    <!-- Categories Dropdown -->
    <section class="categories-section">
      <div class="dropdown-static">
        <button class="dropdown-toggle" @click="dropdownOpen = !dropdownOpen">
          <span class="dropdown-label">GÉNEROS</span>
          <svg class="dropdown-arrow" width="16" height="16" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" fill="none"/></svg>
        </button>
        <transition name="fade-slide">
          <div v-if="dropdownOpen" class="dropdown-menu-horizontal-static">
            <div class="categories-horizontal">
              <button
                v-for="category in categories"
                :key="category.id"
                class="category-horizontal-btn"
                :class="{ active: selectedCategory === category.id }"
                @click.stop="selectedCategory = category.id; dropdownOpen = false"
              >
                {{ category.name }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </section>
  

    <!-- Filters Bar -->
    <section class="filters-section">
      <div class="filters-content">
        <div class="filter-left">
          <h2 class="section-title">
            {{ selectedCategory === 'all' ? 'Todos los Animes' : categories.find(c => c.id === selectedCategory)?.name }}
          </h2>
          <span class="anime-count">{{ animeCount }} {{ animeCount === 1 ? 'anime' : 'animes' }}</span>
        </div>
        
        <div class="filter-right">
          <select v-model="sortBy" class="filter-select">
            <option value="rating">Mejor valorados</option>
            <option value="recent">Más recientes</option>
            <option value="title">Alfabético</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Animes Grid -->
    <section class="animes-section">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando animes...</p>
      </div>
      
      <div v-else-if="filteredAnimes.length === 0" class="empty-state">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3>No se encontraron animes</h3>
        <p>Intenta con otra categoría o filtro</p>
      </div>
      
      <div v-else class="animes-grid">
        <AnimeCard
          v-for="anime in filteredAnimes"
          :key="anime.animeId"
          v-bind="anime"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Dropdown horizontal personalizado */
/* Dropdown alineado a la izquierda */
.dropdown {
  position: relative;
  display: block;
  margin: 2rem 0;
}
.dropdown-toggle {
  background: #18181c;
  color: #fff;
  border: 1px solid #333;
  padding: 0.75rem 2.5rem 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  min-width: 180px;
  justify-content: space-between;
}
/* Dropdown estático que empuja el contenido */
.dropdown-static {
  position: relative;
  display: block;
  margin: 2rem 0;
}
.dropdown-menu-horizontal-static {
  position: static;
  background: #23232b;
  border: 1px solid #333;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  min-width: 300px;
  padding: 1rem 1rem;
  margin-top: 0.5rem;
}
/* Animación para el despliegue */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
.fade-slide-enter-to, .fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

@keyframes desplegar-derecha {
  0% {
    opacity: 0;
    transform: translateX(-30px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Categorías barra horizontal */
.categories-horizontal {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 2rem 0 2rem 0;
  flex-wrap: wrap;
}
.category-horizontal-btn {
  background: #18181c;
  color: #fff;
  border: 1px solid #333;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border 0.2s;
}
.category-horizontal-btn.active,
.category-horizontal-btn:hover {
  background: #33334d;
  color: #fff;
  border-color: #7c3aed;
}
.categories-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #0a0a0a, #1a1a1a);
  color: #fff;
}

/* ===== HEADER ===== */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(10, 10, 10, 0.98);
  backdrop-filter: blur(12px);
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 3rem;
}

.logo {
  height: 45px;
  width: auto;
  object-fit: contain;
  cursor: pointer;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: var(--color-text-primary);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.2s ease;
  position: relative;
}

.nav-link:hover {
  color: var(--color-primary-light);
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
  transform: scaleX(0);
  transition: transform 0.2s ease;
}

.nav-link:hover::after {
  transform: scaleX(1);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-search {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--color-text-primary);
  padding: 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-search:hover {
  background: rgba(147, 51, 234, 0.1);
  border-color: var(--color-primary);
}

.btn-watchlist {
  background: transparent;
  border: 1.5px solid var(--color-primary);
  color: var(--color-primary);
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-watchlist:hover {
  background: var(--color-primary);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
}

.btn-admin {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: #fff;
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.btn-admin:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.user-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-profile {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.btn-profile:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.5);
}

.profile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.btn-logout {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--color-text-primary);
  padding: 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  color: #ef4444;
}

.btn-hamburger {
  display: none;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.btn-hamburger:hover {
  color: var(--color-primary-light);
}

/* Mobile Menu */
.mobile-menu {
  position: fixed;
  top: 0;
  right: -100%;
  width: 300px;
  height: 100vh;
  background: rgba(10, 10, 10, 0.98);
  backdrop-filter: blur(20px);
  z-index: 1001;
  transition: right 0.4s ease;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu.open {
  right: 0;
}

.mobile-menu-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu-header .logo {
  height: 35px;
}

.btn-close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.btn-close:hover {
  color: #ef4444;
}

.mobile-nav-links {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
}

.mobile-nav-link {
  color: var(--color-text-primary);
  text-decoration: none;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  cursor: pointer;
}

.mobile-nav-link:hover {
  background: rgba(255, 255, 255, 0.05);
  border-left-color: var(--color-primary);
  color: var(--color-primary-light);
}

.mobile-menu-footer {
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-logout-mobile {
  width: 100%;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 0.8rem 1.5rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-logout-mobile:hover {
  background: #ef4444;
  color: #fff;
}

.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  cursor: pointer;
}

/* Hero Section */
.hero-section {
  margin-top: 72px; /* Altura del header fijo */
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.1));
  padding: 4rem 2rem 3rem;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 1rem 0;
  background: linear-gradient(135deg, #fff, #e9d5ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

/* Categories Section */
.categories-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 3rem 2rem;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.category-card {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  overflow: hidden;
  min-height: 100px;
}

.category-gradient {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s;
}

.category-card:hover .category-gradient {
  opacity: 0.1;
}

.category-card.active .category-gradient {
  opacity: 0.3;
}

.category-card:hover {
  border-color: rgba(168, 85, 247, 0.5);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.category-card.active {
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.1);
  box-shadow: 0 4px 16px rgba(168, 85, 247, 0.3);
}

.category-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  position: relative;
  z-index: 1;
  text-align: center;
}

/* Filters Section */
.filters-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem 2rem;
}

.filters-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #fff;
}

.anime-count {
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.3);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #e9d5ff;
}

.filter-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  outline: none;
}

.filter-select:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(168, 85, 247, 0.4);
}

.filter-select:focus {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
}

.filter-select option {
  background: #1a1a1a;
  color: #fff;
}

/* Animes Section */
.animes-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem 4rem;
}

.animes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.5);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(168, 85, 247, 0.2);
  border-top-color: #a855f7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state svg {
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
  color: rgba(255, 255, 255, 0.8);
}

.empty-state p {
  font-size: 1rem;
  margin: 0;
}

/* Gradients */
.bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
}

.from-purple-500 { --tw-gradient-from: #a855f7; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-pink-500 { --tw-gradient-to: #ec4899; }
.from-red-500 { --tw-gradient-from: #ef4444; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-orange-500 { --tw-gradient-to: #f97316; }
.from-green-500 { --tw-gradient-from: #22c55e; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-teal-500 { --tw-gradient-to: #14b8a6; }
.from-yellow-500 { --tw-gradient-from: #eab308; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-orange-400 { --tw-gradient-to: #fb923c; }
.from-indigo-500 { --tw-gradient-from: #6366f1; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-purple-500 { --tw-gradient-to: #a855f7; }
.from-purple-600 { --tw-gradient-from: #9333ea; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-blue-500 { --tw-gradient-to: #3b82f6; }
.from-pink-500 { --tw-gradient-from: #ec4899; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-rose-500 { --tw-gradient-to: #f43f5e; }
.from-cyan-500 { --tw-gradient-from: #06b6d4; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-blue-600 { --tw-gradient-to: #2563eb; }
.from-gray-700 { --tw-gradient-from: #374151; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-gray-900 { --tw-gradient-to: #111827; }
.from-red-900 { --tw-gradient-from: #7f1d1d; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-black { --tw-gradient-to: #000; }
.from-purple-900 { --tw-gradient-from: #581c87; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-indigo-900 { --tw-gradient-to: #312e81; }
.from-green-600 { --tw-gradient-from: #16a34a; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-emerald-500 { --tw-gradient-to: #10b981; }
.from-lime-500 { --tw-gradient-from: #84cc16; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-green-400 { --tw-gradient-to: #4ade80; }
.from-violet-600 { --tw-gradient-from: #7c3aed; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
.to-purple-700 { --tw-gradient-to: #7e22ce; }

/* Responsive */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .btn-hamburger {
    display: block;
  }

  .btn-watchlist,
  .btn-admin {
    display: none;
  }

  .header-content {
    padding: 1rem 1.5rem;
  }

  .header-left {
    gap: 1rem;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .categories-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }

  .category-card {
    padding: 1.5rem 1rem;
    min-height: 100px;
  }

  .category-name {
    font-size: 0.95rem;
  }

  .filters-content {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .filter-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .animes-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>