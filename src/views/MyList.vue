<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProfile } from '../composables/useProfile'
import { useWatchlist } from '../composables/useWatchlist'
import AnimeCard from '../components/AnimeCard.vue'

const router = useRouter()
const { currentUser, logout, loadCurrentUser, authenticatedFetch } = useAuth()
const { currentProfile, loadProfile } = useProfile()
const { loadWatchlist: loadWatchlistData, clearCache } = useWatchlist()

const watchlistAnimes = ref([])
const isLoading = ref(true)

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
      searchResults.value = data.results?.slice(0, 10) || []
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

async function loadWatchlist() {
  isLoading.value = true
  try {
    if (!currentProfile.value) {
      router.push('/manager/profiles')
      return
    }
    
    const data = await loadWatchlistData()
    watchlistAnimes.value = data.map(item => ({
      animeId: item.anime.id,
      title: item.anime.title,
      subtitle: `${item.anime.year} • ${item.anime.audio_type || 'SUB'}`,
      image: item.anime.cover_image,
      episodeCount: 0,
      audioType: item.anime.audio_type || 'SUB',
      rating: 0,
      contentType: item.anime.content_type || 'SERIE',
      addedAt: item.added_at,
      isDemoContent: item.anime.id !== 6
    }))
  } catch (error) {
    console.error('Error loading watchlist:', error)
  } finally {
    isLoading.value = false
  }
}

async function handleWatchlistUpdate() {
  clearCache()
  await loadWatchlist()
}

async function handleLogout() {
  try {
    await logout()
    router.push('/login')
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  }
}

watch(() => currentProfile.value?.id, async (newProfileId, oldProfileId) => {
  if (newProfileId && oldProfileId && newProfileId !== oldProfileId) {
    clearCache()
    await loadWatchlist()
  }
})

onMounted(async () => {
  const user = await loadCurrentUser()
  if (!user) {
    router.push('/login')
    return
  }
  
  const profile = await loadProfile()
  if (!profile) {
    router.push('/manager/profiles')
    return
  }
  
  await loadWatchlist()
})
</script>

<template>
  <div class="mylist-container">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo" @click="router.push('/home')" style="cursor: pointer;" />
          <nav class="nav-links">
            <a @click="router.push('/home')" class="nav-link">Inicio</a>
            <a @click="router.push('/categories')" class="nav-link">Explorar</a>
            <a @click="router.push('/analytics')" class="nav-link">Analytics</a>
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
          
          <button @click="router.push('/my-list')" class="btn-watchlist active">Mi Lista</button>
          
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
          <a @click="router.push('/home'); toggleMobileMenu()" class="mobile-nav-link">Inicio</a>
          <a @click="router.push('/categories'); toggleMobileMenu()" class="mobile-nav-link">Explorar</a>
          <a @click="router.push('/analytics'); toggleMobileMenu()" class="mobile-nav-link">Analytics</a>
          <a @click="router.push('/my-list'); toggleMobileMenu()" class="mobile-nav-link active">Mi Lista</a>
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

      <div class="search-results" v-if="searchQuery">
        <div v-if="isSearching" class="search-loading">
          <div class="spinner"></div>
          <p>Buscando...</p>
        </div>
        <div v-else-if="searchResults.length > 0" class="search-results-list">
          <div 
            v-for="anime in searchResults" 
            :key="anime.id"
            class="search-result-item"
            @click="goToAnime(anime.id)"
          >
            <img :src="anime.cover_image" :alt="anime.title" class="result-image" />
            <div class="result-info">
              <h4 class="result-title">{{ anime.title }}</h4>
              <p class="result-meta">{{ anime.year }} • {{ anime.genre }}</p>
            </div>
          </div>
        </div>
        <div v-else class="search-no-results">
          <p>No se encontraron resultados para "{{ searchQuery }}"</p>
        </div>
      </div>
    </div>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">Mi Lista</h1>
        <p class="hero-subtitle">Tus animes favoritos guardados</p>
      </div>
    </section>

    <!-- Watchlist Content -->
    <section class="watchlist-section">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando tu lista...</p>
      </div>
      
      <div v-else-if="watchlistAnimes.length === 0" class="empty-state">
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <h3>Tu lista está vacía</h3>
        <p>Explora animes y agrégalos a tu lista para verlos más tarde</p>
        <button class="btn-explore" @click="router.push('/categories')">
          Explorar Animes
        </button>
      </div>
      
      <div v-else class="watchlist-content">
        <div class="watchlist-header">
          <h2 class="section-title">{{ watchlistAnimes.length }} {{ watchlistAnimes.length === 1 ? 'anime guardado' : 'animes guardados' }}</h2>
        </div>
        
        <div class="animes-grid">
          <AnimeCard
            v-for="anime in watchlistAnimes"
            :key="anime.animeId"
            v-bind="anime"
            @watchlist-updated="handleWatchlistUpdate"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.mylist-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #0a0a0a 0%, #1a1a1f 100%);
  color: #fff;
  padding-bottom: 4rem;
}

