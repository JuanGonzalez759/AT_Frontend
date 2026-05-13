<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProfile } from '../composables/useProfile'
import AnimeCard from '../components/AnimeCard.vue'
import ContinueWatchingCard from '../components/ContinueWatchingCard.vue'
import AnimeInfoModal from '../components/AnimeInfoModal.vue'

const router = useRouter()
const { currentUser, logout, loadCurrentUser, authenticatedFetch, API_BASE_URL } = useAuth()
const { currentProfile, loadProfile } = useProfile()

// Mobile menu
const mobileMenuOpen = ref(false)

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

// Search functionality
const searchOpen = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)

function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    // Focus input after animation
    setTimeout(() => {
      document.querySelector('.search-input')?.focus()
    }, 300)
  } else {
    searchQuery.value = ''
    searchResults.value = []
  }
}

async function performSearch() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  
  isSearching.value = true
  try {
    const response = await authenticatedFetch(`/api/backoffice/public/animes/?search=${encodeURIComponent(searchQuery.value)}`)
    if (response.ok) {
      const data = await response.json()
      searchResults.value = data.results?.slice(0, 10) || [] // Máximo 10 resultados
    }
  } catch (error) {
    console.error('Error searching:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function goToAnime(animeId) {
  router.push(`/anime/${animeId}`)
  searchOpen.value = false
  searchQuery.value = ''
  searchResults.value = []
}

// Hero carousel data
const featuredAnimes = ref([])
const currentSlide = ref(0)
let autoplayInterval = null

// Categorías de contenido
const continueWatching = ref([])
const newThisSeason = ref([])
const popularNow = ref([])
const simulcasts = ref([])
const actionAnimes = ref([])
const romanceAnimes = ref([])
const comedyAnimes = ref([])

// Progreso del usuario
const userProgress = ref([])

function nextSlide() {
  currentSlide.value = (currentSlide.value + 1) % featuredAnimes.value.length
}

function prevSlide() {
  currentSlide.value = (currentSlide.value - 1 + featuredAnimes.value.length) % featuredAnimes.value.length
}

function goToSlide(index) {
  currentSlide.value = index
}

function startAutoplay() {
  autoplayInterval = setInterval(nextSlide, 5000)
}

function stopAutoplay() {
  if (autoplayInterval) {
    clearInterval(autoplayInterval)
    autoplayInterval = null
  }
}

// Determinar el texto del botón según el progreso
function getWatchButtonText(anime) {
  if (anime.watched) {
    return 'VER DE NUEVO'
  }
  if (anime.currentEpisode > 0) {
    return `CONTINUAR EP. ${anime.currentEpisode + 1}`
  }
  return 'COMENZAR A VER'
}

// Scroll horizontal para carruseles
function scrollCarousel(containerClass, direction) {
  const container = document.querySelector(containerClass)
  if (container) {
    const scrollAmount = 300
    container.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    })
  }
}

// Cargar progreso del usuario desde el backend
async function loadUserProgress() {
  try {
    const response = await authenticatedFetch('/api/backoffice/progress/')
    if (response.ok) {
      const data = await response.json()
      userProgress.value = data.progress || []
    } else {
      // Si falla, simplemente no cargar progreso
      console.debug('Could not load user progress')
      userProgress.value = []
    }
  } catch (error) {
    console.debug('Could not load user progress:', error)
    userProgress.value = []
  }
}

// Obtener el progreso de un anime específico
function getAnimeProgress(animeId) {
  const progress = userProgress.value.find(p => p.anime_id === animeId)
  return progress || {
    current_episode: 0,
    total_episodes: 0,
    watched: false
  }
}

