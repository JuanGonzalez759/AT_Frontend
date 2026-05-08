<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProfile } from '../composables/useProfile'
import AnimeCard from '../components/AnimeCard.vue'

const router = useRouter()
const { currentUser, logout, loadCurrentUser, authenticatedFetch } = useAuth()
const { currentProfile, loadProfile } = useProfile()

const watchlistAnimes = ref([])
const isLoading = ref(true)

async function loadWatchlist() {
  isLoading.value = true
  try {
    const response = await authenticatedFetch('/api/manager/watchlist/')
    
    if (response.ok) {
      const data = await response.json()
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
    }
  } catch (error) {
    console.error('Error loading watchlist:', error)
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
            <a href="#noticias" class="nav-link">Noticias</a>
          </nav>
        </div>
        <div class="header-right">
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
          
          <button @click="router.push('/my-list')" class="btn-watchlist active">Mi Lista</button>
          
          <div v-if="currentUser" class="user-controls">
            <button @click="router.push('/manager/profiles')" class="btn-profile">
              <img v-if="currentProfile" :src="currentProfile.avatar" alt="Profile" class="profile-avatar" />
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
    </header>

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
            @watchlist-updated="loadWatchlist"
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
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .header-left {
    flex-direction: column;
    gap: 1rem;
  }

  .nav-links {
    gap: 1rem;
  }

  .hero-title {
    font-size: 2rem;
  }

  .animes-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
}
</style>