/* Header Styles */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 3rem;
}

.logo {
  height: 50px;
  transition: transform 0.2s;
}

.logo:hover {
  transform: scale(1.05);
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.2s;
  cursor: pointer;
}

.nav-link:hover,
.nav-link.active {
  color: #fff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-search,
.btn-admin,
.btn-watchlist {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.btn-search {
  padding: 0.6rem;
}

.btn-search:hover,
.btn-admin:hover,
.btn-watchlist:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(168, 85, 247, 0.5);
}

.btn-watchlist.active {
  background: rgba(168, 85, 247, 0.2);
  border-color: #a855f7;
}

.user-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-profile {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a855f7, #9333ea);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0;
}

.btn-profile .profile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.btn-profile:hover {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.4);
}

.btn-logout {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

/* Hero Section */
.hero-section {
  padding: 4rem 2rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.hero-content {
  text-align: center;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  background: linear-gradient(to right, #fff, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.6);
}

/* Watchlist Section */
.watchlist-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(168, 85, 247, 0.1);
  border-top-color: #a855f7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1.5rem;
  text-align: center;
}

.empty-state svg {
  opacity: 0.3;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
  margin: 0;
  max-width: 400px;
}

.btn-explore {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #a855f7, #9333ea);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-explore:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(168, 85, 247, 0.4);
}

.watchlist-content {
  width: 100%;
}

.watchlist-header {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.animes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .btn-admin,
  .btn-watchlist {
    display: none;
  }

  .hero-title {
    font-size: 2rem;
  }

  .animes-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
}

/* Mobile Menu Styles */
.btn-hamburger {
  display: none;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0.5rem;
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: -100%;
  width: 80%;
  max-width: 350px;
  height: 100vh;
  background: linear-gradient(to bottom, #1a1a1f, #0a0a0a);
  z-index: 200;
  transition: right 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: -5px 0 20px rgba(0, 0, 0, 0.5);
}

.mobile-menu.open {
  right: 0;
}

.mobile-menu-header {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-close {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0.5rem;
  transition: transform 0.2s;
}

.btn-close:hover {
  transform: rotate(90deg);
}

.mobile-nav-links {
  flex: 1;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-nav-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 1.1rem;
  padding: 1rem;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.mobile-nav-link:hover,
.mobile-nav-link.active {
  background: rgba(168, 85, 247, 0.1);
  color: #fff;
}

.mobile-menu-footer {
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-logout-mobile {
  width: 100%;
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout-mobile:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 150;
  backdrop-filter: blur(4px);
}

/* Search Overlay */
.search-container {
  position: fixed;
  top: -100%;
  left: 0;
  right: 0;
  background: rgba(10, 10, 10, 0.98);
  z-index: 110;
  padding: 2rem;
  max-height: 80vh;
  overflow-y: auto;
  transition: top 0.3s ease;
  backdrop-filter: blur(10px);
}

.search-container.search-open {
  top: 0;
}

.search-bar {
  max-width: 800px;
  margin: 0 auto 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem 1.5rem;
}

.search-icon {
  color: rgba(255, 255, 255, 0.5);
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.2rem;
  outline: none;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.search-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;
}

.search-close:hover {
  color: #fff;
}

.search-results {
  max-width: 800px;
  margin: 0 auto;
}

.search-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.search-results-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-result-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.search-result-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(168, 85, 247, 0.5);
  transform: translateX(4px);
}

.result-image {
  width: 60px;
  height: 85px;
  object-fit: cover;
  border-radius: 4px;
}

.result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.result-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: #fff;
}

.result-meta {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.search-no-results {
  text-align: center;
  padding: 3rem 2rem;
  color: rgba(255, 255, 255, 0.5);
}

@media (max-width: 768px) {
  .btn-hamburger {
    display: block;
  }
}
</style>