async function loadAnimes() {
  try {
    const response = await authenticatedFetch(`/api/backoffice/public/animes/?page_size=100`)
    if (response.ok) {
      const data = await response.json()
      const animes = data.results || data
      
      // Hero carousel - Top 5 animes mejor puntuados con estado de visualización REAL
      featuredAnimes.value = [...animes]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5)
        .map((anime) => {
          const progress = getAnimeProgress(anime.id)
          
          return {
            id: anime.id,
            title: anime.title,
            year: anime.year,
            genre: anime.genre,
            description: anime.description,
            background: anime.background_image || anime.cover_image,
            image: anime.cover_image,
            cover_image: anime.cover_image,
            background_image: anime.background_image,
            rating: anime.rating,
            audio_type: anime.audio_type,
            watched: progress.watched,
            currentEpisode: progress.current_episode,
            totalEpisodes: anime.episode_count || progress.total_episodes || 24
          }
        })
      
      // Transformar datos para cada sección
      const transformAnime = (anime) => ({
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
        progress: 0, // Esto vendría del backend cuando implementes el tracking
        isDemoContent: anime.id !== 6, // One Piece (ID 6) es el único licenciado
        contentType: anime.content_type || 'SERIE'
      })
      
      // Popular Now - animes con mejor puntuación
      popularNow.value = [...animes]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 15)
        .map(transformAnime)
      
      // New This Season - animes recientes (por fecha)
      newThisSeason.value = [...animes]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(transformAnime)
      
      // Simulcasts - solo animes con is_simulcast=true (ordenados por rating)
      simulcasts.value = animes
        .filter(anime => anime.is_simulcast)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .map(transformAnime)
      
      // Por género (ordenados por rating)
      actionAnimes.value = animes
        .filter(anime => anime.genre?.toLowerCase().includes('action') || 
                         anime.genre?.toLowerCase().includes('acción'))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .map(transformAnime)
      
      romanceAnimes.value = animes
        .filter(anime => anime.genre?.toLowerCase().includes('romance'))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .map(transformAnime)
      
      comedyAnimes.value = animes
        .filter(anime => anime.genre?.toLowerCase().includes('comedy') || 
                         anime.genre?.toLowerCase().includes('comedia'))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .map(transformAnime)
      
      // Continue Watching - REAL data from user progress (episodios en progreso)
      continueWatching.value = userProgress.value
        .filter(p => p.current_episode > 0 && !p.watched) // Solo en progreso
        .slice(0, 6) // Máximo 6
        .map(progress => {
          // Buscar el anime correspondiente
          const anime = animes.find(a => a.id === progress.anime_id)
          if (!anime) return null
          
          return {
            animeId: anime.id,
            title: anime.title,
            episodeNumber: progress.current_episode + 1, // Próximo episodio
            episodeTitle: null,
            thumbnail: anime.background_image || anime.cover_image,
            progress: Math.round((progress.current_episode / progress.total_episodes) * 100),
            duration: '24m',
            audioType: anime.audio_type || 'SUB'
          }
        })
        .filter(item => item !== null) // Remover nulls
    }
  } catch (error) {
    console.error('Error loading animes:', error)
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

function goToTestWatch() {
  // Usar el primer anime disponible o uno específico para pruebas
  const testAnimeId = featuredAnimes.value[0]?.id || popularNow.value[0]?.id || 1
  const testEpisodeId = 1 // Episodio de prueba
  
  router.push({
    path: '/watch',
    query: {
      anime: testAnimeId,
      episode: testEpisodeId
    }
  })
}

// Modal de información
const modalVisible = ref(false)
const modalAnime = ref({})

function openModal(anime) {
  modalAnime.value = anime || {}
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
  modalAnime.value = {}
}

function onWatchFromModal(anime) {
  const id = anime.id || anime.animeId || anime.anime_id
  if (id) router.push(`/anime/${id}`)
  closeModal()
}

// Recargar datos cuando cambia el perfil
watch(() => currentProfile.value?.id, async (newProfileId, oldProfileId) => {
  if (newProfileId && oldProfileId && newProfileId !== oldProfileId) {
    // El perfil cambió, recargar progreso y animes
    await loadUserProgress()
    await loadAnimes()
  }
})

onMounted(async () => {
  const user = await loadCurrentUser()
  if (!user) {
    router.push('/login')
    return
  }
  
  // Cargar perfil del usuario
  await loadProfile()
  
  // Cargar progreso PRIMERO, luego animes
  await loadUserProgress()
  await loadAnimes()
  
  if (featuredAnimes.value.length > 0) {
    startAutoplay()
  }
})
</script>

<template>
  <div class="home-container">
    <!-- Header estilo Crunchyroll -->
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo" />
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
          <button class="btn-search" @click="toggleSearch">
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

          <!-- ...existing code... -->
          
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
          <a @click="goToTestWatch(); toggleMobileMenu()" class="mobile-nav-link">Reproductor</a>
        </nav>
        <div class="mobile-menu-footer">
          <button v-if="currentUser" @click="handleLogout; toggleMobileMenu()" class="btn-logout-mobile">
            Cerrar Sesión
          </button>
        </div>
      </div>
      <div v-if="mobileMenuOpen" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
    </header>

    <!-- Search Overlay -->
    <div class="search-container" :class="{ 'search-open': searchOpen }">
      <div class="search-bar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input 
          type="text" 
          v-model="searchQuery"
          @input="performSearch"
          class="search-input" 
          placeholder="Buscar animes..."
        />
        <button class="search-close" @click="toggleSearch">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <!-- Search Results Dropdown -->
      <div class="search-results" v-if="searchQuery.trim()">
        <div v-if="isSearching" class="search-loading">
          <div class="spinner"></div>
          Buscando...
        </div>
        
        <div v-else-if="searchResults.length === 0" class="search-empty">
          No se encontraron resultados para "{{ searchQuery }}"
        </div>
        
        <div v-else class="search-list">
          <div 
            v-for="anime in searchResults" 
            :key="anime.id"
            class="search-item"
            @click="goToAnime(anime.id)"
          >
            <img :src="anime.cover_image" :alt="anime.title" class="search-item-image" />
            <div class="search-item-info">
              <h4 class="search-item-title">{{ anime.title }}</h4>
              <div class="search-item-meta">
                <span>{{ anime.year }}</span>
                <span>⭐ {{ anime.rating }}/10</span>
                <span>{{ anime.episode_count }} eps</span>
              </div>
              <p class="search-item-genre">{{ anime.genre }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="searchOpen" class="search-backdrop" @click="toggleSearch"></div>

    <!-- Hero Banner Carousel -->
    <section 
      class="hero-banner" 
      @mouseenter="stopAutoplay" 
      @mouseleave="startAutoplay"
      v-if="featuredAnimes.length > 0"
    >
      <div class="hero-carousel">
        <div 
          v-for="(anime, index) in featuredAnimes" 
          :key="anime.id"
          class="hero-slide"
          :class="{ active: index === currentSlide }"
        >
          <div 
            class="hero-background"
            :style="{ 
              backgroundImage: `url('${anime.background}')` 
            }"
          ></div>
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <h1 class="hero-title">{{ anime.title }}</h1>
            <div class="hero-meta">
              <span class="hero-year">{{ anime.year }}</span>
              <span class="hero-divider">•</span>
              <span class="hero-genre">{{ anime.genre }}</span>
              <span class="hero-divider">•</span>
              <span class="hero-rating">⭐ {{ anime.rating }}/10</span>
              <template v-if="anime.currentEpisode > 0 && !anime.watched">
                <span class="hero-divider">•</span>
                <span class="hero-progress">{{ anime.currentEpisode }}/{{ anime.totalEpisodes }} episodios</span>
              </template>
            </div>
            <p class="hero-description">{{ anime.description }}</p>
            <div class="hero-actions">
              <button class="btn-hero-play" @click="router.push(`/anime/${anime.id}`)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                {{ getWatchButtonText(anime) }}
              </button>
              <button class="btn-hero-info" @click="openModal(anime)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
                MÁS INFO
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Controles del carrusel -->
      <button class="carousel-nav prev" @click="prevSlide" aria-label="Anterior">‹</button>
      <button class="carousel-nav next" @click="nextSlide" aria-label="Siguiente">›</button>

      <!-- Indicadores -->
      <div class="carousel-indicators">
        <button
          v-for="(anime, index) in featuredAnimes"
          :key="anime.id"
          class="indicator"
          :class="{ active: index === currentSlide }"
          @click="goToSlide(index)"
          :aria-label="`Slide ${index + 1}`"
        ></button>
      </div>
    </section>

    <!-- Contenido principal -->
    <main class="main-content">
      
      <!-- Continue Watching -->
      <section v-if="continueWatching.length > 0" class="content-section">
        <div class="section-header">
          <h2 class="section-title">Continuar Viendo</h2>
          <p class="section-subtitle">Retoma donde lo dejaste</p>
        </div>
        <div class="carousel-container">
          <button 
            class="carousel-arrow prev" 
            @click="scrollCarousel('.carousel-continue', 'prev')"
          >‹</button>
          <div class="carousel-track carousel-continue carousel-horizontal">
            <ContinueWatchingCard
              v-for="item in continueWatching"
              :key="item.animeId"
              v-bind="item"
              @show-info="openModal"
            />
          </div>
          <button 
            class="carousel-arrow next" 
            @click="scrollCarousel('.carousel-continue', 'next')"
          >›</button>
        </div>
      </section>

      <!-- New This Season -->
      <section v-if="newThisSeason.length > 0" class="content-section">
        <div class="section-header">
          <h2 class="section-title">Nuevos Esta Temporada</h2>
          <p class="section-subtitle">Los estrenos más recientes</p>
        </div>
        <div class="carousel-container">
          <button 
            class="carousel-arrow prev" 
            @click="scrollCarousel('.carousel-new', 'prev')"
          >‹</button>
          <div class="carousel-track carousel-new">
            <AnimeCard
              v-for="item in newThisSeason"
              :key="item.animeId"
              v-bind="item"
              @show-info="openModal"
            />
          </div>
          <button 
            class="carousel-arrow next" 
            @click="scrollCarousel('.carousel-new', 'next')"
          >›</button>
        </div>
      </section>

      <!-- Simulcasts -->
      <section v-if="simulcasts.length > 0" class="content-section">
        <div class="section-header">
          <h2 class="section-title">Simulcasts</h2>
          <p class="section-subtitle">Episodios el mismo día que Japón</p>
        </div>
        <div class="carousel-container">
          <button 
            class="carousel-arrow prev" 
            @click="scrollCarousel('.carousel-simulcast', 'prev')"
          >‹</button>
          <div class="carousel-track carousel-simulcast">
            <AnimeCard
              v-for="item in simulcasts"
              :key="item.animeId"
              v-bind="item"
              @show-info="openModal"
            />
          </div>
          <button 
            class="carousel-arrow next" 
            @click="scrollCarousel('.carousel-simulcast', 'next')"
          >›</button>
        </div>
      </section>

      <!-- Popular Now -->
      <section v-if="popularNow.length > 0" class="content-section">
        <div class="section-header">
          <h2 class="section-title">Popular Ahora</h2>
          <p class="section-subtitle">Lo más visto de la comunidad</p>
        </div>
        <div class="carousel-container">
          <button 
            class="carousel-arrow prev" 
            @click="scrollCarousel('.carousel-popular', 'prev')"
          >‹</button>
          <div class="carousel-track carousel-popular">
            <AnimeCard
              v-for="item in popularNow"
              :key="item.animeId"
              v-bind="item"
              @show-info="openModal"
            />
          </div>
          <button 
            class="carousel-arrow next" 
            @click="scrollCarousel('.carousel-popular', 'next')"
          >›</button>
        </div>
      </section>

      <!-- Action -->
      <section v-if="actionAnimes.length > 0" class="content-section">
        <div class="section-header">
          <h2 class="section-title">Acción</h2>
          <p class="section-subtitle">Peleas épicas y aventuras intensas</p>
        </div>
        <div class="carousel-container">
          <button 
            class="carousel-arrow prev" 
            @click="scrollCarousel('.carousel-action', 'prev')"
          >‹</button>
          <div class="carousel-track carousel-action">
            <AnimeCard
              v-for="item in actionAnimes"
              :key="item.animeId"
              v-bind="item"
              @show-info="openModal"
            />
          </div>
          <button 
            class="carousel-arrow next" 
            @click="scrollCarousel('.carousel-action', 'next')"
          >›</button>
        </div>
      </section>

      <!-- Romance -->
      <section v-if="romanceAnimes.length > 0" class="content-section">
        <div class="section-header">
          <h2 class="section-title">Romance</h2>
          <p class="section-subtitle">Historias de amor que te emocionarán</p>
        </div>
        <div class="carousel-container">
          <button 
            class="carousel-arrow prev" 
            @click="scrollCarousel('.carousel-romance', 'prev')"
          >‹</button>
          <div class="carousel-track carousel-romance">
            <AnimeCard
              v-for="item in romanceAnimes"
              :key="item.animeId"
              v-bind="item"
              @show-info="openModal"
            />
          </div>
          <button 
            class="carousel-arrow next" 
            @click="scrollCarousel('.carousel-romance', 'next')"
          >›</button>
        </div>
      </section>

      <!-- Comedy -->
      <section v-if="comedyAnimes.length > 0" class="content-section">
        <div class="section-header">
          <h2 class="section-title">Comedia</h2>
          <p class="section-subtitle">Risas garantizadas</p>
        </div>
        <div class="carousel-container">
          <button 
            class="carousel-arrow prev" 
            @click="scrollCarousel('.carousel-comedy', 'prev')"
          >‹</button>
          <div class="carousel-track carousel-comedy">
            <AnimeCard
              v-for="item in comedyAnimes"
              :key="item.animeId"
              v-bind="item"
              @show-info="openModal"
            />
          </div>
          <button 
            class="carousel-arrow next" 
            @click="scrollCarousel('.carousel-comedy', 'next')"
          >›</button>
        </div>
      </section>

    </main>

    <AnimeInfoModal
      :show="modalVisible"
      :anime="modalAnime"
      @close="closeModal"
      @watch="onWatchFromModal"
    />

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <p>&copy; 2026 AniToki. Todos los derechos reservados.</p>
        <div class="footer-links">
          <a href="#">Términos</a>
          <a href="#">Privacidad</a>
          <a href="#">Contacto</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Variables de color - Tema morado estilo Crunchyroll */
:root {
  --color-primary: #9333ea;
  --color-primary-light: #a855f7;
  --color-primary-dark: #7e22ce;
  --color-bg-main: #000000;
  --color-bg-secondary: #0a0a0a;
  --color-bg-tertiary: #141414;
  --color-text-primary: #ffffff;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #707070;
}

.home-container {
  min-height: 100vh;
  background: var(--color-bg-main);
  color: var(--color-text-primary);
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

.btn-test-watch {
  background: linear-gradient(135deg, #f59e0b, #d97706);
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
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.btn-test-watch:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.5);
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

/* ===== HERO BANNER ===== */
.hero-banner {
  position: relative;
  margin-top: 72px; /* Altura del header */
  height: 600px;
  overflow: hidden;
  margin-bottom: 2rem; /* Separación con el contenido */
}

.hero-carousel {
  width: 100%;
  height: 100%;
  position: relative;
}

.hero-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.hero-slide.active {
  opacity: 1;
  pointer-events: auto;
}

.hero-background {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(3px);
  transform: scale(1.1);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: 
  linear-gradient(
    to right,
    rgba(0, 0, 0, 0.95) 0%,
    rgba(0, 0, 0, 0.85) 30%,
    rgba(0, 0, 0, 0.5) 50%,
    rgba(0, 0, 0, 0.2) 70%,
    transparent 100%
  ),
  linear-gradient(
    to top,
    #000000 0%,
    rgba(0, 0, 0, 0.95) 15%,
    rgba(0, 0, 0, 0.7) 30%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0.15) 70%,
    transparent 100%
  );
}

.hero-content {
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 4rem;
  z-index: 1;
}

.hero-content > * {
  max-width: 650px;
}

.hero-title {
  font-size: 3rem;
  font-weight: 900;
  color: #fff;
  margin: 0 0 0.75rem 0;
  line-height: 1.1;
  text-shadow: 2px 4px 16px rgba(0, 0, 0, 0.9);
  letter-spacing: -0.5px;
  text-transform: uppercase;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 1px 2px 8px rgba(0, 0, 0, 0.8);
}

.hero-divider {
  color: rgba(255, 255, 255, 0.5);
}

.hero-rating {
  color: #fbbf24;
  font-weight: 700;
}

.hero-progress {
  color: var(--color-primary-light);
  font-weight: 600;
}

.hero-description {
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1.75rem;
  max-width: 600px;
  text-shadow: 1px 2px 10px rgba(0, 0, 0, 0.9);
  
  /* Limitar a 3 líneas con puntos suspensivos */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-actions {
  display: flex;
  gap: 1rem;
}

.btn-hero-play {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(147, 51, 234, 0.3);
  letter-spacing: 0.5px;
}

.btn-hero-play:hover {
  background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(147, 51, 234, 0.5);
}

.btn-hero-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  color: #fff;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
}

.btn-hero-info:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

/* Controles del carrusel */
.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  width: 50px;
  height: 50px;
  font-size: 2rem;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-nav:hover {
  background: rgba(147, 51, 234, 0.7);
  border-color: var(--color-primary);
}

.carousel-nav.prev {
  left: 2rem;
}

.carousel-nav.next {
  right: 2rem;
}

.carousel-indicators {
  position: absolute;
  bottom: 2.5rem;
  left: 2.5rem;
  display: flex;
  gap: 0.6rem;
  z-index: 10;
}

.indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;
}

.indicator.active {
  background: var(--color-primary);
  width: 36px;
  border-radius: 7px;
}

.indicator:hover {
  background: rgba(255, 255, 255, 0.7);
}

/* ===== MAIN CONTENT ===== */
.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 4rem 2.5rem 3rem;
  position: relative;
  z-index: 10;
}

.content-section {
  margin-bottom: 3.5rem;
}

.content-section:first-child {
  margin-top: 1rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.5px;
}

.section-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin: 0;
}

/* Carrusel horizontal */
.carousel-container {
  position: relative;
}

.carousel-track {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  padding: 0.5rem 0;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.carousel-track::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.carousel-track > * {
  flex: 0 0 180px; /* Ancho fijo para cards verticales */
  width: 180px;
  min-width: 180px;
  max-width: 180px;
}

/* Cards horizontales para Continue Watching */
.carousel-track.carousel-horizontal > * {
  flex: 0 0 320px; /* Ancho para formato 16:9 */
}

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  width: 45px;
  height: 45px;
  font-size: 1.8rem;
  cursor: pointer;
  z-index: 50;
  transition: all 0.3s ease;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
}

.carousel-container:hover .carousel-arrow {
  opacity: 1;
  pointer-events: auto;
}

.carousel-arrow:hover {
  background: rgba(147, 51, 234, 0.9);
  border-color: var(--color-primary);
  transform: translateY(-50%) scale(1.1);
}

.carousel-arrow.prev {
  left: -22px;
}

.carousel-arrow.next {
  right: -22px;
}

/* ===== FOOTER ===== */
.footer {
  background: var(--color-bg-secondary);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 2rem 0;
  margin-top: 4rem;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-content p {
  color: var(--color-text-tertiary);
  margin: 0;
  font-size: 0.9rem;
}

.footer-links {
  display: flex;
  gap: 2rem;
}

.footer-links a {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.footer-links a:hover {
  color: var(--color-primary-light);
}

/* Mobile Navigation Menu */
.btn-hamburger {
  display: none;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  margin-right: 0.5rem;
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: -300px;
  width: 280px;
  height: 100vh;
  background: rgba(10, 10, 10, 0.98);
  backdrop-filter: blur(10px);
  z-index: 1000;
  transition: right 0.3s ease;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu.open {
  right: 0;
}

.mobile-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu-header .logo {
  height: 32px;
}

.btn-close {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
}

.mobile-nav-links {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
}

.mobile-nav-link {
  padding: 1rem 1.5rem;
  color: white;
  text-decoration: none;
  font-size: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.2s;
}

.mobile-nav-link:hover {
  background: rgba(147, 51, 234, 0.1);
}

.mobile-menu-footer {
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-logout-mobile {
  width: 100%;
  padding: 0.75rem;
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.3);
  color: #fca5a5;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-logout-mobile:hover {
  background: rgba(220, 38, 38, 0.2);
}

.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

/* Search Container */
.search-container {
  position: fixed;
  top: 0;
  right: -600px;
  width: 550px;
  max-width: 90vw;
  height: 100vh;
  background: linear-gradient(180deg, #1a1a1a 0%, #141414 100%);
  z-index: 1001;
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(147, 51, 234, 0.2);
}

.search-container.search-open {
  right: 0;
}

.search-bar {
  padding: 1.5rem;
  background: rgba(20, 20, 20, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(10px);
}

.search-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-primary);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.search-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-primary);
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.search-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: rgba(255, 255, 255, 0.6);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(147, 51, 234, 0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.search-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.95rem;
}

.search-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.search-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-item:hover {
  background: rgba(147, 51, 234, 0.1);
  border-color: var(--color-primary);
  transform: translateX(-4px);
}

.search-item-image {
  width: 80px;
  height: 110px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.search-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-item-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.3;
}

.search-item-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.search-item-genre {
  font-size: 0.85rem;
  color: var(--color-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  backdrop-filter: blur(4px);
}

/* Responsive */
@media (max-width: 1024px) {
  .btn-test-watch,
  .btn-admin {
    display: none;
  }
}

@media (max-width: 768px) {
  .btn-hamburger {
    display: block;
  }

  .header-content {
    padding: 1rem 1rem;
  }
  
  .nav-links {
    display: none;
  }

  .header-right .btn-watchlist,
  .header-right .user-controls {
    display: none;
  }

  .header-right .btn-search {
    display: flex;
  }

  .search-container {
    width: 100vw;
  }

  .search-item-image {
    width: 60px;
    height: 85px;
  }

  .search-item-title {
    font-size: 0.9rem;
  }

  .search-item-meta {
    font-size: 0.75rem;
    flex-wrap: wrap;
  }
  
  .hero-title {
    font-size: 1.75rem;
  }

  .hero-description {
    font-size: 0.875rem;
    max-height: 3.5rem;
    overflow: hidden;
  }

  .hero-actions {
    flex-direction: column;
    gap: 0.75rem;
  }

  .btn-hero-play,
  .btn-hero-info {
    width: 100%;
    justify-content: center;
  }
  
  .main-content {
    padding: 1.5rem 1rem;
  }

  .section-header {
    font-size: 1.25rem;
  }
  
  .carousel-track > * {
    flex: 0 0 140px;
    min-width: 140px;
    max-width: 140px;
  }

  .carousel-controls {
    display: none;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 1.5rem;
  }

  .hero-meta {
    font-size: 0.75rem;
  }

  .carousel-track > * {
    flex: 0 0 120px;
    min-width: 120px;
    max-width: 120px;
  }

  .main-content {
    padding: 1rem 0.75rem;
  }
}
</style>
